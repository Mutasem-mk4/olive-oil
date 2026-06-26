# 🫒 Zaytoun Vision

**Olive oil screening tool using UV fluorescence analysis and EEM quality modeling.**

Upload a smartphone photo of your olive oil sample taken under UV light and get an instant purity verdict — no lab required.

---

## Features

- **UV Fluorescence Analysis** — extracts smartphone image channel signals from controlled lighting photos
- **Physics-Informed Fluorescence Index Classifier** — primary camera model for the UV/flash demo
- **Selected EEM ML Model** — compares multiple classifiers and saves the best validation performer
- **Public Fluorescence Adulteration Model** — builds a 314-row EEM dataset from Zenodo and trains an adulteration classifier
- **Azure Custom Vision Camera Model** — calls the published `ZaytounModel` classifier when Azure env vars are configured
- **Rule-Based Camera Fraud Screen** — applies transparent RGB threshold logic for field screening
- **Demo-Ready Final Verdict** — primary result comes from red/green/blue fluorescence indices, with Azure as supporting evidence
- **Instant Results** — prediction in under a second
- **Digital Report** — PDF-printable authenticity certificate
- **History Log** — SQLite database stores last 20 predictions

---

## Project Structure

```
zaytoun-vision/
├── backend/
│   ├── main.py           ← FastAPI app (preprocessing + inference + SQLite)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── train_model.py    ← Reproducible EEM model training script
│   ├── model.pkl         ← Trained EEM model artifact
│   └── model_metrics.json← Validation metrics and model limitations
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Analyze.tsx
│   │   │   ├── Result.tsx
│   │   │   └── History.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── PurityGauge.tsx
│   │   │   ├── RiskBadge.tsx
│   │   │   └── FeatureCard.tsx
│   │   └── api/client.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── index.html
├── docker-compose.yml
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Train the EEM model

```bash
cd zaytoun-vision
py -3.12 backend/train_model.py
```

The default model predicts `quality_band` from EEM features:

| Band | Label                 | Source aging steps |
|------|-----------------------|--------------------|
| 0    | fresh_or_lightly_aged | 0–2                |
| 1    | oxidized              | 3–6                |
| 2    | degraded              | 7–9                |

Exact `aging_step` training is available with:

```bash
py -3.12 backend/train_model.py --target aging_step
```

Current `quality_band` validation metrics and the selected model name are written to `backend/model_metrics.json`.

The current selected model is `vote_xgboost_logistic_histgb`, a soft-voting ensemble of XGBoost, logistic regression, and histogram gradient boosting. Its current holdout balanced accuracy is `0.6969`.

The primary live camera model is the `Physics-informed UV Fluorescence Index Classifier`. It uses `red_670nm`, `green_530nm`, `blue_440nm`, red/blue ratio, green/blue ratio, and a chlorophyll index. This is the model to present in the hackathon demo because it matches the actual test: shine UV or flash and read the color response.

Azure Custom Vision is configured separately with environment variables and used as supporting evidence. Use `backend/.env.example` as the template. The existing Azure project is published as `ZaytounModel` with classes `pure_evoo`, `light_adulteration`, and `heavy_adulteration`.

The public fluorescence adulteration dataset is built from Zenodo record `19755088`:

```bash
py -3.12 backend/build_zenodo_eem_dataset.py
py -3.12 backend/train_zenodo_adulteration_model.py
```

The current selected public EEM adulteration model is `vote_xgboost_extra_trees_svm`.
It reaches `0.9621` holdout balanced accuracy and `0.8867` group-CV balanced accuracy on the generated 314-row EEM feature dataset.

For the accuracy workflow, follow `docs/ACCURACY_PLAN.md`. It defines the capture protocol, blind-test folder layout, and the evaluation command for held-out camera images.

### 2. Start the backend

```bash
cd zaytoun-vision/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- Model info: http://localhost:8000/model-info

### 3. Start the frontend

```bash
cd zaytoun-vision/frontend
npm install
npm run dev
```

The app will be available at **http://localhost:3000**

---

## Running with Docker

```bash
cd zaytoun-vision
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

---

## API Reference

### `POST /predict`

Upload a JPG or PNG image for analysis.

```bash
curl -X POST http://localhost:8000/predict \
  -F "file=@sample.jpg"
```

**Response:**
```json
{
  "label": "pure",
  "confidence": 94.5,
  "purity_score": 87,
  "adulteration_pct": 13,
  "risk_level": "low",
  "fluorescence_intensity": 83.4,
  "top_features": {
    "rgb_G_mean": 120.3,
    "fluorescence_ratio": 0.98,
    "hsv_S_mean": 45.2
  },
  "recommendation": "This sample shows strong chlorophyll fluorescence...",
  "timestamp": "2024-11-14T14:32:00"
}
```

When Azure Custom Vision is configured, the response also includes `fluorescence_classifier`, `azure_custom_vision`, and `final_decision`. The `final_decision` result is driven by the fluorescence-index classifier, while Azure is shown as supporting evidence.

### `GET /health`

```json
{ "status": "ok", "model": "loaded" }
```

### `GET /model-info`

Returns the loaded model target, feature names, validation summary, Azure Custom Vision status, and limitations.

### `POST /predict-eem`

Predicts the EEM `quality_band` from the 9 numeric EEM feature columns.

```json
{
  "eem_mean": 19.25,
  "eem_max": 599.92,
  "eem_std": 52.34,
  "eem_total": 611636.06,
  "chlorophyll_mean": 32.90,
  "chlorophyll_max": 418.12,
  "uv_mean": 1.38,
  "mid_ex_mean": 3.69,
  "chlorophyll_ratio": 23.81
}
```

### `GET /history`

Returns the last 20 predictions as a JSON array.

---

## Camera Image Preprocessing Pipeline

The backend applies this pipeline to every uploaded image:

1. **Dynamic ROI crop** — removes image borders and background
2. **Brightness mask** — keeps pixels above threshold 50
3. **Channel means** — extracts masked RGB means
4. **Count normalization** — maps 0–255 channel values to 0–1000 counts
5. **Rule-based fraud screen** — evaluates red, green, and blue channel thresholds by lighting mode

---

## EEM Model Feature Set

The selected EEM model consumes these feature columns:

`eem_mean`, `eem_max`, `eem_std`, `eem_total`, `chlorophyll_mean`, `chlorophyll_max`, `uv_mean`, `mid_ex_mean`, `chlorophyll_ratio`.

The repository data does **not** contain real/fake/adulterated labels or labeled smartphone camera images. Camera fraud detection is therefore rule-based until a labeled image dataset is collected.

---

## Risk Level Logic

| Label       | Confidence | Risk Level |
|-------------|-----------|------------|
| pure        | > 85%     | 🟢 Low     |
| pure        | ≤ 85%     | 🟡 Medium  |
| adulterated | any       | 🔴 High    |

---

## Disclaimer

> Zaytoun Vision is a **field screening tool** designed for rapid preliminary assessment.
> Results should not be used as a substitute for accredited laboratory analysis (e.g., IOC/USDA standards).
> Accuracy depends on image quality and UV lamp specifications.

---

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Backend  | FastAPI, Python 3.10, OpenCV, scikit-learn, XGBoost |
| Database | SQLite (built-in)                     |
| Frontend | React 18, Vite, TypeScript, Tailwind  |
| Routing  | React Router v6                       |
| HTTP     | Axios                                 |
| Icons    | Lucide React                          |
| Deploy   | Docker + Docker Compose               |
