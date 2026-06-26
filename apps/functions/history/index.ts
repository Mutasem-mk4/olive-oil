/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GET /api/history — Analysis History Endpoint
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Returns the complete history of olive oil analyses, ordered by most recent
 * first. This powers the History page in the frontend where users can review
 * all past analyses, compare results across batches, and identify patterns
 * in adulteration across suppliers.
 *
 * FUTURE ENHANCEMENTS:
 *   - Pagination (offset/limit query params)
 *   - Date range filtering
 *   - Supplier/region filtering
 *   - Export to CSV/Excel
 *   - Aggregated statistics (avg purity per supplier)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { getAnalyses } from '../shared/cosmos.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HttpRequest {
  method: string;
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── Main Handler ────────────────────────────────────────────────────────────

export default async function history(
  context: { log: (...args: unknown[]) => void },
  req: HttpRequest
): Promise<HttpResponse> {
  context.log('[GET /api/history] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    // ── Query all analyses from Cosmos DB (or mock store) ──────────────────
    // getAnalyses() internally handles Cosmos DB connection failures
    // by falling back to the in-memory mock store with seeded demo data
    const result = await getAnalyses();

    context.log(`[GET /api/history] ✅ Returning ${result.total} analyses`);

    return {
      status: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        analyses: result.analyses,
        total: result.total,
      }),
    };
  } catch (error) {
    context.log(`[GET /api/history] ❌ Error:`, error);

    // Graceful degradation: return empty array rather than an error
    // This ensures the History page always renders, even if Cosmos DB is down
    return {
      status: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        analyses: [],
        total: 0,
        _note: 'No data available — Cosmos DB may be offline',
      }),
    };
  }
}
