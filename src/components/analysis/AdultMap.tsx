// ============================================================
// AdultMap — Oil Composition Breakdown Visualization
// ============================================================
// Horizontal stacked bar showing oil type percentages with
// animated widths and a color-coded legend.
// ============================================================

import { motion } from 'framer-motion';
import type { OilBreakdown } from '@/types';

interface AdultMapProps {
  breakdowns: OilBreakdown[];
  className?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const legendItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function AdultMap({ breakdowns, className = '' }: AdultMapProps) {
  if (breakdowns.length === 0) return null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={`glass rounded-2xl p-6 sm:p-8 ${className}`}
    >
      {/* Title */}
      <motion.div variants={legendItem} className="mb-6">
        <h3 className="font-display text-lg font-bold text-dark">
          Oil Composition Breakdown
        </h3>
        <p className="font-arabic text-sm text-dark/50 mt-0.5">
          تحليل تركيبة الزيت
        </p>
      </motion.div>

      {/* Stacked bar */}
      <motion.div
        variants={legendItem}
        className="h-10 sm:h-12 rounded-xl overflow-hidden flex bg-dark/5 mb-6"
      >
        {breakdowns.map((item, index) => (
          <motion.div
            key={item.type}
            initial={{ width: 0 }}
            animate={{ width: `${item.percentage}%` }}
            transition={{
              duration: 1,
              ease: 'easeOut',
              delay: 0.3 + index * 0.15,
            }}
            className="relative h-full flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: item.color }}
            title={`${item.type}: ${item.percentage}%`}
          >
            {/* Percentage label (only show if > 10%) */}
            {item.percentage > 10 && (
              <span className="font-mono text-xs font-bold text-white drop-shadow-md">
                {item.percentage}%
              </span>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {breakdowns.map((item) => (
          <motion.div
            key={item.type}
            variants={legendItem}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-dark/3 transition-colors"
          >
            {/* Color dot */}
            <div
              className="w-4 h-4 rounded-full shrink-0 ring-2 ring-white"
              style={{ backgroundColor: item.color }}
            />

            {/* Label and percentage */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-dark truncate">
                  {item.type}
                </span>
                <span className="font-mono text-sm font-bold text-dark/70 shrink-0">
                  {item.percentage}%
                </span>
              </div>

              {/* Mini progress bar */}
              <div className="mt-1 h-1 bg-dark/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.6 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
