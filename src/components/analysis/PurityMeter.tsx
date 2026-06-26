// ============================================================
// PurityMeter — Hero Circular Gauge Component
// ============================================================
// THE hero visual — an animated circular SVG gauge showing
// purity 0-100%. Color transitions based on score threshold.
// Animated from 0 to target value with glow effects.
// ============================================================

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import type { AnalysisStatus } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';

interface PurityMeterProps {
  /** Purity score 0-100 */
  score: number;
  /** Status classification */
  status: AnalysisStatus;
  /** Whether to animate the gauge fill */
  shouldAnimate?: boolean;
  /** Size of the gauge in pixels */
  size?: number;
  className?: string;
}

/** Get color config based on score thresholds */
function getScoreColors(score: number) {
  if (score > 70) {
    return {
      stroke: '#4A7C59',
      glow: '0 0 60px rgba(74, 124, 89, 0.4)',
      glowInner: '0 0 30px rgba(74, 124, 89, 0.2)',
      bg: 'rgba(74, 124, 89, 0.08)',
      label: 'Excellent Purity',
      labelAr: 'نقاء ممتاز',
    };
  }
  if (score >= 40) {
    return {
      stroke: '#D4843A',
      glow: '0 0 60px rgba(212, 132, 58, 0.4)',
      glowInner: '0 0 30px rgba(212, 132, 58, 0.2)',
      bg: 'rgba(212, 132, 58, 0.08)',
      label: 'Possible Adulteration',
      labelAr: 'احتمال غش',
    };
  }
  return {
    stroke: '#B33A3A',
    glow: '0 0 60px rgba(179, 58, 58, 0.4)',
    glowInner: '0 0 30px rgba(179, 58, 58, 0.2)',
    bg: 'rgba(179, 58, 58, 0.08)',
    label: 'Adulteration Detected',
    labelAr: 'تم كشف الغش',
  };
}

export default function PurityMeter({
  score,
  status,
  shouldAnimate = true,
  size = 280,
  className = '',
}: PurityMeterProps) {
  const colors = getScoreColors(score);

  // SVG circle math
  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animated counter
  const motionValue = useMotionValue(0);
  const displayValue = useTransform(motionValue, (v) => Math.round(v));
  const [displayNumber, setDisplayNumber] = useState(shouldAnimate ? 0 : score);

  // Animated dashoffset
  const targetOffset = circumference - (score / 100) * circumference;
  const [dashOffset, setDashOffset] = useState(shouldAnimate ? circumference : targetOffset);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayNumber(score);
      setDashOffset(targetOffset);
      return;
    }

    // Animate counter
    const controls = animate(motionValue, score, {
      duration: 1.8,
      ease: 'easeOut',
    });

    const unsubscribe = displayValue.on('change', (v) => {
      setDisplayNumber(Math.round(v));
    });

    // Animate dashoffset with a slight delay for drama
    const timer = setTimeout(() => {
      setDashOffset(targetOffset);
    }, 100);

    return () => {
      controls.stop();
      unsubscribe();
      clearTimeout(timer);
    };
  }, [score, shouldAnimate, motionValue, displayValue, targetOffset, circumference]);

  const center = size / 2;

  return (
    <motion.div
      initial={shouldAnimate ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`flex flex-col items-center gap-4 ${className}`}
    >
      {/* Gauge container with glow */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background glow */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: colors.bg, transform: 'scale(1.2)' }}
        />

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="relative z-10 -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Animated progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: shouldAnimate ? 'stroke-dashoffset 1.8s ease-out' : 'none',
              filter: `drop-shadow(${colors.glowInner})`,
            }}
          />

          {/* Tick marks for scale */}
          {[...Array(20)].map((_, i) => {
            const angle = (i / 20) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const isMajor = i % 5 === 0;
            const innerR = radius - (isMajor ? 18 : 14);
            const outerR = radius - 10;
            return (
              <line
                key={i}
                x1={center + innerR * Math.cos(rad)}
                y1={center + innerR * Math.sin(rad)}
                x2={center + outerR * Math.cos(rad)}
                y2={center + outerR * Math.sin(rad)}
                stroke="rgba(0,0,0,0.1)"
                strokeWidth={isMajor ? 1.5 : 0.75}
              />
            );
          })}
        </svg>

        {/* Center content (not rotated) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          {/* Percentage number */}
          <motion.span
            initial={shouldAnimate ? { scale: 0.5 } : false}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            className="font-mono font-bold leading-none"
            style={{
              fontSize: size * 0.22,
              color: colors.stroke,
              textShadow: colors.glowInner,
            }}
          >
            {displayNumber}
            <span className="text-[0.4em] opacity-60 ml-0.5">%</span>
          </motion.span>

          {/* Label */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xs font-medium text-dark/50 mt-1"
          >
            Purity Score
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="font-arabic text-[10px] text-dark/40"
          >
            درجة النقاء
          </motion.span>
        </div>
      </div>

      {/* Status description */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="text-center space-y-2"
      >
        <StatusBadge status={status} size="lg" />
        <p className="text-sm text-dark/50">{colors.label}</p>
        <p className="font-arabic text-xs text-dark/40">{colors.labelAr}</p>
      </motion.div>
    </motion.div>
  );
}
