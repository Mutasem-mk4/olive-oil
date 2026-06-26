// ============================================================
// StatusBadge — Purity Status Indicator
// ============================================================
// Shows Pure/Warning/Adulterated with bilingual labels.
// Color-coded with Framer Motion entry animation.
// ============================================================

import { motion } from 'framer-motion';
import type { AnalysisStatus } from '@/types';

interface StatusBadgeProps {
  status: AnalysisStatus;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_CONFIG: Record<
  AnalysisStatus,
  { label: string; labelAr: string; bg: string; text: string; glow: string; icon: string }
> = {
  pure: {
    label: 'Pure',
    labelAr: 'نقي',
    bg: 'bg-success/15',
    text: 'text-success',
    glow: 'shadow-[0_0_12px_rgba(74,124,89,0.3)]',
    icon: '✓',
  },
  warning: {
    label: 'Warning',
    labelAr: 'تحذير',
    bg: 'bg-warning/15',
    text: 'text-warning',
    glow: 'shadow-[0_0_12px_rgba(212,132,58,0.3)]',
    icon: '⚠',
  },
  adulterated: {
    label: 'Adulterated',
    labelAr: 'مغشوش',
    bg: 'bg-danger/15',
    text: 'text-danger',
    glow: 'shadow-[0_0_12px_rgba(179,58,58,0.3)]',
    icon: '✗',
  },
};

const SIZE_CLASSES = {
  sm: 'px-2.5 py-0.5 text-xs gap-1',
  md: 'px-3.5 py-1.5 text-sm gap-1.5',
  lg: 'px-5 py-2 text-base gap-2',
};

export default function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bg} ${config.text} ${config.glow}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
    >
      <span className="leading-none">{config.icon}</span>
      <span className="font-semibold">{config.label}</span>
      <span className="font-arabic text-[0.85em] opacity-75">{config.labelAr}</span>
    </motion.div>
  );
}
