// Shared types for the Zaytoun Vision app v2

export interface FraudDetection {
  passed: boolean;
  verdict: 'authentic_evoo' | 'industrial_seed_oil' | 'adulterated_blend' | 'inconclusive';
  label: string;
  message: string;
  confidence: number;
}

export interface QualityGrading {
  purity_index: number;
  aging_step: number;
  grade: string;
  description: string;
  color: 'green' | 'yellow' | 'red';
  green_phenols: number;
  oxidation_marker: number;
}

export interface PredictionResult {
  valid: boolean;
  demo?: boolean;
  sample_name?: string;
  error?: string;
  raw?: {
    R: number;
    G: number;
    B: number;
  };
  normalized_counts?: {
    red_670nm: number;
    green_530nm: number;
    blue_440nm: number;
  };
  fraud_detection?: FraudDetection;
  quality_grading?: QualityGrading | null;
  nonzero_pixels?: number;
  timestamp: string;
  model_info?: ModelInfo;
  azure_custom_vision?: AzureCustomVisionPrediction;
  fluorescence_classifier?: FluorescenceClassifier;
  final_decision?: FinalDecision;
}

export interface HistoryRecord {
  id: number;
  filename: string;
  verdict: string;
  label: string;
  confidence: number;
  purity_index: number | null;
  aging_step: number | null;
  grade: string | null;
  red_670nm: number;
  green_530nm: number;
  blue_440nm: number;
  nonzero_pixels: number;
  timestamp: string;
}

export interface EemFeatureRecord {
  eem_mean: number;
  eem_max: number;
  eem_std: number;
  eem_total: number;
  chlorophyll_mean: number;
  chlorophyll_max: number;
  uv_mean: number;
  mid_ex_mean: number;
  chlorophyll_ratio: number;
  aging_step: number;
  filename: string;
}

export interface ModelInfo {
  loaded: boolean;
  target?: string;
  selected_model?: string;
  model_type?: string;
  feature_names?: string[];
  classes?: number[];
  class_labels?: Record<string, string>;
  metrics?: {
    row_count?: number;
    holdout_balanced_accuracy?: number;
    cv_balanced_accuracy_mean?: number;
  };
  primary_camera_model?: {
    name: string;
    type: string;
    inputs: string[];
    role: string;
  };
  azure_custom_vision?: AzureCustomVisionInfo;
  public_eem_adulteration_model?: PublicEemAdulterationModel;
  limitations?: string[];
  message?: string;
}

export interface AzureCustomVisionInfo {
  enabled: boolean;
  model_name: string;
  project_id?: string | null;
  published_name?: string | null;
}

export interface AzureCustomVisionPrediction {
  enabled: boolean;
  model_name: string;
  project?: string;
  iteration?: string;
  created?: string;
  top_label?: string;
  confidence?: number;
  error?: string;
  predictions?: {
    label: string;
    confidence: number;
  }[];
}

export interface PublicEemAdulterationModel {
  loaded: boolean;
  target?: string;
  selected_model?: string;
  model_type?: string;
  row_count?: number;
  classes?: string[];
  metrics?: {
    holdout_balanced_accuracy?: number;
    group_cv_balanced_accuracy?: number;
    random_cv_balanced_accuracy?: number;
  };
  limitations?: string[];
  message?: string;
}

export interface FluorescenceClassifier {
  model: string;
  status: 'authentic' | 'adulterated' | 'retest';
  label: string;
  confidence: number;
  message: string;
  scores: {
    authentic: number;
    adulterated: number;
  };
  indices: {
    red_blue_ratio: number;
    green_blue_ratio: number;
    chlorophyll_index: number;
  };
}

export interface FinalDecision {
  status: 'authentic' | 'adulterated' | 'inconclusive' | 'retest';
  label: string;
  confidence: number;
  message: string;
  agreement: 'agreement' | 'disagreement' | 'inconclusive' | 'spectral_only' | 'none' | 'fluorescence_primary' | 'supporting_agreement' | 'supporting_disagreement' | 'fluorescence_retest';
  primary_model?: string;
  spectral_group?: string;
  azure_group?: string;
}
