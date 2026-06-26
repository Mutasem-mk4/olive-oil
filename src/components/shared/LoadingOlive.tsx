// ============================================================
// LoadingOlive — Animated Olive Oil Drop Spinner
// ============================================================
// Animated loading indicator shaped like an olive oil drop.
// Uses the oil-drop CSS animation class with gold/olive colors.
// ============================================================

import { motion } from 'framer-motion';

interface LoadingOliveProps {
  /** Loading message displayed below the spinner */
  message?: string;
  /** Arabic loading message */
  messageAr?: string;
  /** Size of the oil drop in pixels */
  size?: number;
  className?: string;
}

export default function LoadingOlive({
  message = 'Analyzing...',
  messageAr = 'جاري التحليل...',
  size = 64,
  className = '',
}: LoadingOliveProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center gap-6 ${className}`}
    >
      {/* Oil drop spinner */}
      <div className="relative">
        {/* Glow behind the drop */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-accent/30 blur-xl"
          style={{ width: size * 1.5, height: size * 1.5, top: -size * 0.25, left: -size * 0.25 }}
        />

        {/* The animated oil drop */}
        <div
          className="animate-oil-drop relative"
          style={{
            width: size,
            height: size,
            background: 'linear-gradient(135deg, #C9A84C 0%, #a88a32 50%, #2D5016 100%)',
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          }}
        >
          {/* Shine highlight */}
          <div
            className="absolute rounded-full bg-white/30"
            style={{
              width: size * 0.25,
              height: size * 0.2,
              top: size * 0.2,
              left: size * 0.2,
            }}
          />
        </div>
      </div>

      {/* Loading message */}
      <div className="text-center space-y-1">
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-dark/70"
        >
          {message}
        </motion.p>
        <motion.p
          key={messageAr}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="font-arabic text-xs text-dark/50"
        >
          {messageAr}
        </motion.p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="w-2 h-2 rounded-full bg-accent"
          />
        ))}
      </div>
    </motion.div>
  );
}
