# 🫒 Zaytoun Vision

### AI-Powered Olive Oil Adulteration Detection

> *Protecting Palestine's liquid gold — one scan at a time*

<!-- Replace with actual logo -->
<!-- ![Zaytoun Vision Logo](./public/logo.svg) -->

[![Azure](https://img.shields.io/badge/Azure-Custom%20Vision-0078D4?logo=microsoftazure)](https://azure.microsoft.com/en-us/services/cognitive-services/custom-vision-service/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

---

## 🌍 The Problem

Olive oil is a **$200M+ industry** in Jordan and Palestine — and up to **70% of olive oil worldwide** is suspected to be adulterated or mislabeled ([source](https://www.ucdavis.edu/food/study-finds-82-percent-high-extra-virgin-olive-oils-imported)).

Small-scale producers and cooperatives in Nablus, Jenin, and across the West Bank produce some of the world's finest olive oil, but they lack affordable tools to verify purity. Adulteration with cheap seed oils (soybean, sunflower, canola) destroys trust, undercuts honest producers, and poses health risks.

**Traditional testing** requires sending samples to specialized labs — costing $200+ per test and taking 2-3 days. Most cooperatives can't afford it.

## 💡 The Solution

**Zaytoun Vision** uses Azure Custom Vision AI to analyze olive oil samples in **under 3 seconds**, detecting adulteration through RGB fluorescence pattern analysis.

| Feature | Description |
|---------|-------------|
| 🔬 **AI Analysis** | Upload a sample image → get purity score + adulterant type |
| 📜 **Certificates** | Generate verifiable purity certificates (ZV-YYYYMMDD-XXXX) |
| ✅ **Verification** | Anyone can verify a certificate via URL or QR code |
| 📊 **History** | Track all analyses with trend visualization |
| 🌐 **Bilingual** | Arabic + English for local and export markets |

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         ZAYTOUN VISION                               │
│                                                                      │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐   │
│  │   React SPA  │────▶│  Azure Functions │────▶│  Custom Vision   │   │
│  │  (Static Web │◀────│  (Serverless)    │◀────│  (AI Model)      │   │
│  │   Apps)      │     │                 │     └──────────────────┘   │
│  └─────────────┘     │  /api/analyze    │                            │
│         │            │  /api/history    │     ┌──────────────────┐   │
│         │            │  /api/certificate│────▶│  Cosmos DB       │   │
│    CDN + SSL         │  /api/verify/:id │◀────│  (Serverless)    │   │
│   (automatic)        └─────────────────┘     └──────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│                     ┌─────────────────┐     ┌──────────────────┐    │
│                     │  Blob Storage   │     │  App Insights    │    │
│                     │  (Images/Certs) │     │  (Monitoring)    │    │
│                     └─────────────────┘     └──────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

## 🧰 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + TypeScript + Vite | Fast dev, type safety, modern DX |
| **Styling** | Tailwind CSS + Framer Motion | Rapid UI with smooth animations |
| **Backend** | Azure Functions (Node.js 18) | Serverless, scales to zero, pay-per-use |
| **AI/ML** | Azure Custom Vision | Few-shot learning, no ML expertise needed |
| **Database** | Azure Cosmos DB (Serverless) | NoSQL flexibility, pay-per-request |
| **Storage** | Azure Blob Storage | Scalable image storage with SAS security |
| **Hosting** | Azure Static Web Apps | Free SSL, global CDN, CI/CD built-in |
| **Monitoring** | Azure Application Insights | Real-time telemetry and diagnostics |

## 🚀 5-Minute Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Git

### 1. Clone and Install

```bash
git clone https://github.com/your-team/zaytoun-vision.git
cd zaytoun-vision
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env — for demo mode, the defaults are fine!
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you're running! 🎉

### 4. (Optional) Start Azure Functions Locally

```bash
cd apps/functions
npm install
npm start
```

## 🎭 Demo Mode

Zaytoun Vision works **100% without Azure credentials**. Demo mode provides:

- ✅ Realistic analysis results with varied purity scores
- ✅ Certificate generation with proper ID format
- ✅ Full history tracking (in-memory)
- ✅ All UI animations and interactions

To enable demo mode:
```env
VITE_DEMO_MODE=true
```

This is the **default** — you don't need to do anything special. Just run `npm run dev` and the app works.

## 📋 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE` | No | `http://localhost:7071` | Azure Functions URL |
| `VITE_DEMO_MODE` | No | `true` | Enable mock data fallback |
| `AZURE_CUSTOM_VISION_ENDPOINT` | No* | — | Custom Vision API endpoint |
| `AZURE_CUSTOM_VISION_KEY` | No* | — | Custom Vision prediction key |
| `AZURE_CUSTOM_VISION_PROJECT_ID` | No* | — | Custom Vision project GUID |
| `AZURE_CUSTOM_VISION_ITERATION` | No* | `Iteration1` | Published model iteration |
| `AZURE_COSMOS_CONNECTION_STRING` | No* | — | Cosmos DB connection string |
| `AZURE_COSMOS_DATABASE` | No | `zaytoun-vision` | Cosmos DB database name |
| `AZURE_STORAGE_CONNECTION_STRING` | No* | — | Blob Storage connection string |
| `AZURE_STORAGE_CONTAINER` | No | `sample-images` | Blob container name |

\* *Required only for production. Demo mode works without these.*

## ☁️ Azure Deployment

### Option A: Azure CLI (Recommended)

```bash
# 1. Create resource group
az group create --name zaytoun-vision-rg --location eastus

# 2. Deploy infrastructure
az deployment group create \
  --resource-group zaytoun-vision-rg \
  --template-file infra/main.bicep \
  --parameters projectName=zaytoun

# 3. Deploy Functions
cd apps/functions
func azure functionapp publish zaytoun-func-dev

# 4. Deploy Frontend
swa deploy --app-name zaytoun-swa-dev
```

### Option B: GitHub Actions (CI/CD)

Push to `main` branch — GitHub Actions will:
1. Build the React frontend
2. Deploy to Azure Static Web Apps
3. Deploy Azure Functions
4. Run health checks

### Training the Custom Vision Model

```bash
# Generate synthetic training data
python scripts/generate-dataset.py

# Upload to Custom Vision portal:
# 1. Go to customvision.ai
# 2. Create new Classification project
# 3. Upload images from datasets/ folder
# 4. Tag by folder name (pure_evoo, light_adulteration, heavy_adulteration)
# 5. Train → Publish → Copy endpoint + key to .env
```

## 📂 Project Structure

```
zaytoun-vision/
├── apps/
│   └── functions/              # Azure Functions backend
│       ├── analyze/            # POST /api/analyze
│       ├── history/            # GET /api/history
│       ├── certificate/        # POST /api/certificate
│       ├── verify/             # GET /api/verify/:id
│       └── shared/             # Shared modules
│           ├── customVision.ts # Azure Custom Vision client
│           ├── cosmos.ts       # Azure Cosmos DB client
│           └── blobStorage.ts  # Azure Blob Storage client
├── src/                        # React frontend (Vite + TypeScript)
├── infra/
│   └── main.bicep              # Azure infrastructure template
├── scripts/
│   └── generate-dataset.py     # Synthetic training data generator
├── datasets/                   # Generated training images
├── docs/
│   └── architecture.md         # Detailed architecture documentation
├── .env.example                # Environment variables template
├── DEMO.md                     # Live demo presentation script
└── README.md                   # This file
```

## 👥 Team

<!-- Replace with your team members -->

| Name | Role | GitHub |
|------|------|--------|
| Team Member 1 | Full-Stack Lead | [@github](https://github.com) |
| Team Member 2 | AI/ML Engineer | [@github](https://github.com) |
| Team Member 3 | UI/UX Designer | [@github](https://github.com) |
| Team Member 4 | Domain Expert | [@github](https://github.com) |

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**Built with 💚 for Palestine's olive oil heritage**

*Zaytoun (زيتون) means "olives" in Arabic*

</div>
