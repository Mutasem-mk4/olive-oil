import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, RefreshCw, X, Eye } from 'lucide-react';
import { fetchHistory, fetchEemFeatures } from '../api/client';
import type { HistoryRecord, EemFeatureRecord } from '../types';
import AgingChart from '../components/AgingChart';

export default function History() {
  const [records, setRecords]   = useState<HistoryRecord[]>([]);
  const [eemData, setEemData]   = useState<EemFeatureRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<HistoryRecord | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyData, eemFeaturesData] = await Promise.all([
        fetchHistory(),
        fetchEemFeatures(),
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

  // Color code based on verdict: green for authentic, red for fraud, yellow for inconclusive
  const getRowStyle = (verdict: string) => {
    if (verdict === 'authentic_evoo') {
      return 'bg-green-50/40 hover:bg-green-50/70 text-green-900 border-green-100';
    }
    if (verdict === 'industrial_seed_oil' || verdict === 'adulterated_blend') {
      return 'bg-red-50/30 hover:bg-red-50/60 text-red-900 border-red-100';
    }
    return 'bg-yellow-50/30 hover:bg-yellow-50/60 text-yellow-900 border-yellow-100';
  };

  const getBadgeStyle = (verdict: string) => {
    if (verdict === 'authentic_evoo') {
      return 'bg-green-100 text-green-800';
    }
    if (verdict === 'industrial_seed_oil' || verdict === 'adulterated_blend') {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Screening History & Reference Data</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last 20 UV screenings and scientific validation dataset.
          </p>
        </div>
        <button
          onClick={() => void load()}
          id="refresh-history-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors bg-white shadow-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Scientific Chart Section */}
          <AgingChart data={eemData} />

          {/* Past Screenings Table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Past Screenings</h2>
              <p className="text-xs text-gray-500 mt-0.5">Click any screening row to view detailed spectral values.</p>
            </div>

            {records.length === 0 ? (
              <div className="text-center py-16 px-4">
                <p className="text-gray-400 text-base mb-1">No screenings found</p>
                <p className="text-gray-400 text-xs mb-6">Start by uploading a UV sample photo.</p>
                <Link
                  to="/analyze"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-olive-500 text-white text-sm font-semibold hover:bg-olive-600 transition-colors shadow-sm"
                >
                  Analyze a sample
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Prediction history table">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left">
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">File Name</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Verdict</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Purity Index</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Confidence</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quality Grade</th>
                      <th className="px-6 py-3.5 text-center" />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => (
                      <tr
                        key={rec.id}
                        className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${getRowStyle(rec.verdict)}`}
                        onClick={() => setSelected(rec)}
                        tabIndex={0}
                        role="button"
                        onKeyDown={(e) => e.key === 'Enter' && setSelected(rec)}
                      >
                        <td className="px-6 py-4 text-xs font-medium whitespace-nowrap">{formatDate(rec.timestamp)}</td>
                        <td className="px-6 py-4 font-mono text-xs max-w-[150px] truncate">{rec.filename}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${getBadgeStyle(rec.verdict)}`}>
                            {rec.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {rec.purity_index !== null ? `${rec.purity_index.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-600">
                          {rec.confidence !== null ? `${rec.confidence.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium">
                          {rec.grade || <span className="text-gray-400">N/A</span>}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-400">
                          <Eye size={16} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 text-white ${
              selected.verdict === 'authentic_evoo'
                ? 'bg-gradient-to-r from-green-700 to-green-600'
                : selected.verdict === 'inconclusive'
                ? 'bg-gradient-to-r from-yellow-600 to-yellow-500'
                : 'bg-gradient-to-r from-red-700 to-red-600'
            }`}>
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-75">Detail Report</span>
              <h3 className="text-xl font-extrabold mt-1">{selected.label}</h3>
              <p className="text-xs opacity-75 mt-1">Analyzed: {formatDate(selected.timestamp)}</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Score & Confidence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Purity Index</span>
                  <p className="text-lg font-extrabold text-gray-900 mt-0.5">
                    {selected.purity_index !== null ? `${selected.purity_index.toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Confidence</span>
                  <p className="text-lg font-extrabold text-gray-900 mt-0.5">
                    {selected.confidence !== null ? `${selected.confidence.toFixed(1)}%` : '—'}
                  </p>
                </div>
              </div>

              {/* Grade info */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Quality Grade</span>
                <p className="text-sm font-bold text-gray-950 mt-1">{selected.grade || 'No Quality Grade'}</p>
                {selected.aging_step !== null && (
                  <p className="text-xs text-gray-500 mt-1">Estimated Degradation: Step {selected.aging_step} out of 9</p>
                )}
              </div>

              {/* Spectral Counts */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">Spectral Counts</span>
                
                {/* Red */}
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-red-600 flex items-center gap-1">🔴 Red 670nm</span>
                  <span className="font-mono text-gray-700 bg-red-50/50 px-2 py-0.5 rounded border border-red-100">
                    {selected.red_670nm.toFixed(1)} counts
                  </span>
                </div>

                {/* Green */}
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-green-600 flex items-center gap-1">🟢 Green 530nm</span>
                  <span className="font-mono text-gray-700 bg-green-50/50 px-2 py-0.5 rounded border border-green-100">
                    {selected.green_530nm.toFixed(1)} counts
                  </span>
                </div>

                {/* Blue */}
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-blue-600 flex items-center gap-1">🔵 Blue 440nm</span>
                  <span className="font-mono text-gray-700 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100">
                    {selected.blue_440nm.toFixed(1)} counts
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
                <span>File: <span className="font-mono">{selected.filename}</span></span>
                <span>Active pixels: {selected.nonzero_pixels?.toLocaleString()} px</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
