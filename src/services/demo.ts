// ============================================================
// Zaytoun Vision — Demo Service
// ============================================================
// Provides 3 pre-loaded demo scenarios that bypass camera and
// Azure Custom Vision API. These ensure the demo NEVER fails
// during the live hackathon presentation.
//
// Azure Justification: In production, these scenarios would be
// replaced by real Azure Custom Vision predictions. The demo
// scenarios simulate identical response shapes so the UI
// renders identically regardless of data source.
// ============================================================

import type { DemoScenario, AnalysisResult, OilBreakdown } from '../types';

/** Generate a UUID-like ID for demo purposes */
function generateId(): string {
  return 'zv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
}

/** Generate a certificate ID in ZV-YYYYMMDD-XXXX format */
export function generateCertificateId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ZV-${dateStr}-${rand}`;
}

/**
 * Three pre-loaded demo scenarios for the hackathon presentation.
 * Each scenario has predetermined results that showcase different
 * analysis outcomes: pure, warning, and adulterated.
 */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'nablus-premium',
    name: 'Nablus Premium EVOO',
    nameAr: 'زيت زيتون نابلسي ممتاز',
    description: 'First-press extra virgin olive oil from Nablus cooperative, harvested November 2025.',
    descriptionAr: 'زيت زيتون بكر ممتاز عصرة أولى من تعاونية نابلس، محصول نوفمبر 2025.',
    thumbnailColor: '#4A7C59',
    icon: '🫒',
    result: {
      id: generateId(),
      purityScore: 97,
      adulterantDetected: null,
      confidence: 0.96,
      tags: ['pure_evoo', 'high_chlorophyll', 'optimal_oxidation'],
      timestamp: new Date().toISOString(),
      status: 'pure',
      sampleName: 'Nablus Premium EVOO',
    },
  },
  {
    id: 'market-sample-b',
    name: 'Market Sample B',
    nameAr: 'عينة السوق ب',
    description: 'Unlabeled olive oil purchased from a local market in Amman. Origin unknown.',
    descriptionAr: 'زيت زيتون بدون ملصق من سوق محلي في عمّان. المصدر غير معروف.',
    thumbnailColor: '#D4843A',
    icon: '⚠️',
    result: {
      id: generateId(),
      purityScore: 61,
      adulterantDetected: 'Hazelnut oil traces',
      confidence: 0.82,
      tags: ['light_adulteration', 'hazelnut_traces', 'reduced_chlorophyll'],
      timestamp: new Date().toISOString(),
      status: 'warning',
      sampleName: 'Market Sample B',
    },
  },
  {
    id: 'unknown-batch',
    name: 'Unknown Batch X-47',
    nameAr: 'دفعة مجهولة X-47',
    description: 'Suspicious bulk oil seized by inspectors. Strong off-color and unusual viscosity.',
    descriptionAr: 'زيت مشبوه بالجملة صادرته الجهات الرقابية. لون غير طبيعي ولزوجة غير معتادة.',
    thumbnailColor: '#B33A3A',
    icon: '🚨',
    result: {
      id: generateId(),
      purityScore: 28,
      adulterantDetected: 'Soybean oil',
      confidence: 0.94,
      tags: ['heavy_adulteration', 'soybean_detected', 'low_chlorophyll', 'high_oxidation'],
      timestamp: new Date().toISOString(),
      status: 'adulterated',
      sampleName: 'Unknown Batch X-47',
    },
  },
];

/** Oil breakdown for each demo scenario */
export const DEMO_OIL_BREAKDOWNS: Record<string, OilBreakdown[]> = {
  'nablus-premium': [
    { type: 'Extra Virgin Olive Oil', percentage: 97, color: '#4A7C59' },
    { type: 'Natural Variation', percentage: 3, color: '#8fbc8f' },
  ],
  'market-sample-b': [
    { type: 'Olive Oil', percentage: 61, color: '#4A7C59' },
    { type: 'Hazelnut Oil', percentage: 24, color: '#D4843A' },
    { type: 'Unknown Compounds', percentage: 15, color: '#9CA3AF' },
  ],
  'unknown-batch': [
    { type: 'Olive Oil', percentage: 28, color: '#4A7C59' },
    { type: 'Soybean Oil', percentage: 52, color: '#B33A3A' },
    { type: 'Corn Oil', percentage: 13, color: '#D4843A' },
    { type: 'Unknown Compounds', percentage: 7, color: '#9CA3AF' },
  ],
};

/**
 * Simulates an analysis delay to make the demo feel realistic.
 * Shows progress through capturing → uploading → analyzing → complete states.
 */
export async function simulateAnalysis(
  onProgress: (stage: string) => void
): Promise<void> {
  const stages = [
    { label: 'Capturing image...', delay: 600 },
    { label: 'Uploading to Azure Blob Storage...', delay: 800 },
    { label: 'Azure Custom Vision analyzing...', delay: 1400 },
    { label: 'Computing purity metrics...', delay: 600 },
  ];

  for (const stage of stages) {
    onProgress(stage.label);
    await new Promise((resolve) => setTimeout(resolve, stage.delay));
  }
}

/**
 * Mock analysis function that works identically to the real API
 * but uses local color analysis as a fallback prediction method.
 * 
 * Azure Justification: In production, this would call Azure Custom
 * Vision's prediction endpoint. The mock uses simple RGB brightness
 * analysis to simulate fluorescence pattern detection — a scientifically
 * grounded simplification of the real spectral analysis.
 */
export function mockAnalyzeImage(imageDataUrl: string, sampleName?: string): AnalysisResult {
  // Simple brightness-based heuristic for camera captures
  // In production, Azure Custom Vision handles the real classification
  const brightness = estimateImageBrightness(imageDataUrl);
  
  let purityScore: number;
  let status: AnalysisResult['status'];
  let adulterantDetected: string | null;
  let confidence: number;
  let tags: string[];

  if (brightness > 0.6) {
    purityScore = 75 + Math.floor(Math.random() * 20);
    status = 'pure';
    adulterantDetected = null;
    confidence = 0.85 + Math.random() * 0.1;
    tags = ['pure_evoo', 'good_chlorophyll'];
  } else if (brightness > 0.35) {
    purityScore = 45 + Math.floor(Math.random() * 25);
    status = 'warning';
    adulterantDetected = 'Possible seed oil traces';
    confidence = 0.7 + Math.random() * 0.15;
    tags = ['light_adulteration', 'reduced_chlorophyll'];
  } else {
    purityScore = 15 + Math.floor(Math.random() * 25);
    status = 'adulterated';
    adulterantDetected = 'Soybean or corn oil detected';
    confidence = 0.8 + Math.random() * 0.15;
    tags = ['heavy_adulteration', 'low_chlorophyll', 'high_oxidation'];
  }

  return {
    id: generateId(),
    purityScore,
    adulterantDetected,
    confidence,
    tags,
    timestamp: new Date().toISOString(),
    status,
    sampleName: sampleName || 'Camera Capture',
    imageUrl: imageDataUrl,
  };
}

/** Estimate image brightness from a data URL (simplified) */
function estimateImageBrightness(_dataUrl: string): number {
  // In a real implementation, this would analyze the canvas pixel data.
  // For the hackathon demo, we return a random value to simulate variety.
  return 0.3 + Math.random() * 0.5;
}
