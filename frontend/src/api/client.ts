import axios from 'axios';
import type { PredictionResult, HistoryRecord, EemFeatureRecord, ModelInfo } from '../types';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const BASE_URL = configuredBaseUrl || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

/**
 * Upload an image and get a prediction result.
 * @param file  - The UV image file
 * @param mode  - Lighting mode: 'uv' | 'blue' | 'flash'
 */
export async function predictImage(
  file: File,
  mode: 'uv' | 'blue' | 'flash' = 'uv',
): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const response = await api.post<PredictionResult>('/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

/**
 * Fetch the last 20 prediction history records.
 */
export async function fetchHistory(): Promise<HistoryRecord[]> {
  const response = await api.get<HistoryRecord[]>('/history');
  return response.data;
}

/**
 * Fetch Swiss EEM features from the server.
 */
export async function fetchEemFeatures(): Promise<EemFeatureRecord[]> {
  const response = await api.get<EemFeatureRecord[]>('/eem-features');
  return response.data;
}

/**
 * Fetch trained model metadata and validation summary.
 */
export async function fetchModelInfo(): Promise<ModelInfo> {
  const response = await api.get<ModelInfo>('/model-info');
  return response.data;
}

/**
 * Health check.
 */
export async function checkHealth(): Promise<{ status: string }> {
  const response = await api.get<{ status: string }>('/health');
  return response.data;
}
