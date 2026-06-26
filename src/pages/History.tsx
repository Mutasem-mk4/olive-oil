// ============================================================
// History — Analysis History Dashboard
// ============================================================
// Lists past analyses with filter buttons, mini gauges,
// status badges, CSV export, and empty state illustration.
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalysisStore } from '@/store/analysisStore';
import StatusBadge from '@/components/shared/StatusBadge';
import type { AnalysisStatus, AnalysisResult } from '@/types';

type FilterType = 'all' | AnalysisStatus;

const FILTERS: { key: FilterType; label: string; labelAr: string }[] = [
  { key: 'all', label: 'All', labelAr: 'الكل' },
  { key: 'pure', label: 'Pure', labelAr: 'نقي' },
  { key: 'warning', label: 'Warning', labelAr: 'تحذير' },
  { key: 'adulterated', label: 'Adulterated', labelAr: 'مغشوش' },
];

function MiniGauge({ score }: { score: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score > 70 ? '#4A7C59' : score >= 40 ? '#D4843A' : '#B33A3A';

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text
        x="22"
        y="22"
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 origin-center"
        fill={color}
        fontSize="11"
        fontWeight="bold"
        fontFamily="IBM Plex Mono, monospace"
      >
        {score}
      </text>
    </svg>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function exportCSV(history: AnalysisResult[]) {
  const headers = ['ID', 'Sample Name', 'Purity Score', 'Status', 'Adulterant', 'Confidence', 'Timestamp'];
  const rows = history.map((r) => [
    r.id,
    r.sampleName || 'Unknown',
    r.purityScore.toString(),
    r.status,
    r.adulterantDetected || 'None',
    (r.confidence * 100).toFixed(1) + '%',
    r.timestamp,
  ]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zaytoun-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function History() {
  const { history, fetchHistory } = useAnalysisStore();
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filtered = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filter === 'all') return sorted;
    return sorted.filter((r) => r.status === filter);
  }, [history, filter]);

  return (
    <div className="min-h-screen gradient-mesh px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-dark mb-2">
            Analysis History
          </h1>
          <p className="font-arabic text-lg text-dark/50">سجل التحليل</p>
        </motion.div>

        {history.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-12 sm:p-16 text-center"
          >
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="text-7xl mb-6 block"
            >
              🫒
            </motion.div>
            <h3 className="font-display text-2xl font-bold text-dark mb-3">
              No Analyses Yet
            </h3>
            <p className="font-arabic text-base text-dark/50 mb-4">
              لا توجد تحليلات بعد
            </p>
            <p className="text-sm text-dark/40 max-w-sm mx-auto mb-8">
              Run your first olive oil purity analysis to see results here. Start with a demo scenario!
            </p>
            <a
              href="/capture"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-olive text-white font-semibold hover:scale-105 transition-transform"
            >
              🔬 Start First Analysis
            </a>
          </motion.div>
        ) : (
          <>
            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
            >
              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      filter === f.key
                        ? 'gradient-olive text-white shadow-md'
                        : 'glass text-dark/60 hover:text-dark'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Export */}
              <button
                onClick={() => exportCSV(history)}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium glass text-dark/60 hover:text-dark transition-all"
              >
                📊 Export CSV
              </button>
            </motion.div>

            {/* Results Count */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-dark/40 mb-4"
            >
              Showing {filtered.length} of {history.length} analyses
              {' / '}
              <span className="font-arabic">
                عرض {filtered.length} من {history.length} تحليل
              </span>
            </motion.p>

            {/* List */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.97 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 25 }}
                    layout
                    className="glass rounded-xl p-4 sm:p-5 flex items-center gap-4 group hover:shadow-lg transition-shadow"
                  >
                    {/* Mini Gauge */}
                    <div className="shrink-0">
                      <MiniGauge score={result.purityScore} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="font-display text-base font-bold text-dark truncate">
                          {result.sampleName || 'Unknown Sample'}
                        </h4>
                        <StatusBadge status={result.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-dark/40">
                          {formatDate(result.timestamp)}
                        </span>
                        {result.adulterantDetected && (
                          <span className="text-xs text-danger/70">
                            ⚠ {result.adulterantDetected}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <span className="font-mono text-lg font-bold text-dark">
                        {result.purityScore}%
                      </span>
                      <p className="text-[10px] text-dark/30">confidence {Math.round(result.confidence * 100)}%</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
