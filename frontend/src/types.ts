// Shared types for the Zaytoun Vision app

export interface PredictionResult {
  label: 'pure' | 'adulterated';
  confidence: number;
  purity_score: number;
  adulteration_pct: number;
  risk_level: 'low' | 'medium' | 'high';
  fluorescence_intensity: number;
  top_features: Record<string, number>;
  recommendation: string;
  timestamp: string;
}

export interface HistoryRecord {
  id: number;
  filename: string;
  label: string;
  confidence: number;
  purity_score: number;
  adulteration_pct: number;
  risk_level: string;
  fluorescence_intensity: number;
  recommendation: string;
  timestamp: string;
}

export interface EemFeatureRecord {
  eem_mean: number;
  eem_max: number;
  eem_std: number;
  chlorophyll_mean: number;
  chlorophyll_max: number;
  chlorophyll_ratio: number;
  aging_step: number;
  filename: string;
}

