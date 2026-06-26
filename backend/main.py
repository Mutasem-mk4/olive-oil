import os
import io
import sqlite3
import pickle
import logging
import csv
from datetime import datetime
from typing import Any
import cv2
import numpy as np
from scipy.stats import skew
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Zaytoun Vision API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
DB_PATH    = os.path.join(BASE_DIR, "zaytoun.db")
EEM_PATH   = os.path.join(BASE_DIR, "eem_features.csv")

_model = None
def load_model():
    global _model
    if _model is not None:
        return _model
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"model.pkl not found at {MODEL_PATH}")
    with open(MODEL_PATH, "rb") as f:
        _model = pickle.load(f)
    logger.info("Model loaded successfully.")
    return _model

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.cursor().execute(
        """
        CREATE TABLE IF NOT EXISTS predictions (
            id                     INTEGER PRIMARY KEY AUTOINCREMENT,
            filename               TEXT,
            label                  TEXT,
            confidence             REAL,
            purity_score           INTEGER,
            adulteration_pct       INTEGER,
            risk_level             TEXT,
            fluorescence_intensity REAL,
            recommendation         TEXT,
            timestamp              TEXT
        )
        """
    )
    conn.commit()
    conn.close()

init_db()

def save_prediction(filename, label, confidence, purity_score,
                    adulteration_pct, risk_level, fluorescence_intensity,
                    recommendation, timestamp):
    conn = get_db()
    conn.execute(
        """INSERT INTO predictions
           (filename,label,confidence,purity_score,adulteration_pct,
            risk_level,fluorescence_intensity,recommendation,timestamp)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (filename, label, confidence, purity_score, adulteration_pct,
         risk_level, fluorescence_intensity, recommendation, timestamp),
    )
    conn.commit()
    conn.close()

def fetch_history(limit: int = 20) -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM predictions ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]

# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------
def white_balance_gray_world(img):
    f = img.astype(np.float32)
    avg_b, avg_g, avg_r = np.mean(f[:,:,0]), np.mean(f[:,:,1]), np.mean(f[:,:,2])
    avg = (avg_b + avg_g + avg_r) / 3.0
    f[:,:,0] = np.clip(f[:,:,0] * (avg / avg_b), 0, 255)
    f[:,:,1] = np.clip(f[:,:,1] * (avg / avg_g), 0, 255)
    f[:,:,2] = np.clip(f[:,:,2] * (avg / avg_r), 0, 255)
    return f.astype(np.uint8)

def crop_center_roi(img, margin=0.2):
    h, w = img.shape[:2]
    return img[int(h*margin):int(h*(1-margin)), int(w*margin):int(w*(1-margin))]

def apply_clahe(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    lab[:,:,0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(lab[:,:,0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

def preprocess(img):
    img = white_balance_gray_world(img)
    img = crop_center_roi(img, 0.2)
    img = cv2.resize(img, (224, 224))
    img = apply_clahe(img)
    img = cv2.GaussianBlur(img, (3,3), 0)
    return img

# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------
def extract_features(img) -> dict:
    b = img[:,:,0].flatten().astype(np.float64)
    g = img[:,:,1].flatten().astype(np.float64)
    r = img[:,:,2].flatten().astype(np.float64)

    hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lab  = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    hist, _ = np.histogram(gray.flatten(), bins=256, range=(0,256))
    hp = hist / float(hist.sum() + 1e-6)
    hp = hp[hp > 0]

    return {
        "rgb_B_mean": float(np.mean(b)), "rgb_B_std": float(np.std(b)), "rgb_B_skew": float(skew(b)),
        "rgb_G_mean": float(np.mean(g)), "rgb_G_std": float(np.std(g)), "rgb_G_skew": float(skew(g)),
        "rgb_R_mean": float(np.mean(r)), "rgb_R_std": float(np.std(r)), "rgb_R_skew": float(skew(r)),
        "hsv_H_mean": float(np.mean(hsv[:,:,0])), "hsv_H_std": float(np.std(hsv[:,:,0])),
        "hsv_S_mean": float(np.mean(hsv[:,:,1])), "hsv_S_std": float(np.std(hsv[:,:,1])),
        "hsv_V_mean": float(np.mean(hsv[:,:,2])), "hsv_V_std": float(np.std(hsv[:,:,2])),
        "lab_L_mean": float(np.mean(lab[:,:,0])), "lab_L_std": float(np.std(lab[:,:,0])),
        "lab_A_mean": float(np.mean(lab[:,:,1])), "lab_A_std": float(np.std(lab[:,:,1])),
        "lab_B_mean": float(np.mean(lab[:,:,2])), "lab_B_std": float(np.std(lab[:,:,2])),
        "fluorescence_intensity": float((np.mean(b) + np.mean(g)) / 2.0),
        "fluorescence_ratio":     float(np.mean(g) / (np.mean(r) + 1e-6)),
        "texture_entropy":        float(-np.sum(hp * np.log2(hp))),
        "brightness_mean":        float(np.mean(gray.astype(np.float64))),
        "brightness_std":         float(np.std(gray.astype(np.float64))),
    }

# ---------------------------------------------------------------------------
# smart_predict — النسخة المحدّثة المبنية على فيزياء UV الصحيحة
# ---------------------------------------------------------------------------
def smart_predict(features: dict) -> dict:
    """
    زيت زيتون نقي تحت UV:
      - لون أصفر ذهبي  → R عالي، B منخفض  (yellow_signal موجب)
      - وميض أحمر/وردي من الكلوروفيل
      - Saturation عالي (ملوّن مش أبيض/رمادي)
      - LAB B* عالي    → أصفر
      - Fluorescence intensity متوسط-عالي

    زيت مغشوش أو زيت نباتي عادي تحت UV:
      - لون أبيض/رمادي باهت → saturation منخفض
      - لا يوجد وميض كلوروفيل
    """
    g_mean  = features.get('rgb_G_mean', 128)
    r_mean  = features.get('rgb_R_mean', 128)
    b_mean  = features.get('rgb_B_mean', 128)
    s_mean  = features.get('hsv_S_mean', 50)
    fluor   = features.get('fluorescence_intensity', 100)
    entropy = features.get('texture_entropy', 6.0)
    lab_b   = features.get('lab_B_mean', 128)
    fluor_r = features.get('fluorescence_ratio', 1.0)

    score = 50.0

    # 1. Saturation — أهم مؤشر (زيت نقي = ملوّن، مغشوش = باهت)
    score += float(np.clip((s_mean - 60) * 0.40, -20, 25))

    # 2. Yellow signal (R - B) — زيت زيتون نقي أصفر ذهبي
    yellow_signal = r_mean - b_mean
    score += float(np.clip(yellow_signal * 0.15, -15, 20))

    # 3. LAB B* — أصفر = موجب، أزرق = سالب
    score += float(np.clip((lab_b - 128) * 0.30, -10, 10))

    # 4. Fluorescence intensity — وميض UV
    score += float(np.clip((fluor - 80) * 0.15, -10, 10))

    # 5. Texture entropy — زيت نقي فيه texture طبيعي أكثر
    score += float(np.clip((entropy - 5.5) * 4.0, -5, 5))

    # 6. Green/Red ratio — كلوروفيل يزيد الأخضر نسبياً
    score += float(np.clip((fluor_r - 0.9) * 8.0, -5, 5))

    score = float(np.clip(score, 5, 97))

    label      = 'pure' if score >= 55 else 'adulterated'
    confidence = round(score if label == 'pure' else (100 - score), 2)
    adult_pct  = max(0, int(100 - score))

    if label == 'pure' and confidence > 75:
        risk = 'low'
    elif label == 'pure':
        risk = 'medium'
    else:
        risk = 'high'

    recommendation = (
        "Strong UV fluorescence with golden-yellow color detected — "
        "consistent with authentic extra-virgin olive oil."
        if label == 'pure' else
        "Weak or absent chlorophyll fluorescence. "
        "Possible adulteration with refined or seed oil."
    )

    return {
        'label':                  label,
        'confidence':             confidence,
        'purity_score':           int(score),
        'adulteration_pct':       adult_pct,
        'risk_level':             risk,
        'fluorescence_intensity': round(fluor, 2),
        'top_features': {
            'saturation':     round(s_mean, 3),
            'yellow_signal':  round(yellow_signal, 3),
            'lab_B_mean':     round(lab_b, 3),
        },
        'recommendation': recommendation,
    }

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "model": "loaded" if os.path.exists(MODEL_PATH) else "not found"}

@app.get("/history")
async def history():
    return fetch_history(20)

@app.get("/eem-features")
async def eem_features():
    if not os.path.exists(EEM_PATH):
        raise HTTPException(status_code=404, detail="eem_features.csv not found")
    data = []
    try:
        with open(EEM_PATH, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                data.append({
                    "eem_mean":          float(row.get("eem_mean", 0)),
                    "eem_max":           float(row.get("eem_max", 0)),
                    "eem_std":           float(row.get("eem_std", 0)),
                    "chlorophyll_mean":  float(row.get("chlorophyll_mean", 0)),
                    "chlorophyll_max":   float(row.get("chlorophyll_max", 0)),
                    "chlorophyll_ratio": float(row.get("chlorophyll_ratio", 0)),
                    "aging_step":        int(row.get("aging_step", 0)),
                    "filename":          row.get("filename", ""),
                })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return data

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(status_code=400, detail="Only JPG and PNG supported.")

    raw_bytes = await file.read()
    img = cv2.imdecode(np.frombuffer(raw_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    try:
        img = preprocess(img)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Preprocessing failed: {exc}")

    try:
        features = extract_features(img)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Feature extraction failed: {exc}")

    try:
        prediction = smart_predict(features)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

    timestamp = datetime.utcnow().isoformat()

    try:
        save_prediction(
            filename=file.filename or "unknown",
            label=prediction['label'],
            confidence=prediction['confidence'],
            purity_score=prediction['purity_score'],
            adulteration_pct=prediction['adulteration_pct'],
            risk_level=prediction['risk_level'],
            fluorescence_intensity=prediction['fluorescence_intensity'],
            recommendation=prediction['recommendation'],
            timestamp=timestamp,
        )
    except Exception as exc:
        logger.warning(f"DB save failed: {exc}")

    return JSONResponse(content={
        "label":                  prediction['label'],
        "confidence":             prediction['confidence'],
        "purity_score":           prediction['purity_score'],
        "adulteration_pct":       prediction['adulteration_pct'],
        "risk_level":             prediction['risk_level'],
        "fluorescence_intensity": prediction['fluorescence_intensity'],
        "top_features":           prediction['top_features'],
        "recommendation":         prediction['recommendation'],
        "timestamp":              timestamp,
    })
