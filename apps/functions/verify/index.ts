/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GET /api/verify/:id — Certificate Verification Endpoint
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides public verification of purity certificates. Anyone with a
 * certificate ID (e.g., ZV-20260625-A7K2) can verify its authenticity
 * and view the associated analysis results.
 *
 * USE CASES:
 *   - Importers verify certificates received with olive oil shipments
 *   - Consumers scan QR codes on bottles to confirm purity claims
 *   - Regulatory bodies audit certificate authenticity
 *   - Trade shows / demos — judges can verify certificates in real-time
 *
 * SECURITY NOTES:
 *   - This is a public endpoint (no authentication required)
 *   - Only exposes non-sensitive analysis data (purity, date, sample name)
 *   - Certificate IDs are sufficiently random to prevent enumeration
 *   - Rate limiting should be applied in production (Azure API Management)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { getCertificateById, getAnalysisById } from '../shared/cosmos.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HttpRequest {
  method: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// ─── CORS Headers ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── Main Handler ────────────────────────────────────────────────────────────

export default async function verify(
  context: { log: (...args: unknown[]) => void },
  req: HttpRequest
): Promise<HttpResponse> {
  context.log('[GET /api/verify] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    // ── Step 1: Extract Certificate ID ─────────────────────────────────────
    // The ID comes from the route parameter: /api/verify/{id}
    // It can also come from a query param for flexibility: /api/verify?id=ZV-...
    const certificateId =
      req.params?.id ||
      req.query?.id ||
      '';

    if (!certificateId) {
      return {
        status: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          valid: false,
          error: 'Missing certificate ID',
          hint: 'Use /api/verify/ZV-YYYYMMDD-XXXX or /api/verify?id=ZV-YYYYMMDD-XXXX',
        }),
      };
    }

    context.log(`[GET /api/verify] Looking up certificate: ${certificateId}`);

    // ── Step 2: Look Up Certificate ────────────────────────────────────────
    const certificate = await getCertificateById(certificateId);

    if (!certificate) {
      context.log(`[GET /api/verify] ❌ Certificate not found: ${certificateId}`);

      return {
        status: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          valid: false,
          certificateId,
          error: 'Certificate not found',
          message: 'This certificate ID does not exist in our records. It may be fraudulent or expired.',
        }),
      };
    }

    // ── Step 3: Look Up Associated Analysis ────────────────────────────────
    const analysis = await getAnalysisById(certificate.analysisId);

    if (!analysis) {
      context.log(`[GET /api/verify] ⚠️ Certificate found but analysis missing: ${certificate.analysisId}`);

      return {
        status: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          valid: true,
          certificateId: certificate.certificateId,
          issuedAt: certificate.issuedAt,
          analysis: null,
          warning: 'Certificate is valid but the associated analysis data is unavailable',
        }),
      };
    }

    // ── Step 4: Return Verified Result ─────────────────────────────────────
    context.log(`[GET /api/verify] ✅ Certificate verified: ${certificateId}`);

    return {
      status: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        valid: true,
        certificateId: certificate.certificateId,
        issuedAt: certificate.issuedAt,
        analysis: {
          id: analysis.id,
          sampleName: analysis.sampleName,
          purityScore: analysis.purityScore,
          adulterantDetected: analysis.adulterantDetected,
          confidence: analysis.confidence,
          timestamp: analysis.timestamp,
          status: analysis.status,
        },
      }),
    };
  } catch (error) {
    context.log(`[GET /api/verify] ❌ Error:`, error);

    return {
      status: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        valid: false,
        error: 'Verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
