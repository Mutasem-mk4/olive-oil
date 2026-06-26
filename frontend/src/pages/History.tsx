import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, RefreshCw, X, ExternalLink } from 'lucide-react';
import { fetchHistory, fetchEemFeatures } from '../api/client';
import type { HistoryRecord, EemFeatureRecord } from '../types';
import RiskBadge from '../components/RiskBadge';

interface EemChartProps {
  data: EemFeatureRecord[];
}

function EemChart({ data }: EemChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ step: number; avg: number; count: number } | null>(null);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-xl">
        <span className="text-sm text-gray-400">No scientific data available</span>
      </div>
    );
  }

  // Calculate averages per aging step (0 to 9)
  const steps = Array.from({ length: 10 }, (_, step) => {
    const stepData = data.filter((d) => d.aging_step === step);
    const avg = stepData.length > 0
      ? stepData.reduce((sum, d) => sum + d.chlorophyll_mean, 0) / stepData.length
      : 0;
    return { step, avg, count: stepData.length };
  });

  const width = 600;
  const height = 280;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };

  const maxX = 9;
  const maxY = Math.max(...steps.map((s) => s.avg), 1.0) * 1.1; // 10% headroom

  const getX = (xVal: number) => padding.left + (xVal / maxX) * (width - padding.left - padding.right);
  const getY = (yVal: number) => height - padding.bottom - (yVal / maxY) * (height - padding.top - padding.bottom);

  // Generate SVG path for the line
  const pathData = steps
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(s.step)} ${getY(s.avg)}`)
    .join(' ');

  return (
    <div className="card shadow-card mb-8">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900">How fluorescence changes with olive oil aging</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Based on the ZHAW Switzerland dataset (182 samples across 10 aging steps. 0 = Fresh, 9 = 53 days at 60°C).
        </p>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" aria-label="Aging step vs chlorophyll mean chart">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const yVal = ratio * maxY;
            const yPos = getY(yVal);
            return (
              <g key={ratio} className="opacity-20">
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  className="text-[10px] fill-gray-400 font-medium"
                >
                  {yVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X axis grid/labels */}
          {steps.map((s) => {
            const xPos = getX(s.step);
            return (
              <g key={s.step} className="opacity-25">
                <line
                  x1={xPos}
                  y1={padding.top}
                  x2={xPos}
                  y2={height - padding.bottom}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={xPos}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-500 font-semibold"
                >
                  S{s.step}
                </text>
              </g>
            );
          })}

          {/* Y Axis Label */}
          <text
            x={15}
            y={height / 2 - 20}
            transform={`rotate(-90 15 ${height / 2 - 20})`}
            textAnchor="middle"
            className="text-[10px] fill-gray-400 font-bold uppercase tracking-wider"
          >
            Chlorophyll Mean (EX 640nm)
          </text>

          {/* X Axis Label */}
          <text
            x={width / 2 + 15}
            y={height - 10}
            textAnchor="middle"
            className="text-[10px] fill-gray-400 font-bold uppercase tracking-wider"
          >
            Aging Step (0 = Fresh, 9 = Heavily Degraded)
          </text>

          {/* Chart Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#1D9E75"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Chart Dots */}
          {steps.map((s) => {
            const xPos = getX(s.step);
            const yPos = getY(s.avg);
            const isHovered = hoveredPoint?.step === s.step;
            return (
              <g key={s.step}>
                <circle
                  cx={xPos}
                  cy={yPos}
                  r={isHovered ? 7 : 5}
                  className="fill-white stroke-olive-500 cursor-pointer transition-all duration-150"
                  strokeWidth={isHovered ? 4 : 2}
                  onMouseEnter={() => setHoveredPoint(s)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip overlay */}
        {hoveredPoint && (
          <div
            className="absolute bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-xl border border-gray-800 transition-all duration-150 z-10"
            style={{
              left: `${(getX(hoveredPoint.step) / width) * 100}%`,
              top: `${(getY(hoveredPoint.avg) / height) * 100 - 24}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="font-bold">Aging Step {hoveredPoint.step}</p>
            <p className="text-gray-300 mt-0.5">Avg Chlorophyll: {hoveredPoint.avg.toFixed(2)}</p>
            <p className="text-gray-400 text-[10px]">{hoveredPoint.count} samples analyzed</p>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-olive-50/50 rounded-lg border border-olive-100/50">
        <p className="text-xs text-olive-800 leading-relaxed">
          🔬 <strong>Scientific Foundation:</strong> Chlorophyll pigments in genuine extra virgin olive oil gradually degrade during aging or thermal stress. The decreasing curve above shows how chlorophyll fluorescence emission (EX 640nm) decays, which serves as a key marker for detecting stale or adulterated products.
        </p>
      </div>
    </div>
  );
}

export default function History() {
  const [records, setRecords]         = useState<HistoryRecord[]>([]);
  const [eemData, setEemData]         = useState<EemFeatureRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selected, setSelected]       = useState<HistoryRecord | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyData, eemFeaturesData] = await Promise.all([
        fetchHistory(),
        fetchEemFeatures()
      ]);
      setRecords(historyData);
      setEemData(eemFeaturesData);
    } catch {
      setError('Unable to load history or Swiss EEM dataset. Make sure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const rowBg = (label: string) =>
    label === 'pure' ? 'bg-green-50/40 hover:bg-green-50' : 'bg-red-50/30 hover:bg-red-50';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Analysis History</h1>
          <p className="text-sm text-gray-500 mt-1">Last 20 predictions from the local database and Swiss scientific reference data</p>
        </div>
        <button
          onClick={() => void load()}
          id="refresh-history-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm fade-in">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Scientific Chart section */}
      {!loading && !error && (
        <EemChart data={eemData} />
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="space-y-4">
          <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Prediction History Table */}
      {!loading && !error && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Past Screenings</h2>
          {records.length === 0 ? (
            <div className="text-center py-20 card shadow-card">
              <p className="text-gray-400 text-base mb-2">No predictions yet</p>
              <p className="text-gray-400 text-sm mb-6">Upload a UV image to get started.</p>
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-olive-500 text-white text-sm font-semibold hover:bg-olive-600 transition-colors"
              >
                Analyze a sample
              </Link>
            </div>
          ) : (
            <div className="card shadow-card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Prediction history table">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">File</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Result</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Purity</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => (
                      <tr
                        key={rec.id}
                        className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${rowBg(rec.label)}`}
                        onClick={() => setSelected(rec)}
                        tabIndex={0}
                        role="button"
                        onKeyDown={(e) => e.key === 'Enter' && setSelected(rec)}
                        aria-label={`View details for record ${rec.id}`}
                      >
                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{formatDate(rec.timestamp)}</td>
                        <td className="px-5 py-3.5 text-gray-700 font-mono text-xs max-w-[120px] truncate">{rec.filename}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            rec.label === 'pure'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {rec.label === 'pure' ? '✓ Pure' : '⚠ Adulterated'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{rec.purity_score}%</td>
                        <td className="px-5 py-3.5 text-right text-gray-600">{rec.confidence.toFixed(1)}%</td>
                        <td className="px-5 py-3.5"><RiskBadge level={rec.risk_level} size="sm" /></td>
                        <td className="px-5 py-3.5 text-olive-400 hover:text-olive-600">
                          <ExternalLink size={14} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Detail modal                                                         */}
      {/* ------------------------------------------------------------------ */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Record details"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              id="modal-close-btn"
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Modal header */}
            <div className={`-mx-6 -mt-6 px-6 py-5 rounded-t-2xl mb-5 text-white ${
              selected.label === 'pure'
                ? 'bg-gradient-to-r from-olive-700 to-olive-500'
                : 'bg-gradient-to-r from-red-800 to-red-500'
            }`}>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Analysis Result</p>
              <p className="text-4xl font-extrabold">{selected.purity_score}%</p>
              <p className="text-sm mt-1 opacity-90">
                {selected.label === 'pure' ? 'Likely authentic EVOO ✓' : 'Possible adulteration ⚠️'}
              </p>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { label: 'Confidence',   value: `${selected.confidence.toFixed(1)}%` },
                { label: 'Adulteration', value: `${selected.adulteration_pct}%` },
                { label: 'Risk Level',   value: <RiskBadge level={selected.risk_level} size="sm" /> },
                { label: 'Fluorescence', value: selected.fluorescence_intensity.toFixed(1) },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <div className="text-sm font-semibold text-gray-900">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Recommendation */}
            <div className="bg-olive-50 border border-olive-100 rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-olive-600 mb-1 uppercase tracking-wide">Recommendation</p>
              <p className="text-sm text-gray-700 leading-relaxed">{selected.recommendation}</p>
            </div>

            {/* Meta */}
            <div className="flex justify-between text-xs text-gray-400">
              <span>File: <span className="font-mono">{selected.filename}</span></span>
              <span>{formatDate(selected.timestamp)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
