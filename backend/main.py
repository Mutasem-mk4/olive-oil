import os
import csv
import sqlite3
import logging
from datetime import datetime
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Zaytoun Vision API v2 — Scientific UV Pipeline", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "zaytoun.db")
EEM_PATH = os.path.join(BASE_DIR, "eem_features.csv")

# ---------------------------------------------------------------------------
# SQLite helpers
# ---------------------------------------------------------------------------
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS predictions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            filename        TEXT,
            verdict         TEXT,
            label           TEXT,
            confidence      REAL,
            purity_index    REAL,
            aging_step      INTEGER,
            grade           TEXT,
            red_670nm       REAL,
            green_530nm     REAL,
            blue_440nm      REAL,
            nonzero_pixels  INTEGER,
            timestamp       TEXT
        )
        """
    )
    conn.commit()
    conn.close()
    logger.info("Database initialised.")


init_db()


def save_prediction(
    filename: str,
    verdict: str,
    label: str,
    confidence: float,
    purity_index: float | None,
    aging_step: int | None,
    grade: str | None,
    red_670nm: float,
    green_530nm: float,
    blue_440nm: float,
    nonzero_pixels: int,
    timestamp: str,
) -> None:
    conn = get_db()
    conn.execute(
        """
        INSERT INTO predictions
            (filename, verdict, label, confidence, purity_index, aging_step,
             grade, red_670nm, green_530nm, blue_440nm, nonzero_pixels, timestamp)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (filename, verdict, label, confidence, purity_index, aging_step,
         grade, red_670nm, green_530nm, blue_440nm, nonzero_pixels, timestamp),
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
# Scientific UV Pipeline
# ---------------------------------------------------------------------------

def detect_fraud(norm_R: float, norm_G: float, norm_B: float) -> dict:
    """
    AI Stage 1: Fraud Detection Logic Matrix.
    Calibrated for smartphone CMOS sensors under 365nm UV inside a darkbox.
    Accounts for blue LED leakage/reflections and camera exposure compression.

    Channel mapping:
      Red   → 670-680 nm  → Chlorophyll indicator
      Green → 525-550 nm  → Antioxidants / Phenols / Vitamin E
      Blue  → 430-450 nm  → Oxidation / Industrial refining marker
    """
    # Authentic EVOO: strong Red (chlorophyll), moderate Green, low-medium Blue (due to reflection)
    if norm_R > 400 and norm_G > 150 and norm_B < 380 and norm_R > norm_B:
        confidence = min(
            100.0,
            round(((norm_R - 400) / 600 * 50) + ((380 - norm_B) / 380 * 50), 1),
        )
        return {
            "passed":     True,
            "verdict":    "authentic_evoo",
            "label":      "Authentic EVOO",
            "message":    "Strong chlorophyll fluorescence detected. Passes fraud check.",
            "confidence": confidence,
        }

    # Industrial seed oil: low Red & Green, dominant Blue (no chlorophyll)
    if norm_R < 120 and norm_G < 120 and norm_B > 450:
        return {
            "passed":     False,
            "verdict":    "industrial_seed_oil",
            "label":      "Industrial Seed Oil — Fraud Detected",
            "message":    (
                "Blue channel dominance detected. No chlorophyll. "
                "Consistent with canola, soy, sunflower, or corn oil."
            ),
            "confidence": min(100.0, round(norm_B / 10, 1)),
        }

    # Adulterated blend: chlorophyll present BUT abnormally high Blue (exceeding EVOO reflection floor)
    if norm_R > 350 and norm_G > 150 and norm_B >= 380:
        return {
            "passed":     False,
            "verdict":    "adulterated_blend",
            "label":      "Adulterated Blend — Fraud Detected",
            "message":    (
                "Abnormally high blue channel alongside chlorophyll signal. "
                "Possible artificial chlorophyll coloring added to seed oil."
            ),
            "confidence": min(100.0, round(norm_B / 10, 1)),
        }

    # Borderline / inconclusive pattern
    return {
        "passed":     False,
        "verdict":    "inconclusive",
        "label":      "Inconclusive — Retest Required",
        "message":    (
            "Signal does not match known patterns. "
            "Retake image under controlled darkbox conditions."
        ),
        "confidence": 0,
    }


def grade_quality(norm_R: float, norm_G: float, norm_B: float) -> dict:
    """
    AI Stage 2: Purity Index and Degradation Grading.
    Formula: Purity_Index = (Red / (Red + Blue)) × 100
    Only called when the oil passes Stage 1 fraud detection.
    """
    purity_index = (norm_R / (norm_R + norm_B + 1e-6)) * 100

    if purity_index >= 95:
        step        = 0
        grade       = "Premium Fresh Extra Virgin"
        description = "Peak freshness. Maximum chlorophyll and antioxidant content."
        color       = "green"
    elif purity_index >= 75:
        step        = 2
        grade       = "Excellent to Medium Quality"
        description = "Normal degradation. Slight oxidation. Still high quality."
        color       = "green"
    elif purity_index >= 45:
        step        = 5
        grade       = "Old / Low Quality Oil"
        description = (
            "Significant loss of phenols and antioxidants. "
            "Not ideal for consumption."
        )
        color       = "yellow"
    else:
        step        = 8
        grade       = "Spoiled / Expired / Heat-Damaged"
        description = (
            "Chlorophyll completely degraded. Massive oxidation. "
            "Unsafe for consumption."
        )
        color       = "red"

    return {
        "purity_index":      round(purity_index, 2),
        "aging_step":        step,
        "grade":             grade,
        "description":       description,
        "color":             color,
        "green_phenols":     round(norm_G, 2),
        "oxidation_marker":  round(norm_B, 2),
    }


def preprocess_and_extract(img_bgr: np.ndarray) -> dict:
    """
    Full scientific UV fluorescence pipeline.
    Returns dict with all channels, normalized counts, fraud result, quality grade.
    """
    h, w = img_bgr.shape[:2]

    # STEP 1: Dynamic ROI — remove reflections and background borders
    roi = img_bgr[
        int(h * 0.15): int(h * 0.90),
        int(w * 0.10): int(w * 0.90),
    ]

    # STEP 2: Grayscale + binary mask at threshold 50
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY)

    # STEP 3: Error check — completely dark or out-of-focus image
    nonzero_pixels = int(np.count_nonzero(mask))
    if nonzero_pixels < 100:
        return {
            "error": (
                "Image too dark or out of focus. "
                "No UV fluorescence detected."
            ),
            "valid": False,
        }

    # STEP 4: Extract masked pixel means per channel
    mask_bool = mask > 0
    raw_R = float(np.mean(roi[:, :, 2][mask_bool]))  # Red   → 670 nm
    raw_G = float(np.mean(roi[:, :, 1][mask_bool]))  # Green → 530 nm
    raw_B = float(np.mean(roi[:, :, 0][mask_bool]))  # Blue  → 440 nm

    # STEP 5: Normalize 0-255 → 0-1000 counts (linear × 3.92157)
    norm_R = (raw_R / 255.0) * 1000   # Chlorophyll @ 670-680 nm
    norm_G = (raw_G / 255.0) * 1000   # Antioxidants @ 525-550 nm
    norm_B = (raw_B / 255.0) * 1000   # Oxidation marker @ 430-450 nm

    # STEP 6: AI Stage 1 — Fraud Detection
    fraud_result = detect_fraud(norm_R, norm_G, norm_B)

    # STEP 7: AI Stage 2 — Quality grading (only if fraud check passed)
    quality_result = grade_quality(norm_R, norm_G, norm_B) if fraud_result["passed"] else None

    return {
        "valid":             True,
        "raw":               {"R": round(raw_R, 2), "G": round(raw_G, 2), "B": round(raw_B, 2)},
        "normalized_counts": {
            "red_670nm":    round(norm_R, 2),
            "green_530nm":  round(norm_G, 2),
            "blue_440nm":   round(norm_B, 2),
        },
        "fraud_detection":   fraud_result,
        "quality_grading":   quality_result,
        "nonzero_pixels":    nonzero_pixels,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/history")
async def history():
    return fetch_history(20)


@app.get("/eem-features")
async def eem_features():
    if not os.path.exists(EEM_PATH):
        raise HTTPException(status_code=404, detail="eem_features.csv not found.")
    data: list[dict] = []
    try:
        with open(EEM_PATH, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                data.append({
                    "eem_mean":          float(row.get("eem_mean", 0) or 0),
                    "eem_max":           float(row.get("eem_max", 0) or 0),
                    "eem_std":           float(row.get("eem_std", 0) or 0),
                    "chlorophyll_mean":  float(row.get("chlorophyll_mean", 0) or 0),
                    "chlorophyll_max":   float(row.get("chlorophyll_max", 0) or 0),
                    "chlorophyll_ratio": float(row.get("chlorophyll_ratio", 0) or 0),
                    "aging_step":        int(row.get("aging_step", 0) or 0),
                    "filename":          row.get("filename", ""),
                })
    except Exception as exc:
        logger.error(f"EEM read error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    return data


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Validate content type
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(status_code=400, detail="Only JPG and PNG images are supported.")

    # Decode image
    raw_bytes = await file.read()
    np_arr = np.frombuffer(raw_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    # Run UV pipeline
    try:
        result = preprocess_and_extract(img)
    except Exception as exc:
        logger.error(f"Pipeline error: {exc}")
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {exc}")

    timestamp = datetime.utcnow().isoformat()

    # Save to database
    try:
        fd = result.get("fraud_detection") or {}
        qg = result.get("quality_grading") or {}
        nc = result.get("normalized_counts") or {}
        save_prediction(
            filename=file.filename or "unknown",
            verdict=fd.get("verdict", "invalid"),
            label=fd.get("label", "N/A"),
            confidence=fd.get("confidence", 0.0),
            purity_index=qg.get("purity_index"),
            aging_step=qg.get("aging_step"),
            grade=qg.get("grade"),
            red_670nm=nc.get("red_670nm", 0.0),
            green_530nm=nc.get("green_530nm", 0.0),
            blue_440nm=nc.get("blue_440nm", 0.0),
            nonzero_pixels=result.get("nonzero_pixels", 0),
            timestamp=timestamp,
        )
    except Exception as exc:
        logger.warning(f"DB save failed: {exc}")

    result["timestamp"] = timestamp
    return JSONResponse(content=result)
