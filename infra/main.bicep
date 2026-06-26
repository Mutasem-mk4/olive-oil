// ═══════════════════════════════════════════════════════════════════════════════
// ZAYTOUN VISION — Azure Infrastructure (Bicep)
// ═══════════════════════════════════════════════════════════════════════════════
//
// This template deploys the complete Azure infrastructure for Zaytoun Vision,
// an AI-powered olive oil adulteration detection platform.
//
// DEPLOYMENT:
//   az deployment group create \
//     --resource-group zaytoun-vision-rg \
//     --template-file infra/main.bicep \
//     --parameters projectName=zaytounvision
//
// ESTIMATED COST (Hackathon / Free Tier):
//   - Static Web Apps: Free tier ($0/mo)
//   - Functions: Consumption plan (~$0 for demo traffic)
//   - Cosmos DB: Serverless (~$0 for demo traffic)
//   - Blob Storage: LRS (~$0.02/GB/mo)
//   - Custom Vision: Free tier (10K predictions/mo)
//   - Application Insights: Free up to 5GB/mo
//   TOTAL: ~$0-1/month for hackathon usage
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Parameters ──────────────────────────────────────────────────────────────

@description('Base name for all resources. Keep short (max 11 chars) for naming constraints.')
@minLength(3)
@maxLength(11)
param projectName string = 'zaytoun'

@description('Azure region for all resources. Chosen for proximity to Jordan/Palestine.')
param location string = resourceGroup().location

@description('Environment tag: dev, staging, or prod')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

// ─── Variables ───────────────────────────────────────────────────────────────

// Unique suffix prevents naming collisions across Azure tenants
var uniqueSuffix = uniqueString(resourceGroup().id)
var baseName = '${projectName}${uniqueSuffix}'

// Resource names (following Azure naming conventions)
var staticWebAppName = '${projectName}-swa-${environment}'
var functionAppName = '${projectName}-func-${environment}'
var storageAccountName = '${take(toLower(replace(baseName, '-', '')), 24)}'
var cosmosAccountName = '${projectName}-cosmos-${environment}'
var appInsightsName = '${projectName}-insights-${environment}'
var customVisionTrainingName = '${projectName}-cvtrain-${environment}'
var customVisionPredictionName = '${projectName}-cvpredict-${environment}'
var appServicePlanName = '${projectName}-plan-${environment}'

// ─── Tags ────────────────────────────────────────────────────────────────────

// Tags help with cost tracking, governance, and resource organization
var defaultTags = {
  project: 'zaytoun-vision'
  environment: environment
  hackathon: 'true'
  purpose: 'olive-oil-adulteration-detection'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AZURE STATIC WEB APP
// ═══════════════════════════════════════════════════════════════════════════════
// PURPOSE: Hosts the React frontend with built-in global CDN, SSL, and
// GitHub Actions CI/CD. The Free tier is perfect for hackathons and includes
// custom domains, staging environments, and auth integration.
//
// WHY NOT App Service? Static Web Apps is purpose-built for SPAs with:
//   - Automatic API proxying to Azure Functions
//   - Built-in auth providers (Azure AD, GitHub)
//   - Global CDN with no configuration
//   - Free custom domains with auto-SSL

// resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
//   name: staticWebAppName
//   location: location
//   tags: defaultTags
//   sku: {
//     name: 'Free'
//     tier: 'Free'
//   }
//   properties: {
//     // Build configuration is defined in the GitHub Actions workflow
//     // The SWA CLI handles local development proxying
//   }
// }

// ═══════════════════════════════════════════════════════════════════════════════
// 2. AZURE STORAGE ACCOUNT
// ═══════════════════════════════════════════════════════════════════════════════
// PURPOSE: Serves dual roles:
//   a) Blob Storage for olive oil sample images and generated certificates
//   b) Required backing store for Azure Functions (function code, logs)
//
// LRS (Locally Redundant Storage) is sufficient for hackathon — upgrade to
// GRS (Geo-Redundant) for production to protect against datacenter failures.

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: defaultTags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'  // Cheapest option, fine for hackathon
  }
  properties: {
    supportsHttpsTrafficOnly: true  // Security: HTTPS only
    minimumTlsVersion: 'TLS1_2'    // Security: Modern TLS only
    allowBlobPublicAccess: false     // Security: No public blob access
    accessTier: 'Hot'               // Fast access for active images
  }
}

// Blob container for sample images
resource sampleImagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: '${storageAccount.name}/default/sample-images'
  properties: {
    publicAccess: 'None'  // Require SAS tokens for access
  }
}

// Blob container for generated certificates
resource certificatesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: '${storageAccount.name}/default/certificates'
  properties: {
    publicAccess: 'None'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. APPLICATION INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════════
// PURPOSE: Provides real-time monitoring, logging, and diagnostics for the
// Azure Functions backend. Critical for:
//   - Tracking Custom Vision API latency and success rates
//   - Monitoring Cosmos DB RU consumption
//   - Debugging failed analyses during development
//   - Live dashboard for the hackathon demo
//
// Free tier includes 5GB/month of data ingestion — more than enough.

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: defaultTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    RetentionInDays: 30  // Keep logs for 30 days
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. APP SERVICE PLAN (Consumption)
// ═══════════════════════════════════════════════════════════════════════════════
// PURPOSE: Serverless compute for Azure Functions. Consumption plan means:
//   - Pay only when functions execute (per-execution billing)
//   - Auto-scales from 0 to handle bursts (e.g., demo day traffic)
//   - First 1M executions/month are FREE
//   - No idle cost when the demo isn't running

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: defaultTags
  kind: 'functionapp'
  sku: {
    name: 'Y1'    // Y1 = Consumption (serverless) plan
    tier: 'Dynamic'
  }
  properties: {
    reserved: false  // false = Windows, true = Linux
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AZURE FUNCTION APP
// ═══════════════════════════════════════════════════════════════════════════════
// PURPOSE: Hosts the serverless API endpoints:
//   - POST /api/analyze → Image classification via Custom Vision
//   - GET  /api/history → Analysis history from Cosmos DB
//   - POST /api/certificate → Purity certificate generation
//   - GET  /api/verify/:id → Certificate verification
//
// Node.js 18 runtime for TypeScript execution with ES modules support.

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  tags: defaultTags
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      nodeVersion: '~18'
      cors: {
        allowedOrigins: [
          'https://${storageAccountName}.z16.web.core.windows.net'
          'http://localhost:5173'    // Vite dev server
          'http://localhost:4280'    // SWA CLI
        ]
        supportCredentials: false
      }
      appSettings: [
        // ── Azure Functions Runtime ──────────────────────────────────
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        // ── Application Insights ─────────────────────────────────────
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        // ── Cosmos DB ────────────────────────────────────────────────
        {
          name: 'AZURE_COSMOS_CONNECTION_STRING'
          value: cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
        }
        {
          name: 'AZURE_COSMOS_DATABASE'
          value: 'zaytoun-vision'
        }
        // ── Blob Storage ─────────────────────────────────────────────
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'AZURE_STORAGE_CONTAINER'
          value: 'sample-images'
        }
        // ── Custom Vision ────────────────────────────────────────────
        {
          name: 'AZURE_CUSTOM_VISION_ENDPOINT'
          value: customVisionPrediction.properties.endpoint
        }
        {
          name: 'AZURE_CUSTOM_VISION_KEY'
          value: customVisionPrediction.listKeys().key1
        }
      ]
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AZURE COSMOS DB (Serverless)
// ═══════════════════════════════════════════════════════════════════════════════
// PURPOSE: NoSQL document database for storing:
//   - Analysis results (purity scores, adulterant detection, tags)
//   - Certificate records (certificate ID, issuance date, analysis link)
//
// SERVERLESS MODE: Perfect for hackathons — pay only for RU consumed per
// request. No minimum throughput provisioning. Essentially free for demos.
//
// WHY NOT SQL? The analysis result schema may evolve as we add new detection
// capabilities. NoSQL flexibility eliminates migration headaches.

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {
  name: cosmosAccountName
  location: location
  tags: defaultTags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      {
        name: 'EnableServerless'  // Serverless = pay-per-request, no min cost
      }
    ]
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'  // Session consistency for best UX
    }
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-02-15-preview' = {
  parent: cosmosAccount
  name: 'zaytoun-vision'
  properties: {
    resource: {
      id: 'zaytoun-vision'
    }
  }
}

// Cosmos DB Container: analyses
resource analysesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: cosmosDatabase
  name: 'analyses'
  properties: {
    resource: {
      id: 'analyses'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          { path: '/*' }
        ]
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    }
  }
}

// Cosmos DB Container: certificates
resource certificatesContainerCosmos 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: cosmosDatabase
  name: 'certificates'
  properties: {
    resource: {
      id: 'certificates'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. AZURE CUSTOM VISION (Training + Prediction)
// ═══════════════════════════════════════════════════════════════════════════════
// PURPOSE: AI-powered image classification for olive oil adulteration detection.
//
// TWO RESOURCES:
//   a) Training: Upload labeled images, train classification models
//   b) Prediction: Deploy trained models, classify new samples via API
//
// The separation allows us to retrain models without affecting the production
// prediction endpoint — zero-downtime model updates.

// Custom Vision — Training resource
resource customVisionTraining 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: customVisionTrainingName
  location: location
  tags: defaultTags
  kind: 'CustomVision.Training'
  sku: {
    name: 'F0'  // Free tier: 2 projects, 5,000 images
  }
  properties: {
    customSubDomainName: customVisionTrainingName
    publicNetworkAccess: 'Enabled'
  }
}

// Custom Vision — Prediction resource
resource customVisionPrediction 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: customVisionPredictionName
  location: location
  tags: defaultTags
  kind: 'CustomVision.Prediction'
  sku: {
    name: 'F0'  // Free tier: 10,000 predictions/month
  }
  properties: {
    customSubDomainName: customVisionPredictionName
    publicNetworkAccess: 'Enabled'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════════
// These outputs are used by CI/CD pipelines and local development setup.

output staticWebsiteUrl string = 'https://${storageAccountName}.z16.web.core.windows.net/'
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output functionAppName string = functionApp.name
output cosmosAccountEndpoint string = cosmosAccount.properties.documentEndpoint
output storageAccountName string = storageAccount.name
output customVisionTrainingEndpoint string = customVisionTraining.properties.endpoint
output customVisionPredictionEndpoint string = customVisionPrediction.properties.endpoint
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
