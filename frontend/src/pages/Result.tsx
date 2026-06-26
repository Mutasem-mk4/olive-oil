import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  ShieldCheck,
  BarChart2,
  Download,
  RefreshCw,
} from 'lucide-react';
import type { PredictionResult } from '../types';
import PurityGauge from '../components/PurityGauge';
import RiskBadge from '../components/RiskBadge';
import FeatureCard from '../components/FeatureCard';

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

  const isPure      = result.label === 'pure';
  const formattedTs = new Date(result.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 fade-in">
      {/* ------------------------------------------------------------------ */}
      {/* Certificate header                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="rounded-2xl p-8 mb-6 text-white relative overflow-hidden"
        style={{ background: isPure
          ? 'linear-gradient(135deg, #0f4234 0%, #1D9E75 100%)'
          : 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)' }}
      >
        {/* Decorative blob */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 bg-white pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Big score */}
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">Purity Score</p>
            <p className="text-7xl font-extrabold leading-none">{result.purity_score}%</p>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-24 bg-white/20" />

          {/* Verdict + gauge */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {isPure
                ? <CheckCircle2 size={22} className="text-green-200" />
                : <AlertTriangle size={22} className="text-red-200" />}
              <span className="text-lg font-bold">
                {isPure ? 'Likely authentic EVOO ✓' : 'Possible adulteration ⚠️'}
              </span>
            </div>

            <div className="mb-4">
              <PurityGauge score={result.purity_score} />
            </div>

            <div className="flex items-center gap-2 text-sm text-white/80">
              <span className="font-semibold text-white">{result.confidence}%</span>
              model confidence
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <p className="absolute bottom-4 right-6 text-xs text-white/50">
          Analyzed {formattedTs}
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Metrics grid                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <FeatureCard
          icon={<AlertTriangle size={20} />}
          title="Adulteration"
          value={`${result.adulteration_pct}%`}
          description="Estimated adulteration level"
          accent={false}
        />
        <div className="card shadow-card flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Risk Level</p>
          <RiskBadge level={result.risk_level} size="lg" />
          <p className="text-xs text-gray-400">Based on label + confidence</p>
        </div>
        <FeatureCard
          icon={<BarChart2 size={20} />}
          title="Confidence"
          value={`${result.confidence}%`}
          description="Model prediction confidence"
          accent
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Details section                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Fluorescence */}
        <div className="card shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical size={18} className="text-olive-500" />
            <h3 className="text-sm font-semibold text-gray-700">Fluorescence Intensity</h3>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{result.fluorescence_intensity.toFixed(1)}</p>
          <p className="text-xs text-gray-400 mt-1">Mean B+G channel value (0–255 range)</p>
        </div>

        {/* AI recommendation */}
        <div className="card shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={18} className="text-olive-500" />
            <h3 className="text-sm font-semibold text-gray-700">AI Recommendation</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{result.recommendation}</p>
        </div>
      </div>

      {/* Top features table */}
      <div className="card shadow-card mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Diagnostic Features</h3>
        <table className="w-full text-sm" aria-label="Top features table">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Feature</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(result.top_features).map(([key, val]) => (
              <tr key={key} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 font-mono text-xs text-gray-600">{key}</td>
                <td className="py-2.5 text-right font-semibold text-gray-900">{Number(val).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Action buttons                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row gap-3 no-print">
        <button
          id="download-report-btn"
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-olive-200 text-olive-600 font-semibold text-sm hover:bg-olive-50 transition-colors"
        >
          <Download size={16} />
          Download Report (PDF)
        </button>
        <Link
          to="/analyze"
          id="analyze-another-btn"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-olive-500 text-white font-semibold text-sm hover:bg-olive-600 transition-colors"
        >
          <RefreshCw size={16} />
          Analyze another sample
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Print-only header                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden print:block mt-12 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
        Zaytoun Vision — AI Olive Oil Authenticity Report · {formattedTs} ·
        For field screening purposes only. Not a substitute for accredited laboratory analysis.
      </div>
    </div>
  );
}
