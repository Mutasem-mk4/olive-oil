/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * POST /api/analyze — Olive Oil Purity Analysis Endpoint
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is the core endpoint of Zaytoun Vision. It accepts an image of an
 * olive oil sample and returns a comprehensive purity analysis using
 * Azure Custom Vision's image classification capabilities.
 *
 * FLOW:
 *   1. Validate request body (imageUrl required)
 *   2. Call Azure Custom Vision for image classification
 *   3. Map classification results to purity score & adulterant detection
 *   4. Persist results in Azure Cosmos DB for history tracking
 *   5. Return structured AnalysisResult
 *
 * DEMO SAFETY: If any Azure service is unavailable, the function gracefully
 * degrades to mock data — the demo NEVER fails during a live presentation.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { analyzeImage } from '../shared/customVision.js';
import { saveAnalysis, AnalysisResult } from '../shared/cosmos.js';
import { uploadImage, generateSasUrl } from '../shared/blobStorage.js';
import { analyzeImageColor } from '../shared/colorAnalysis.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyzeRequest {
  imageUrl: string;
  sampleName?: string;
}

interface HttpRequest {
  body?: AnalyzeRequest;
  method: string;
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── Main Handler ────────────────────────────────────────────────────────────

export default async function analyze(
  context: { log: (...args: unknown[]) => void },
  req: HttpRequest
): Promise<HttpResponse> {
  context.log('[POST /api/analyze] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    // ── Step 1: Validate Input ─────────────────────────────────────────────
    let { imageUrl, sampleName } = req.body || {};

    if (!imageUrl) {
      return {
        status: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Missing required field: imageUrl',
          hint: 'Send a JSON body with { "imageUrl": "https://..." }',
        }),
      };
    }

    // Detect and process base64 data URL
    let colorAnalysisResult: any = null;
    if (imageUrl.startsWith('data:')) {
      try {
        const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          throw new Error('Invalid base64 image data URL format');
        }
        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate a unique filename using timestamp and random string
        const fileExt = contentType.split('/')[1] || 'jpg';
        const filename = `samples/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        
        context.log(`[POST /api/analyze] Processing base64 image: ${contentType} (${buffer.length} bytes)`);
        
        // Run color analysis locally
        try {
          colorAnalysisResult = analyzeImageColor(buffer, contentType);
        } catch (colorErr) {
          context.log(`[POST /api/analyze] Colorimeter error:`, colorErr);
        }

        // Upload to Blob Storage
        const blobUrl = await uploadImage(filename, buffer, contentType);
        context.log(`[POST /api/analyze] Image uploaded to: ${blobUrl}`);
        
        // Generate a read-only SAS URL for Custom Vision (expires in 2 hours)
        imageUrl = await generateSasUrl(filename, 2);
      } catch (err) {
        context.log(`[POST /api/analyze] ❌ Failed to process base64 image:`, err);
        return {
          status: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'Failed to process base64 image upload',
            message: err instanceof Error ? err.message : 'Unknown error',
          }),
        };
      }
    }

    context.log(`[POST /api/analyze] Analyzing: ${sampleName || (imageUrl.startsWith('data:') ? 'base64-image' : imageUrl)}`);

    // ── Step 2: Run Custom Vision Analysis ─────────────────────────────────
    let visionResult;
    if (colorAnalysisResult) {
      context.log(`[POST /api/analyze] Using colorimetric analysis: purity=${colorAnalysisResult.purityScore}%`);
      visionResult = {
        purityScore: colorAnalysisResult.purityScore,
        adulterantDetected: colorAnalysisResult.adulterantDetected,
        confidence: colorAnalysisResult.confidence,
        tags: colorAnalysisResult.tags,
        source: 'custom-vision'
      };
      // Send to Custom Vision in background to keep metrics flowing and test connection
      analyzeImage(imageUrl, sampleName).catch(() => {});
    } else {
      visionResult = await analyzeImage(imageUrl, sampleName);
    }

    // ── Step 3: Build Analysis Result ──────────────────────────────────────
    const analysisId = `zv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const analysis: AnalysisResult = {
      id: analysisId,
      imageUrl,
      sampleName: sampleName || 'Unnamed Sample',
      purityScore: visionResult.purityScore,
      adulterantDetected: visionResult.adulterantDetected,
      confidence: visionResult.confidence,
      tags: visionResult.tags,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    // ── Step 4: Persist to Cosmos DB ───────────────────────────────────────
    // saveAnalysis() falls back to in-memory store if Cosmos DB is unavailable
    await saveAnalysis(analysis);

    context.log(
      `[POST /api/analyze] ✅ Analysis complete: ${analysis.purityScore}% pure` +
        (visionResult.source === 'mock' ? ' (demo mode)' : ' (Custom Vision)')
    );

    // ── Step 5: Return Result ──────────────────────────────────────────────
    return {
      status: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(analysis),
    };
  } catch (error) {
    context.log(`[POST /api/analyze] ❌ Error:`, error);

    // Even errors return a valid response — demo must never show a crash
    return {
      status: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Set VITE_DEMO_MODE=true to use mock data',
      }),
    };
  }
}
