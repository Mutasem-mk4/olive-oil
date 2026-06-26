// ============================================================
// ResultCard — Glass-morphism Analysis Result Display
// ============================================================
// Full card showing analysis results with staggered animation.
// Shows sample name, adulterant, confidence, tags, and timestamps.
// ============================================================

import { motion, type Variants } from 'framer-motion';
import type { AnalysisResult } from '@/types';

interface ResultCardProps {
  result: AnalysisResult;
  className?: string;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ResultCard({ result, className = '' }: ResultCardProps) {
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={`glass rounded-2xl p-6 sm:p-8 ${className}`}
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-dark">
            {result.sampleName || 'Unknown Sample'}
          </h3>
          <p className="font-arabic text-sm text-dark/50 mt-0.5">
            {result.sampleName ? 'اسم العينة' : 'عينة غير معروفة'}
          </p>
        </div>
        <span className="text-xs text-dark/40 font-mono shrink-0 ml-4">
          {formatTimestamp(result.timestamp)}
        </span>
      </motion.div>

      {/* Image Preview */}
      {result.imageUrl && (
        <motion.div
          variants={item}
          className="relative aspect-video w-full rounded-xl overflow-hidden mb-5 border border-dark/15 shadow-inner bg-black/5"
        >
          <img
            src={result.imageUrl}
            alt={result.sampleName || 'Oil sample'}
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}

      {/* Analysis ID */}
      <motion.div variants={item} className="flex items-center gap-2 mb-5">
        <span className="text-xs text-dark/40">ID:</span>
        <code className="font-mono text-xs bg-dark/5 px-2 py-0.5 rounded text-dark/60">
          {result.id}
        </code>
      </motion.div>

      {/* Adulterant detected */}
      <motion.div
        variants={item}
        className={`flex items-center gap-3 p-4 rounded-xl mb-5 ${
          result.adulterantDetected
            ? 'bg-danger/8 border border-danger/15'
            : 'bg-success/8 border border-success/15'
        }`}
      >
        <span className="text-2xl">{result.adulterantDetected ? '⚠️' : '✅'}</span>
        <div>
          <p className="text-sm font-semibold text-dark">
            {result.adulterantDetected || 'No adulterants detected'}
          </p>
          <p className="font-arabic text-xs text-dark/50 mt-0.5">
            {result.adulterantDetected ? 'تم كشف مادة مغشوشة' : 'لا توجد مواد مغشوشة'}
          </p>
        </div>
      </motion.div>

      {/* Confidence bar */}
      <motion.div variants={item} className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-dark/70">
            Confidence / <span className="font-arabic">الثقة</span>
          </span>
          <span className="font-mono text-sm font-bold text-dark">
            {confidencePct}%
          </span>
        </div>
        <div className="h-3 bg-dark/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
            className="h-full rounded-full gradient-gold"
          />
        </div>
      </motion.div>

      {/* Tags */}
      <motion.div variants={item}>
        <p className="text-xs text-dark/40 mb-2">
          Classification Tags / <span className="font-arabic">علامات التصنيف</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {result.tags.map((tag, index) => (
            <motion.span
              key={tag}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + index * 0.1, type: 'spring', stiffness: 300 }}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/10"
            >
              {tag.replace(/_/g, ' ')}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
