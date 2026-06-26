// ============================================================
// Zaytoun Vision — API Service
// ============================================================
// Client for Azure Functions backend endpoints.
// Every function has a demo/mock fallback that activates when:
// 1. VITE_DEMO_MODE=true in environment
// 2. The Azure Functions backend is unreachable
// 3. An API call fails for any reason
//
// Azure Justification: This service communicates with Azure
// Functions (serverless compute) which orchestrates calls to
// Azure Custom Vision, Azure Blob Storage, and Azure Cosmos DB.
// ============================================================

import type { AnalysisResult, HistoryResponse, CertificateResponse, VerifyResponse, OilBreakdown } from '../types';
import { DEMO_SCENARIOS, DEMO_OIL_BREAKDOWNS, generateCertificateId } from './demo';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_BASE;

// In-memory store for demo mode history
const demoHistory: AnalysisResult[] = [];

/**
 * POST /api/analyze — Send an image for purity analysis
 * Falls back to demo mode if API is unavailable
 */
export async function analyzeImage(imageUrl: string, sampleName?: string): Promise<AnalysisResult> {
  const isBase64 = imageUrl.startsWith('data:');
  
  if (IS_DEMO && !isBase64) {
    return getDemoResult(sampleName);
  }

  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, sampleName }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const result: AnalysisResult = await response.json();

    // Map status based on purity thresholds
    if (result.purityScore >= 85) {
      result.status = 'pure';
    } else if (result.purityScore >= 50) {
      result.status = 'warning';
    } else {
      result.status = 'adulterated';
    }

    // Map tags if they are objects
    if (result.tags && result.tags.length > 0 && typeof result.tags[0] === 'object') {
      result.tags = (result.tags as any).map((t: any) => t.tagName);
    }

    return result;
  } catch (error) {
    console.warn('Azure Functions unavailable, falling back to demo mode:', error);
    return getDemoResult(sampleName);
  }
}

/**
 * GET /api/history — Fetch analysis history from Cosmos DB
 * Falls back to in-memory demo history
 */
export async function getHistory(): Promise<HistoryResponse> {
  if (IS_DEMO) {
    return { analyses: demoHistory, total: demoHistory.length };
  }

  try {
    const response = await fetch(`${API_BASE}/history`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json() as HistoryResponse;

    // Map history items
    data.analyses = data.analyses.map(result => {
      if (result.purityScore >= 85) {
        result.status = 'pure';
      } else if (result.purityScore >= 50) {
        result.status = 'warning';
      } else {
        result.status = 'adulterated';
      }
      if (result.tags && result.tags.length > 0 && typeof result.tags[0] === 'object') {
        result.tags = (result.tags as any).map((t: any) => t.tagName);
      }
      return result;
    });

    return data;
  } catch (error) {
    console.warn('History API unavailable, using demo history:', error);
    return { analyses: demoHistory, total: demoHistory.length };
  }
}

/**
 * POST /api/certificate — Generate a digital certificate
 * Falls back to client-side certificate generation
 */
export async function generateCertificate(analysisId: string): Promise<CertificateResponse> {
  if (IS_DEMO) {
    const certId = generateCertificateId();
    return {
      certificateUrl: `/certificate/${certId}`,
      certificateId: certId,
    };
  }

  try {
    const response = await fetch(`${API_BASE}/certificate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisId }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Certificate API unavailable, generating client-side:', error);
    const certId = generateCertificateId();
    return {
      certificateUrl: `/certificate/${certId}`,
      certificateId: certId,
    };
  }
}

/**
 * GET /api/verify/:id — Verify a certificate's authenticity
 */
export async function verifyCertificate(certificateId: string): Promise<VerifyResponse> {
  if (IS_DEMO) {
    const analysis = demoHistory.find(a => a.id === certificateId) || DEMO_SCENARIOS[0].result;
    return { valid: true, analysis };
  }

  try {
    const response = await fetch(`${API_BASE}/verify/${certificateId}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Verify API unavailable:', error);
    return { valid: true, analysis: DEMO_SCENARIOS[0].result };
  }
}

/** Add a result to the demo history */
export function addToDemoHistory(result: AnalysisResult): void {
  demoHistory.unshift(result);
}

/** Get a demo result, optionally matching a named scenario */
function getDemoResult(sampleName?: string): AnalysisResult {
  if (sampleName) {
    const scenario = DEMO_SCENARIOS.find(s =>
      s.name.toLowerCase().includes(sampleName.toLowerCase()) ||
      s.id.includes(sampleName.toLowerCase())
    );
    if (scenario) return { ...scenario.result, id: `zv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}` };
  }
  // Default to first scenario
  return { ...DEMO_SCENARIOS[0].result, id: `zv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}` };
}

/**
 * Computes the composition breakdown of the oil dynamically based on purity score
 */
export function computeOilBreakdown(result: AnalysisResult): OilBreakdown[] {
  // If it's a known demo scenario or has matching id, return its breakdown
  if (result.id && DEMO_OIL_BREAKDOWNS[result.id]) {
    return DEMO_OIL_BREAKDOWNS[result.id];
  }
  // Also try mapping by sampleName or name
  const nameKey = Object.keys(DEMO_OIL_BREAKDOWNS).find(key => 
    result.sampleName?.toLowerCase().includes(key) || result.id?.includes(key)
  );
  if (nameKey && DEMO_OIL_BREAKDOWNS[nameKey]) {
    return DEMO_OIL_BREAKDOWNS[nameKey];
  }

  const purity = result.purityScore;
  if (purity >= 85) {
    return [
      { type: 'Extra Virgin Olive Oil', percentage: purity, color: '#4A7C59' },
      { type: 'Natural Organic Compounds', percentage: 100 - purity, color: '#8fbc8f' },
    ];
  } else if (purity >= 50) {
    const adulterant = result.adulterantDetected || 'Hazelnut Oil (suspected)';
    const other = 100 - purity - 15 > 0 ? 100 - purity - 15 : 0;
    const adulterantPct = 100 - purity - other;
    return [
      { type: 'Olive Oil', percentage: purity, color: '#4A7C59' },
      { type: adulterant, percentage: adulterantPct, color: '#D4843A' },
      ...(other > 0 ? [{ type: 'Other Lipids', percentage: other, color: '#9CA3AF' }] : []),
    ];
  } else {
    const adulterant = result.adulterantDetected || 'Soybean Oil (detected)';
    const other = 100 - purity - 45 > 0 ? 100 - purity - 45 : 0;
    const adulterantPct = 100 - purity - other;
    return [
      { type: 'Olive Oil', percentage: purity, color: '#4A7C59' },
      { type: adulterant, percentage: adulterantPct, color: '#B33A3A' },
      ...(other > 0 ? [{ type: 'Other Lipids', percentage: other, color: '#9CA3AF' }] : []),
    ];
  }
}
