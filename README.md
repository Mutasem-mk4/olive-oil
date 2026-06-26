# 🫒 Zaytoun Vision

**AI-powered olive oil authenticity screening tool using UV fluorescence analysis.**

Upload a smartphone photo of your olive oil sample taken under UV light and get an instant purity verdict — no lab required.

---

## Features

- **UV Fluorescence Analysis** — detects authentic chlorophyll fluorescence patterns
- **XGBoost Model** — trained on 26 colour, HSV, LAB, and fluorescence image features
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
│   └── model.pkl         ← Place your trained model here
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

### 1. Add your model

```bash
# Copy your trained model into the backend directory
cp /path/to/model.pkl zaytoun-vision/backend/model.pkl
```

### 2. Start the backend

```bash
cd zaytoun-vision/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

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

### `GET /health`

```json
{ "status": "ok", "model": "loaded" }
```

### `GET /history`

Returns the last 20 predictions as a JSON array.

---

## Image Preprocessing Pipeline

The backend applies this pipeline to every uploaded image:

1. **Gray World White Balance** — normalises colour cast
2. **Center ROI Crop** — removes 20% margin from each edge
3. **Resize to 224×224** — standard input size
4. **CLAHE on L channel** — contrast enhancement in LAB space
5. **Gaussian Blur (3×3)** — noise reduction
6. **Feature Extraction** — 26 features across RGB, HSV, LAB, fluorescence, and texture

---

## Feature Set (26 features)

| Group        | Features                                          |
|--------------|---------------------------------------------------|
| RGB          | mean, std, skewness for R, G, B channels (9)      |
| HSV          | mean, std for H, S, V channels (6)                |
| LAB          | mean, std for L, A, B channels (6)                |
| Fluorescence | fluorescence_intensity, fluorescence_ratio (2)    |
| Texture      | texture_entropy (1)                               |
| Brightness   | brightness_mean, brightness_std (2)               |

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
| Backend  | FastAPI, Python 3.10, OpenCV, XGBoost |
| Database | SQLite (built-in)                     |
| Frontend | React 18, Vite, TypeScript, Tailwind  |
| Routing  | React Router v6                       |
| HTTP     | Axios                                 |
| Icons    | Lucide React                          |
| Deploy   | Docker + Docker Compose               |
