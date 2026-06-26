/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AZURE COSMOS DB CLIENT — Zaytoun Vision
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHY AZURE COSMOS DB (SERVERLESS)?
 * ──────────────────────────────────
 * 1. SERVERLESS TIER: Pay only for consumed RUs (Request Units), making it
 *    essentially free during hackathon development and low-traffic demos.
 *    No minimum throughput cost — perfect for bursty hackathon workloads.
 *
 * 2. GLOBAL DISTRIBUTION: Built-in multi-region replication means our
 *    platform can serve olive oil cooperatives across Jordan, Palestine,
 *    and export markets with low latency from any region.
 *
 * 3. SCHEMA FLEXIBILITY: NoSQL document model lets us evolve the analysis
 *    result schema as we add new detection capabilities (e.g., acidity
 *    levels, peroxide values) without database migrations.
 *
 * 4. INTEGRATED CHANGE FEED: Real-time change feed enables future features
 *    like automated alerts when adulterated samples are detected — critical
 *    for food safety monitoring at scale.
 *
 * 5. AZURE ECOSYSTEM: Native integration with Azure Functions, Static Web
 *    Apps, and Power BI for the analytics dashboard we plan to build.
 *
 * DATABASE SCHEMA:
 * ────────────────
 *   Database: zaytoun-vision
 *   ├── Container: analyses (partition key: /id)
 *   │   └── { id, imageUrl, sampleName, purityScore, adulterantDetected,
 *   │         confidence, tags[], timestamp, status }
 *   └── Container: certificates (partition key: /id)
 *       └── { id, analysisId, certificateId, certificateUrl, issuedAt }
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CosmosClient, Container, Database } from '@azure/cosmos';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalysisResult {
  id: string;
  imageUrl: string;
  sampleName: string;
  purityScore: number;
  adulterantDetected: string | null;
  confidence: number;
  tags: Array<{ tagName: string; probability: number }>;
  timestamp: string;
  status: 'completed' | 'processing' | 'failed';
}

export interface CertificateRecord {
  id: string;
  analysisId: string;
  certificateId: string;
  certificateUrl: string;
  issuedAt: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const CONNECTION_STRING = process.env.AZURE_COSMOS_CONNECTION_STRING || '';
const DATABASE_NAME = process.env.AZURE_COSMOS_DATABASE || 'zaytoun-vision';
const ANALYSES_CONTAINER = 'analyses';
const CERTIFICATES_CONTAINER = 'certificates';

// ─── In-Memory Mock Store ────────────────────────────────────────────────────

/**
 * DEMO FALLBACK: In-memory store ensures the app works without Cosmos DB.
 * Pre-seeded with realistic sample data so the History page is never empty
 * during a live demo. Data persists only for the function app's lifetime.
 */
const mockStore: {
  analyses: AnalysisResult[];
  certificates: CertificateRecord[];
} = {
  analyses: [
    {
      id: 'demo-001',
      imageUrl: '/samples/nablus-premium.jpg',
      sampleName: 'Nablus Premium EVOO',
      purityScore: 97.2,
      adulterantDetected: null,
      confidence: 0.982,
      tags: [
        { tagName: 'pure_evoo', probability: 0.982 },
        { tagName: 'light_adulteration', probability: 0.015 },
        { tagName: 'heavy_adulteration', probability: 0.003 },
      ],
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'completed',
    },
    {
      id: 'demo-002',
      imageUrl: '/samples/unknown-batch.jpg',
      sampleName: 'Unknown Batch #47',
      purityScore: 28.4,
      adulterantDetected: 'Soybean Oil (detected)',
      confidence: 0.941,
      tags: [
        { tagName: 'heavy_adulteration', probability: 0.941 },
        { tagName: 'light_adulteration', probability: 0.047 },
        { tagName: 'pure_evoo', probability: 0.012 },
      ],
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'completed',
    },
  ],
  certificates: [],
};

// ─── Cosmos DB Client (Lazy Initialization) ──────────────────────────────────

let _client: CosmosClient | null = null;
let _database: Database | null = null;
let _analysesContainer: Container | null = null;
let _certificatesContainer: Container | null = null;

/**
 * Lazily initializes the Cosmos DB client and containers.
 * Returns null if no connection string is configured (triggers mock fallback).
 */
async function getContainers(): Promise<{
  analyses: Container;
  certificates: Container;
} | null> {
  if (!CONNECTION_STRING) {
    console.log('[Cosmos DB] No connection string — using in-memory mock store');
    return null;
  }

  if (!_client) {
    try {
      _client = new CosmosClient(CONNECTION_STRING);
      _database = _client.database(DATABASE_NAME);
      _analysesContainer = _database.container(ANALYSES_CONTAINER);
      _certificatesContainer = _database.container(CERTIFICATES_CONTAINER);

      console.log('[Cosmos DB] Client initialized successfully');
    } catch (error) {
      console.warn('[Cosmos DB] Failed to initialize client:', error);
      return null;
    }
  }

  return {
    analyses: _analysesContainer!,
    certificates: _certificatesContainer!,
  };
}

// ─── CRUD Operations ─────────────────────────────────────────────────────────

/**
 * Saves an analysis result to Cosmos DB or the mock store.
 * Uses upsert to handle both insert and update scenarios.
 */
export async function saveAnalysis(analysis: AnalysisResult): Promise<AnalysisResult> {
  const containers = await getContainers();

  if (containers) {
    try {
      const { resource } = await containers.analyses.items.upsert(analysis);
      console.log(`[Cosmos DB] Analysis saved: ${analysis.id}`);
      return resource as unknown as AnalysisResult;
    } catch (error) {
      console.warn('[Cosmos DB] Save failed, falling back to mock:', error);
    }
  }

  // Mock fallback: store in memory
  const existingIndex = mockStore.analyses.findIndex((a) => a.id === analysis.id);
  if (existingIndex >= 0) {
    mockStore.analyses[existingIndex] = analysis;
  } else {
    mockStore.analyses.unshift(analysis); // newest first
  }
  console.log(`[Mock Store] Analysis saved: ${analysis.id}`);
  return analysis;
}

/**
 * Retrieves all analysis results, ordered by timestamp (newest first).
 * In production, this would use a Cosmos DB query with ORDER BY and pagination.
 */
export async function getAnalyses(): Promise<{ analyses: AnalysisResult[]; total: number }> {
  const containers = await getContainers();

  if (containers) {
    try {
      const querySpec = {
        query: 'SELECT * FROM c ORDER BY c.timestamp DESC',
      };
      const { resources } = await containers.analyses.items.query<AnalysisResult>(querySpec).fetchAll();
      return { analyses: resources, total: resources.length };
    } catch (error) {
      console.warn('[Cosmos DB] Query failed, falling back to mock:', error);
    }
  }

  // Mock fallback
  return {
    analyses: [...mockStore.analyses],
    total: mockStore.analyses.length,
  };
}

/**
 * Retrieves a single analysis by ID.
 * Uses point-read (by id + partition key) for optimal RU consumption.
 */
export async function getAnalysisById(id: string): Promise<AnalysisResult | null> {
  const containers = await getContainers();

  if (containers) {
    try {
      const { resource } = await containers.analyses.item(id, id).read<AnalysisResult>();
      return resource || null;
    } catch (error) {
      console.warn('[Cosmos DB] Point-read failed, falling back to mock:', error);
    }
  }

  // Mock fallback
  return mockStore.analyses.find((a) => a.id === id) || null;
}

/**
 * Saves a certificate record linking an analysis to a generated certificate.
 */
export async function saveCertificate(certificate: CertificateRecord): Promise<CertificateRecord> {
  const containers = await getContainers();

  if (containers) {
    try {
      const { resource } = await containers.certificates.items.upsert(certificate);
      console.log(`[Cosmos DB] Certificate saved: ${certificate.certificateId}`);
      return resource as unknown as CertificateRecord;
    } catch (error) {
      console.warn('[Cosmos DB] Certificate save failed, falling back to mock:', error);
    }
  }

  // Mock fallback
  mockStore.certificates.push(certificate);
  console.log(`[Mock Store] Certificate saved: ${certificate.certificateId}`);
  return certificate;
}

/**
 * Retrieves a certificate record by its certificate ID (ZV-YYYYMMDD-XXXX format).
 */
export async function getCertificateById(certificateId: string): Promise<CertificateRecord | null> {
  const containers = await getContainers();

  if (containers) {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.certificateId = @certId',
        parameters: [{ name: '@certId', value: certificateId }],
      };
      const { resources } = await containers.certificates.items
        .query<CertificateRecord>(querySpec)
        .fetchAll();
      return resources[0] || null;
    } catch (error) {
      console.warn('[Cosmos DB] Certificate query failed, falling back to mock:', error);
    }
  }

  // Mock fallback
  return mockStore.certificates.find((c) => c.certificateId === certificateId) || null;
}

/**
 * Retrieves a certificate record by its internal ID.
 */
export async function getCertificateByInternalId(id: string): Promise<CertificateRecord | null> {
  const containers = await getContainers();

  if (containers) {
    try {
      const { resource } = await containers.certificates.item(id, id).read<CertificateRecord>();
      return resource || null;
    } catch (error) {
      console.warn('[Cosmos DB] Certificate point-read failed, falling back to mock:', error);
    }
  }

  // Mock fallback
  return mockStore.certificates.find((c) => c.id === id) || null;
}
