import axios from 'axios';
import type { PredictionResult, HistoryRecord, EemFeatureRecord } from '../types';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

/**
 * Upload an image and get a prediction result.
 */
export async function predictImage(file: File): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append('file', file);

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
 * Health check.
 */
export async function checkHealth(): Promise<{ status: string; model: string }> {
  const response = await api.get<{ status: string; model: string }>('/health');
  return response.data;
}

