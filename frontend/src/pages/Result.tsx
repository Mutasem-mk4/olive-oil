import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Download,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Layers,
  Cpu,
  Cloud,
} from 'lucide-react';
import type { PredictionResult } from '../types';
import FraudVerdictCard from '../components/FraudVerdictCard';
import QualityGradeCard from '../components/QualityGradeCard';
import SpectralBarsCard from '../components/SpectralBarsCard';
import FinalDecisionCard from '../components/FinalDecisionCard';

export default function Result() {
  const navigate = useNavigate();
  const [result, setResult] = useState<PredictionResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('zaytoun_result');
    if (!stored) {
      navigate('/analyze');
      return;
    }
    try {
      setResult(JSON.parse(stored) as PredictionResult);
    } catch {
      navigate('/analyze');
    }
  }, [navigate]);

  if (!result) return null;

  const formattedTs = new Date(result.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handlePrint = () => {
    window.print();
  };

  // Check if image was invalid (too dark / out of focus)
  if (!result.valid) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="p-8 rounded-2xl border border-yellow-200 bg-yellow-50 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Image too dark — retake under UV light</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
            The system could not detect any valid UV fluorescence. Please ensure your sample is illuminated with 365nm UV light inside a darkbox, and that you have cropped to the active liquid layer.
          </p>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-olive-500 text-white font-bold text-sm hover:bg-olive-600 transition-colors shadow-sm"
          >
            <RefreshCw size={16} />
            Try again
          </Link>
        </div>
      </div>
    );
  }

  const fraud = result.fraud_detection;
  const grading = result.quality_grading;
  const normalizedCounts = result.normalized_counts;
  const modelInfo = result.model_info;
  const azurePrediction = result.azure_custom_vision;
  const fluorescenceClassifier = result.fluorescence_classifier;
  const finalDecision = result.final_decision;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Analysis Report</h1>
          <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {formattedTs}
            </span>
            <span className="flex items-center gap-1">
              <Layers size={13} />
              CMOS low-cost spectrometer mode
            </span>
          </div>
          {result.demo && (
            <span className="inline-flex items-center mt-3 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
              Demo sample: {result.sample_name || 'reference sample'}
            </span>
          )}
        </div>

        <div className="flex gap-2 no-print">
          <button
            id="download-report-btn"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition-colors bg-white shadow-sm"
          >
            <Download size={14} />
            Download Report (PDF)
          </button>
        </div>
      </div>

      {/* Main Results Stack */}
      <div className="space-y-6">
        {finalDecision && <FinalDecisionCard decision={finalDecision} />}

        {modelInfo && (
          <div className="card shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-olive-50 text-olive-500 flex items-center justify-center border border-olive-100">
                  <Cpu size={19} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-olive-500">Primary camera model</p>
                  <h2 className="text-base font-bold text-gray-900 mt-0.5">
                    {modelInfo.primary_camera_model?.name || 'UV Fluorescence Index Classifier'}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Ratio/index classifier for UV or flash color response
                  </p>
                  {modelInfo.public_eem_adulteration_model?.loaded && (
                    <p className="text-xs text-olive-600 mt-1">
                      Public EEM adulteration: {modelInfo.public_eem_adulteration_model.row_count} spectra ·{' '}
                      {modelInfo.public_eem_adulteration_model.metrics?.holdout_balanced_accuracy
                        ? `${(modelInfo.public_eem_adulteration_model.metrics.holdout_balanced_accuracy * 100).toFixed(1)}% holdout balanced`
                        : modelInfo.public_eem_adulteration_model.selected_model}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left sm:text-right">
                <div className="rounded-xl bg-olive-50 border border-olive-100 px-3 py-2">
                  <p className="text-lg font-extrabold text-gray-900">
                    {fluorescenceClassifier?.indices.chlorophyll_index !== undefined
                      ? `${fluorescenceClassifier.indices.chlorophyll_index.toFixed(1)}`
                      : 'Ready'}
                  </p>
                  <p className="text-[10px] uppercase font-bold tracking-wide text-olive-500">Chlorophyll index</p>
                </div>
                <div className="rounded-xl bg-olive-50 border border-olive-100 px-3 py-2">
                  <p className="text-lg font-extrabold text-gray-900">
                    {fluorescenceClassifier?.indices.red_blue_ratio !== undefined
                      ? fluorescenceClassifier.indices.red_blue_ratio.toFixed(2)
                      : 'Ready'}
                  </p>
                  <p className="text-[10px] uppercase font-bold tracking-wide text-olive-500">Red/blue ratio</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {fluorescenceClassifier && (
          <div className="card shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-olive-500">
                  Fluorescence index classifier
                </p>
                <h2 className="text-base font-bold text-gray-900 mt-0.5">{fluorescenceClassifier.label}</h2>
                <p className="text-xs text-gray-600 mt-1">{fluorescenceClassifier.message}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-extrabold text-olive-600">
                  {fluorescenceClassifier.confidence.toFixed(1)}%
                </p>
                <p className="text-[10px] uppercase font-bold tracking-wide text-gray-400">Index confidence</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-xl bg-olive-50 border border-olive-100 px-3 py-2">
                <p className="text-xs font-bold text-gray-800">Red/blue</p>
                <p className="text-xs text-gray-500 mt-0.5">{fluorescenceClassifier.indices.red_blue_ratio.toFixed(3)}</p>
              </div>
              <div className="rounded-xl bg-olive-50 border border-olive-100 px-3 py-2">
                <p className="text-xs font-bold text-gray-800">Green/blue</p>
                <p className="text-xs text-gray-500 mt-0.5">{fluorescenceClassifier.indices.green_blue_ratio.toFixed(3)}</p>
              </div>
              <div className="rounded-xl bg-olive-50 border border-olive-100 px-3 py-2">
                <p className="text-xs font-bold text-gray-800">Chlorophyll index</p>
                <p className="text-xs text-gray-500 mt-0.5">{fluorescenceClassifier.indices.chlorophyll_index.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stage 1: Fraud Verdict */}
        {fraud && <FraudVerdictCard fraud={fraud} />}

        {azurePrediction && (
          <div className="card shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Cloud size={19} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Azure Custom Vision</p>
                  <h2 className="text-base font-bold text-gray-900 mt-0.5">
                    {azurePrediction.error || azurePrediction.top_label || 'Camera model ready'}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    {azurePrediction.model_name}
                    {azurePrediction.iteration ? ` · iteration ${azurePrediction.iteration}` : ''}
                  </p>
                </div>
              </div>
              {!azurePrediction.error && (
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-extrabold text-sky-700">
                    {azurePrediction.confidence !== undefined ? `${azurePrediction.confidence.toFixed(1)}%` : 'Ready'}
                  </p>
                  <p className="text-[10px] uppercase font-bold tracking-wide text-sky-700/70">Top confidence</p>
                </div>
              )}
            </div>
            {azurePrediction.predictions && azurePrediction.predictions.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {azurePrediction.predictions.map((prediction) => (
                  <div key={prediction.label} className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2">
                    <p className="text-xs font-bold text-gray-800">{prediction.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{prediction.confidence.toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stage 2: Quality Grading (Only show if passed Stage 1) */}
        {grading && <QualityGradeCard grading={grading} />}

        {/* Spectral Readings (Bars) */}
        {normalizedCounts && <SpectralBarsCard counts={normalizedCounts} />}

        {/* Extra info: raw means & pixel count */}
        {result.raw && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 flex flex-col sm:flex-row justify-between gap-2">
            <span><strong>Raw RGB Means:</strong> R={result.raw.R.toFixed(1)}, G={result.raw.G.toFixed(1)}, B={result.raw.B.toFixed(1)}</span>
            <span><strong>Active Pixels:</strong> {result.nonzero_pixels?.toLocaleString()} px after background border thresholding</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 no-print">
        <Link
          to="/analyze"
          id="analyze-another-btn"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-olive-500 text-white font-bold text-sm hover:bg-olive-600 transition-colors shadow-md text-center"
        >
          <RefreshCw size={16} />
          Analyze another sample
        </Link>
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-12 pt-4 border-t border-gray-200 text-[10px] text-gray-400 text-center">
        Zaytoun Vision — AI Olive Oil Authenticity Report · {formattedTs} ·
        For field screening purposes only. Not a substitute for accredited laboratory analysis.
      </div>
    </div>
  );
}
