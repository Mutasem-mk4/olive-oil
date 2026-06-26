// ============================================================
// Results — Full Analysis Results Display Page
// ============================================================
// Displays PurityMeter, ResultCard, AdultMap, and action buttons.
// Includes drop→checkmark SVG animation for pure results.
// ============================================================

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAnalysisStore } from '@/store/analysisStore';
import PurityMeter from '@/components/analysis/PurityMeter';
import ResultCard from '@/components/analysis/ResultCard';
import AdultMap from '@/components/analysis/AdultMap';

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

/** SVG animation: oil drop morphing into a checkmark for pure results */
function PureCheckAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 2, type: 'spring', stiffness: 200 }}
      className="flex items-center justify-center"
    >
      <svg width="64" height="64" viewBox="0 0 64 64" className="drop-shadow-lg">
        {/* Background circle */}
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="#4A7C59"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 2.2, ease: 'easeOut' }}
        />
        {/* Checkmark */}
        <motion.path
          d="M20 32 L28 40 L44 24"
          fill="none"
          stroke="#4A7C59"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 2.8, ease: 'easeOut' }}
        />
        {/* Olive drop shape fading out */}
        <motion.ellipse
          cx="32"
          cy="30"
          rx="10"
          ry="14"
          fill="#C9A84C"
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.8, delay: 2 }}
        />
      </svg>
    </motion.div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const { currentResult, currentBreakdown, clearResult } = useAnalysisStore();

  // Redirect if no result
  useEffect(() => {
    if (!currentResult) {
      navigate('/capture', { replace: true });
    }
  }, [currentResult, navigate]);

  if (!currentResult) return null;

  return (
    <div className="min-h-screen gradient-mesh px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="show">
          {/* Page Header */}
          <motion.div variants={fadeUp} className="text-center mb-10">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-dark mb-2">
              Analysis Results
            </h1>
            <p className="font-arabic text-lg text-dark/50">نتائج التحليل</p>
          </motion.div>

          {/* Pure check animation */}
          <AnimatePresence>
            {currentResult.status === 'pure' && (
              <motion.div variants={fadeUp} className="mb-6">
                <PureCheckAnimation />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Purity Meter — Hero */}
          <motion.div variants={fadeUp} className="flex justify-center mb-12">
            <PurityMeter
              score={currentResult.purityScore}
              status={currentResult.status}
              shouldAnimate
              size={280}
            />
          </motion.div>

          {/* Result Card */}
          <motion.div variants={fadeUp} className="mb-8">
            <ResultCard result={currentResult} />
          </motion.div>

          {/* Oil Breakdown */}
          {currentBreakdown.length > 0 && (
            <motion.div variants={fadeUp} className="mb-10">
              <AdultMap breakdowns={currentBreakdown} />
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              to="/certificate"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl gradient-gold text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <span className="text-lg">📜</span>
              Generate Certificate
            </Link>
            <Link
              to="/capture"
              onClick={() => clearResult()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border-2 border-primary/20 text-primary font-semibold text-base hover:bg-primary/5 transition-all hover:scale-105 active:scale-95"
            >
              <span className="text-lg">🔄</span>
              Analyze Another
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
