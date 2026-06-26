// ============================================================
// Zaytoun Vision — Shared TypeScript Types
// ============================================================
// These types define the contract between frontend and Azure
// Functions backend. They are the single source of truth.
// ============================================================

/** Analysis status based on purity thresholds */
export type AnalysisStatus = 'pure' | 'warning' | 'adulterated';

/** Result from Azure Custom Vision analysis */
export interface AnalysisResult {
  /** Unique analysis identifier (UUID) */
  id: string;
  /** Purity score from 0-100 */
  purityScore: number;
  /** Detected adulterant type, null if pure */
  adulterantDetected: string | null;
  /** Confidence score from Azure Custom Vision (0-1) */
  confidence: number;
  /** Classification tags from Custom Vision */
  tags: string[];
  /** ISO timestamp of analysis */
  timestamp: string;
  /** Status classification based on purity thresholds */
  status: AnalysisStatus;
  /** User-provided sample name */
  sampleName?: string;
  /** Azure Blob Storage URL of the sample image */
  imageUrl?: string;
}

/** Request body for POST /api/analyze */
export interface AnalyzeRequest {
  /** Azure Blob Storage URL of the uploaded image */
  imageUrl: string;
  /** Optional user-provided sample name */
  sampleName?: string;
}

/** Response from GET /api/history */
export interface HistoryResponse {
  /** List of analysis results */
  analyses: AnalysisResult[];
  /** Total count for pagination */
  total: number;
}

/** Request body for POST /api/certificate */
export interface CertificateRequest {
  /** Analysis ID to generate certificate for */
  analysisId: string;
}

/** Response from POST /api/certificate */
export interface CertificateResponse {
  /** URL to the generated certificate PDF */
  certificateUrl: string;
  /** Unique certificate identifier */
  certificateId: string;
}

/** Response from GET /api/verify/:id */
export interface VerifyResponse {
  /** Whether the certificate is valid */
  valid: boolean;
  /** Associated analysis data */
  analysis: AnalysisResult;
}

/** Digital certificate for an analysis */
export interface Certificate {
  /** Certificate ID in ZV-YYYYMMDD-XXXX format */
  certificateId: string;
  /** Associated analysis result */
  analysis: AnalysisResult;
  /** ISO timestamp of certificate generation */
  issuedAt: string;
  /** Verification URL */
  verifyUrl: string;
}

/** Demo scenario for pre-loaded testing */
export interface DemoScenario {
  /** Scenario identifier */
  id: string;
  /** Display name */
  name: string;
  /** Arabic display name */
  nameAr: string;
  /** Description of the scenario */
  description: string;
  /** Arabic description */
  descriptionAr: string;
  /** Pre-determined analysis result */
  result: AnalysisResult;
  /** Thumbnail color for demo card (hex) */
  thumbnailColor: string;
  /** Emoji icon for the scenario card */
  icon: string;
}

/** Oil type breakdown for adulteration visualization */
export interface OilBreakdown {
  /** Oil type name */
  type: string;
  /** Percentage (0-100) */
  percentage: number;
  /** Display color */
  color: string;
}

/** Application loading states */
export type LoadingState = 'idle' | 'capturing' | 'uploading' | 'analyzing' | 'complete' | 'error';
