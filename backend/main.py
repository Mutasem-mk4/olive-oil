import os
import csv
import json
import pickle
import sqlite3
import logging
from urllib import error as urlerror
from urllib import request as urlrequest
from datetime import datetime
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

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
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
METRICS_PATH = os.path.join(BASE_DIR, "model_metrics.json")
EEM_ADULTERATION_MODEL_PATH = os.path.join(BASE_DIR, "eem_adulteration_model.pkl")
EEM_ADULTERATION_METRICS_PATH = os.path.join(BASE_DIR, "eem_adulteration_metrics.json")
FRONTEND_STATIC_DIR = os.path.join(BASE_DIR, "static")
MODEL_UNAVAILABLE_MESSAGE = "No compatible trained model is loaded. Run `py -3.12 backend/train_model.py`."
AZURE_CV_ENDPOINT = os.getenv("AZURE_CUSTOM_VISION_PREDICTION_ENDPOINT", "").rstrip("/")
AZURE_CV_KEY = os.getenv("AZURE_CUSTOM_VISION_PREDICTION_KEY", "")
AZURE_CV_PROJECT_ID = os.getenv("AZURE_CUSTOM_VISION_PROJECT_ID", "")
AZURE_CV_PUBLISHED_NAME = os.getenv("AZURE_CUSTOM_VISION_PUBLISHED_NAME", "")
AZURE_CV_MODEL_NAME = os.getenv("AZURE_CUSTOM_VISION_MODEL_NAME", "Azure Custom Vision")


class EemPredictionRequest(BaseModel):
    eem_mean: float
    eem_max: float
    eem_std: float
    eem_total: float
    chlorophyll_mean: float
    chlorophyll_max: float
    uv_mean: float
    mid_ex_mean: float
    chlorophyll_ratio: float


def load_model_bundle() -> dict[str, Any] | None:
    if not os.path.exists(MODEL_PATH):
        logger.warning("Model file not found at %s", MODEL_PATH)
        return None

    try:
        with open(MODEL_PATH, "rb") as handle:
            bundle = pickle.load(handle)
    except (OSError, EOFError, ImportError, AttributeError, pickle.PickleError) as exc:
        logger.warning("Model load failed: %s", exc)
        return None

    required_keys = {"model", "feature_names", "classes", "target"}
    if not isinstance(bundle, dict) or not required_keys.issubset(bundle):
        logger.warning("Model file has an unsupported format.")
        return None

    logger.info(
        "Loaded %s model with %d features.",
        bundle.get("target", "unknown"),
        len(bundle.get("feature_names", [])),
    )
    return bundle


MODEL_BUNDLE = load_model_bundle()


def read_json_file(path: str) -> dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Could not read JSON file %s: %s", path, exc)
        return {}


def read_model_metrics() -> dict[str, Any]:
    if MODEL_BUNDLE is None:
        return {}

    metrics = MODEL_BUNDLE.get("metrics") or {}
    if not os.path.exists(METRICS_PATH):
        return metrics

    return read_json_file(METRICS_PATH) or metrics


def model_metrics_summary(metrics: dict[str, Any]) -> dict[str, Any]:
    return {
        "row_count": metrics.get("row_count"),
        "holdout_balanced_accuracy": (metrics.get("holdout") or {}).get("balanced_accuracy"),
        "cv_balanced_accuracy_mean": (metrics.get("cross_validation") or {}).get("balanced_accuracy_mean"),
    }


def public_eem_adulteration_summary() -> dict[str, Any]:
    metrics = read_json_file(EEM_ADULTERATION_METRICS_PATH)
    if not metrics:
        return {
            "loaded": False,
            "path": EEM_ADULTERATION_MODEL_PATH,
            "message": "Run `py -3.12 backend/build_zenodo_eem_dataset.py` then `py -3.12 backend/train_zenodo_adulteration_model.py`.",
        }

    return {
        "loaded": os.path.exists(EEM_ADULTERATION_MODEL_PATH),
        "path": EEM_ADULTERATION_MODEL_PATH,
        "target": metrics.get("target"),
        "selected_model": metrics.get("selected_model"),
        "model_type": metrics.get("model_type"),
        "row_count": metrics.get("row_count"),
        "classes": metrics.get("classes", []),
        "metrics": {
            "holdout_balanced_accuracy": (metrics.get("holdout") or {}).get("balanced_accuracy"),
            "group_cv_balanced_accuracy": (metrics.get("group_cross_validation") or {}).get("balanced_accuracy_mean"),
            "random_cv_balanced_accuracy": (metrics.get("random_cross_validation") or {}).get("balanced_accuracy_mean"),
        },
        "limitations": metrics.get("limitations", []),
    }


def model_summary() -> dict[str, Any]:
    if MODEL_BUNDLE is None:
        return {
            "loaded": False,
            "path": MODEL_PATH,
            "message": MODEL_UNAVAILABLE_MESSAGE,
        }

    metrics = read_model_metrics()

    return {
        "loaded": True,
        "path": MODEL_PATH,
        "target": MODEL_BUNDLE.get("target"),
        "selected_model": MODEL_BUNDLE.get("model_name") or metrics.get("selected_model"),
        "model_type": metrics.get("model_type", type(MODEL_BUNDLE["model"]).__name__),
        "primary_camera_model": {
            "name": "Physics-informed UV Fluorescence Index Classifier",
            "type": "ratio/index classifier",
            "inputs": ["red_670nm", "green_530nm", "blue_440nm", "red_blue_ratio", "green_blue_ratio", "chlorophyll_index"],
            "role": "primary live-demo decision model for UV/flash camera images",
        },
        "azure_custom_vision": azure_custom_vision_info(),
        "public_eem_adulteration_model": public_eem_adulteration_summary(),
        "feature_names": MODEL_BUNDLE.get("feature_names", []),
        "classes": MODEL_BUNDLE.get("classes", []),
        "class_labels": MODEL_BUNDLE.get("class_labels", {}),
        "metrics": model_metrics_summary(metrics),
        "limitations": metrics.get("limitations", []),
    }


def eem_feature_vector(features: dict[str, float]) -> np.ndarray:
    feature_names = MODEL_BUNDLE["feature_names"]
    try:
        return np.asarray([[float(features[name]) for name in feature_names]], dtype=np.float32)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=f"Missing EEM feature: {exc.args[0]}") from exc


def class_label(class_value: int) -> str:
    class_labels = MODEL_BUNDLE.get("class_labels", {})
    return class_labels.get(class_value, str(class_value))


def class_probabilities(probabilities: np.ndarray) -> dict[str, dict[str, float | str]]:
    classes = MODEL_BUNDLE["classes"]
    return {
        str(classes[index]): {
            "label": class_label(classes[index]),
            "probability": round(float(probability) * 100, 2),
        }
        for index, probability in enumerate(probabilities)
    }


def target_specific_prediction(predicted_class: int) -> dict[str, int | str]:
    if MODEL_BUNDLE["target"] == "quality_band":
        return {
            "quality_band": predicted_class,
            "quality_label": class_label(predicted_class),
        }
    if MODEL_BUNDLE["target"] == "aging_step":
        return {"aging_step": predicted_class}
    return {}


def predict_eem_aging(features: dict[str, float]) -> dict[str, Any]:
    if MODEL_BUNDLE is None:
        raise HTTPException(status_code=503, detail=MODEL_UNAVAILABLE_MESSAGE)

    model = MODEL_BUNDLE["model"]
    classes = MODEL_BUNDLE["classes"]
    vector = eem_feature_vector(features)
    encoded_prediction = int(model.predict(vector)[0])
    predicted_class = int(classes[encoded_prediction])

    confidence = None
    probabilities = None
    if hasattr(model, "predict_proba"):
        predicted_probabilities = model.predict_proba(vector)[0]
        confidence = round(float(np.max(predicted_probabilities)) * 100, 2)
        probabilities = class_probabilities(predicted_probabilities)

    prediction_payload = {
        "target": MODEL_BUNDLE["target"],
        "prediction": predicted_class,
        "prediction_label": class_label(predicted_class),
        "confidence": confidence,
        "class_probabilities": probabilities,
        "model_type": type(model).__name__,
    }
    prediction_payload.update(target_specific_prediction(predicted_class))
    return prediction_payload


def azure_custom_vision_enabled() -> bool:
    return all([
        AZURE_CV_ENDPOINT,
        AZURE_CV_KEY,
        AZURE_CV_PROJECT_ID,
        AZURE_CV_PUBLISHED_NAME,
    ])


def azure_custom_vision_info() -> dict[str, Any]:
    return {
        "enabled": azure_custom_vision_enabled(),
        "model_name": AZURE_CV_MODEL_NAME,
        "project_id": AZURE_CV_PROJECT_ID if AZURE_CV_PROJECT_ID else None,
        "published_name": AZURE_CV_PUBLISHED_NAME if AZURE_CV_PUBLISHED_NAME else None,
    }


def predict_with_azure_custom_vision(image_bytes: bytes) -> dict[str, Any] | None:
    if not azure_custom_vision_enabled():
        return None

    prediction_url = (
        f"{AZURE_CV_ENDPOINT}/customvision/v3.0/Prediction/"
        f"{AZURE_CV_PROJECT_ID}/classify/iterations/{AZURE_CV_PUBLISHED_NAME}/image"
    )
    request = urlrequest.Request(
        prediction_url,
        data=image_bytes,
        headers={
            "Prediction-Key": AZURE_CV_KEY,
            "Content-Type": "application/octet-stream",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urlerror.URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("Azure Custom Vision prediction failed: %s", exc)
        return {
            "enabled": True,
            "model_name": AZURE_CV_MODEL_NAME,
            "error": "Azure Custom Vision prediction failed.",
        }

    predictions = payload.get("predictions", [])
    top_prediction = predictions[0] if predictions else {}
    return {
        "enabled": True,
        "model_name": AZURE_CV_MODEL_NAME,
        "project": payload.get("project"),
        "iteration": payload.get("iteration"),
        "created": payload.get("created"),
        "top_label": top_prediction.get("tagName"),
        "confidence": round(float(top_prediction.get("probability", 0)) * 100, 2),
        "predictions": [
            {
                "label": prediction.get("tagName"),
                "confidence": round(float(prediction.get("probability", 0)) * 100, 2),
            }
            for prediction in predictions[:3]
        ],
    }


def supported_image_upload(file: UploadFile) -> bool:
    allowed_content_types = {
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/octet-stream",
    }
    if file.content_type not in allowed_content_types:
        return False

    filename = (file.filename or "").lower()
    return filename.endswith((".jpg", ".jpeg", ".png"))


def fluorescence_index_classifier(
    norm_R: float,
    norm_G: float,
    norm_B: float,
    mode: str,
) -> dict[str, Any]:
    red_blue_ratio = norm_R / (norm_B + 1e-6)
    green_blue_ratio = norm_G / (norm_B + 1e-6)
    chlorophyll_index = (norm_R / (norm_R + norm_B + 1e-6)) * 100

    if mode == "uv":
        authentic_score = 0
        authentic_score += 35 if norm_R >= 420 else max(0, (norm_R - 220) / 200 * 35)
        authentic_score += 25 if norm_G >= 150 else max(0, norm_G / 150 * 25)
        authentic_score += 25 if norm_B <= 360 else max(0, (520 - norm_B) / 160 * 25)
        authentic_score += 15 if red_blue_ratio >= 1.25 else max(0, red_blue_ratio / 1.25 * 15)

        adulteration_score = 0
        adulteration_score += 35 if norm_B >= 420 else max(0, (norm_B - 250) / 170 * 35)
        adulteration_score += 30 if norm_R < 320 else max(0, (420 - norm_R) / 100 * 30)
        adulteration_score += 20 if red_blue_ratio < 1.0 else 0
        adulteration_score += 15 if green_blue_ratio < 0.7 else 0
    elif mode == "blue":
        authentic_score = 0
        authentic_score += 35 if norm_R >= 250 else max(0, norm_R / 250 * 35)
        authentic_score += 30 if green_blue_ratio >= 1.25 else max(0, green_blue_ratio / 1.25 * 30)
        authentic_score += 20 if norm_B <= 500 else max(0, (650 - norm_B) / 150 * 20)
        authentic_score += 15 if chlorophyll_index >= 38 else max(0, chlorophyll_index / 38 * 15)

        adulteration_score = 0
        adulteration_score += 40 if norm_B > 500 else max(0, (norm_B - 330) / 170 * 40)
        adulteration_score += 30 if green_blue_ratio < 1.1 else 0
        adulteration_score += 30 if chlorophyll_index < 35 else 0
    else:
        authentic_score = 0
        authentic_score += 40 if red_blue_ratio >= 2.1 else max(0, red_blue_ratio / 2.1 * 40)
        authentic_score += 35 if green_blue_ratio >= 1.8 else max(0, green_blue_ratio / 1.8 * 35)
        authentic_score += 25 if chlorophyll_index >= 65 else max(0, chlorophyll_index / 65 * 25)

        adulteration_score = 0
        adulteration_score += 35 if red_blue_ratio < 1.8 else 0
        adulteration_score += 35 if green_blue_ratio < 1.55 else 0
        adulteration_score += 30 if chlorophyll_index < 60 else 0

    score_margin = abs(authentic_score - adulteration_score)
    confidence = min(98.0, 52.0 + score_margin * 0.55)

    if score_margin < 14:
        status = "retest"
        label = "Retest required"
        message = "Fluorescence ratios are too close to the decision boundary. Retake under controlled lighting."
    elif authentic_score > adulteration_score:
        status = "authentic"
        label = "Authentic olive oil fluorescence profile"
        message = "Strong chlorophyll fluorescence and low blue oxidation/reflection signal were detected."
    else:
        status = "adulterated"
        label = "Adulteration risk detected"
        message = "The sample lacks the expected olive-oil fluorescence balance for the selected lighting mode."

    return {
        "model": "Physics-informed UV Fluorescence Index Classifier",
        "status": status,
        "label": label,
        "confidence": round(confidence, 2),
        "message": message,
        "scores": {
            "authentic": round(float(authentic_score), 2),
            "adulterated": round(float(adulteration_score), 2),
        },
        "indices": {
            "red_blue_ratio": round(float(red_blue_ratio), 3),
            "green_blue_ratio": round(float(green_blue_ratio), 3),
            "chlorophyll_index": round(float(chlorophyll_index), 2),
        },
    }


def fraud_group_from_spectral(fraud_detection: dict[str, Any]) -> str:
    verdict = fraud_detection.get("verdict")
    if verdict == "authentic_evoo":
        return "authentic"
    if verdict in {"industrial_seed_oil", "adulterated_blend"}:
        return "adulterated"
    return "inconclusive"


def fraud_group_from_azure(azure_prediction: dict[str, Any] | None) -> str:
    if not azure_prediction or azure_prediction.get("error"):
        return "unavailable"

    top_label = str(azure_prediction.get("top_label") or "").lower()
    if top_label == "pure_evoo":
        return "authentic"
    if top_label in {"light_adulteration", "heavy_adulteration"}:
        return "adulterated"
    return "inconclusive"


def final_decision(
    fraud_detection: dict[str, Any] | None,
    azure_prediction: dict[str, Any] | None,
    fluorescence_classifier: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if fluorescence_classifier:
        status = fluorescence_classifier.get("status", "retest")
        azure_group = fraud_group_from_azure(azure_prediction)
        fluorescence_group = "inconclusive" if status == "retest" else status
        agreement = "fluorescence_primary"
        support_message = "Azure Custom Vision was unavailable, so the decision uses the fluorescence index."

        if azure_group != "unavailable":
            if azure_group == fluorescence_group:
                agreement = "supporting_agreement"
                support_message = "Azure Custom Vision supports the fluorescence-index result."
            elif fluorescence_group == "inconclusive":
                agreement = "fluorescence_retest"
                support_message = "The fluorescence index is near the boundary. Retest under controlled lighting."
            else:
                agreement = "supporting_disagreement"
                support_message = (
                    "Azure Custom Vision disagrees with the fluorescence index. "
                    "For the live demo, trust the fluorescence signal and retest if lighting was uncontrolled."
                )

        return {
            "status": status,
            "label": fluorescence_classifier.get("label", "Fluorescence result"),
            "confidence": fluorescence_classifier.get("confidence", 0.0),
            "message": f"{fluorescence_classifier.get('message', '')} {support_message}".strip(),
            "agreement": agreement,
            "primary_model": fluorescence_classifier.get("model"),
            "spectral_group": fluorescence_group,
            "azure_group": azure_group,
        }

    if not fraud_detection:
        return {
            "status": "retest",
            "label": "Retest required",
            "confidence": 0.0,
            "message": "The image did not produce a valid spectral fraud signal.",
            "agreement": "none",
        }

    spectral_group = fraud_group_from_spectral(fraud_detection)
    azure_group = fraud_group_from_azure(azure_prediction)
    spectral_confidence = float(fraud_detection.get("confidence") or 0)
    azure_confidence = float((azure_prediction or {}).get("confidence") or 0)

    if azure_group == "unavailable":
        return {
            "status": spectral_group,
            "label": fraud_detection.get("label", "Spectral screening result"),
            "confidence": round(spectral_confidence, 2),
            "message": "Final decision is based on the UV spectral pipeline because Azure Custom Vision is unavailable.",
            "agreement": "spectral_only",
        }

    if "inconclusive" in {spectral_group, azure_group}:
        return {
            "status": "retest",
            "label": "Retest required",
            "confidence": round(max(spectral_confidence, azure_confidence), 2),
            "message": "One model returned an inconclusive signal. Retake the image under controlled UV lighting.",
            "agreement": "inconclusive",
        }

    if spectral_group != azure_group:
        return {
            "status": "retest",
            "label": "Retest required: model disagreement",
            "confidence": round(max(spectral_confidence, azure_confidence), 2),
            "message": (
                "Azure Custom Vision and the UV spectral rules disagree. "
                "Use a controlled darkbox capture and retest before making a fraud claim."
            ),
            "agreement": "disagreement",
            "spectral_group": spectral_group,
            "azure_group": azure_group,
        }

    status = "authentic" if spectral_group == "authentic" else "adulterated"
    label = "Authentic olive oil profile" if status == "authentic" else "Adulteration risk detected"
    confidence_values = [value for value in [spectral_confidence, azure_confidence] if value > 0]
    confidence = min(confidence_values) if confidence_values else 0
    return {
        "status": status,
        "label": label,
        "confidence": round(confidence, 2),
        "message": "Azure Custom Vision and UV spectral screening agree on this result.",
        "agreement": "agreement",
        "spectral_group": spectral_group,
        "azure_group": azure_group,
    }

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
def detect_fraud(norm_R: float, norm_G: float, norm_B: float, mode: str = "uv") -> dict:
    """
    AI Stage 1: Fraud Detection Logic Matrix.
    Calibrated for three tiered confidence/accessibility modes.
    """
    if mode == "uv":
        # Authentic EVOO: strong Red (chlorophyll), moderate Green, low-medium Blue (due to reflection)
        if norm_R > 400 and norm_G > 150 and norm_B < 380 and norm_R > norm_B:
            confidence = min(
                100.0,
                round(((norm_R - 400) / 600 * 50) + ((380 - norm_B) / 380 * 50), 1),
            )
            return {
                "passed":     True,
                "verdict":    "authentic_evoo",
                "label":      "Authentic EVOO (UV Mode)",
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
                    "Blue channel dominance detected under UV. No chlorophyll. "
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
                    "Abnormally high blue channel alongside chlorophyll signal under UV. "
                    "Possible artificial coloring added to seed oil."
                ),
                "confidence": min(100.0, round(norm_B / 10, 1)),
            }
            
    elif mode == "blue":
        # Blue light excitation (medium confidence)
        ratio_GB = norm_G / (norm_B + 1e-6)
        if norm_R > 250 and ratio_GB > 1.35 and norm_B < 480:
            return {
                "passed":     True,
                "verdict":    "authentic_evoo",
                "label":      "Authentic EVOO (Blue Light Mode)",
                "message":    "Expected blue absorption with green/red fluorescence signature under blue excitation.",
                "confidence": 75.0,
            }
        elif norm_B > 480 and ratio_GB < 1.15:
            return {
                "passed":     False,
                "verdict":    "industrial_seed_oil",
                "label":      "Industrial Seed Oil — Fraud Detected (Blue Mode)",
                "message":    "Dominant blue reflection and minimal green/red absorption. Consistent with seed oil.",
                "confidence": 80.0,
            }
        else:
            return {
                "passed":     False,
                "verdict":    "adulterated_blend",
                "label":      "Adulterated Blend — Fraud Detected (Blue Mode)",
                "message":    "Atypical spectral ratio under blue excitation. Possible adulteration.",
                "confidence": 70.0,
            }
            
    else:  # mode == "flash" / daylight
        # Flash / Daylight Mode (low confidence accessibility mode)
        ratio_GB = norm_G / (norm_B + 1e-6)
        ratio_RB = norm_R / (norm_B + 1e-6)
        
        # EVOO has G/B > 1.95 and R/B > 2.25 (strong blue absorption relative to green/red)
        if ratio_GB > 1.95 and ratio_RB > 2.25:
            return {
                "passed":     True,
                "verdict":    "authentic_evoo",
                "label":      "Authentic EVOO (Flash/Daylight)",
                "message":    "Expected chlorophyll-induced blue absorption profile under white light.",
                "confidence": 60.0,
            }
        # Seed oils have weak blue absorption (G/B < 1.95 or R/B < 2.25)
        else:
            return {
                "passed":     False,
                "verdict":    "industrial_seed_oil",
                "label":      "Industrial Seed Oil — Fraud Detected",
                "message":    "Weak blue light absorption profile. Consistent with yellow seed oils (soy, corn, canola).",
                "confidence": 65.0,
            }

    # Borderline / inconclusive pattern
    return {
        "passed":     False,
        "verdict":    "inconclusive",
        "label":      "Inconclusive — Retest Required",
        "message":    (
            "Signal does not match known patterns for the selected lighting mode. "
            "Retake under controlled conditions."
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


def preprocess_and_extract(img_bgr: np.ndarray, mode: str = "uv") -> dict:
    """
    Full scientific UV/Light fluorescence pipeline.
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
                "No valid sample fluorescence detected."
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
    fraud_result = detect_fraud(norm_R, norm_G, norm_B, mode)
    fluorescence_result = fluorescence_index_classifier(norm_R, norm_G, norm_B, mode)

    # STEP 7: AI Stage 2 — Quality grading (only if fraud check passed)
    quality_result = grade_quality(norm_R, norm_G, norm_B) if fluorescence_result["status"] == "authentic" else None

    return {
        "valid":             True,
        "raw":               {"R": round(raw_R, 2), "G": round(raw_G, 2), "B": round(raw_B, 2)},
        "normalized_counts": {
            "red_670nm":    round(norm_R, 2),
            "green_530nm":  round(norm_G, 2),
            "blue_440nm":   round(norm_B, 2),
        },
        "fraud_detection":   fraud_result,
        "fluorescence_classifier": fluorescence_result,
        "quality_grading":   quality_result,
        "nonzero_pixels":    nonzero_pixels,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "model": "loaded" if MODEL_BUNDLE is not None else "unavailable"}


@app.get("/model-info")
async def model_info():
    return model_summary()


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
                    "eem_total":         float(row.get("eem_total", 0) or 0),
                    "chlorophyll_mean":  float(row.get("chlorophyll_mean", 0) or 0),
                    "chlorophyll_max":   float(row.get("chlorophyll_max", 0) or 0),
                    "uv_mean":           float(row.get("uv_mean", 0) or 0),
                    "mid_ex_mean":       float(row.get("mid_ex_mean", 0) or 0),
                    "chlorophyll_ratio": float(row.get("chlorophyll_ratio", 0) or 0),
                    "aging_step":        int(row.get("aging_step", 0) or 0),
                    "filename":          row.get("filename", ""),
                })
    except Exception as exc:
        logger.error(f"EEM read error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    return data


@app.post("/predict-eem")
async def predict_eem(payload: EemPredictionRequest):
    return predict_eem_aging(payload.model_dump())


@app.post("/predict")
async def predict(file: UploadFile = File(...), mode: str = Form("uv")):
    # Validate content type
    if not supported_image_upload(file):
        raise HTTPException(status_code=400, detail="Only JPG and PNG images are supported.")

    # Decode image
    raw_bytes = await file.read()
    np_arr = np.frombuffer(raw_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    # Run UV pipeline
    try:
        result = preprocess_and_extract(img, mode)
    except Exception as exc:
        logger.error(f"Pipeline error: {exc}")
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {exc}")

    azure_prediction = predict_with_azure_custom_vision(raw_bytes)
    if azure_prediction is not None:
        result["azure_custom_vision"] = azure_prediction
    result["final_decision"] = final_decision(
        result.get("fraud_detection"),
        azure_prediction,
        result.get("fluorescence_classifier"),
    )
    result["model_info"] = model_summary()

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


def configure_frontend_static() -> None:
    index_path = os.path.join(FRONTEND_STATIC_DIR, "index.html")
    if not os.path.exists(index_path):
        logger.info("Frontend static build not found at %s.", FRONTEND_STATIC_DIR)
        return

    assets_dir = os.path.join(FRONTEND_STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_frontend_index():
        return FileResponse(index_path)

    @app.get("/{full_path:path}")
    async def serve_frontend_app(full_path: str):
        static_root = os.path.abspath(FRONTEND_STATIC_DIR)
        requested_path = os.path.abspath(os.path.join(FRONTEND_STATIC_DIR, full_path))
        if os.path.commonpath([static_root, requested_path]) != static_root:
            raise HTTPException(status_code=404, detail="Not found")
        if os.path.isfile(requested_path):
            return FileResponse(requested_path)
        return FileResponse(index_path)


configure_frontend_static()
