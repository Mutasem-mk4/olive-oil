// ============================================================
// OliveLogo — Zaytoun Vision SVG Logo Component
// ============================================================
// An elegant, minimal olive branch with leaves and olives.
// Uses primary green (#2D5016) and accent gold (#C9A84C).
// ============================================================

import { motion } from 'framer-motion';

interface OliveLogoProps {
  /** Size in pixels (width = size, height auto-scales) */
  size?: number;
  /** Optional className override */
  className?: string;
  /** Whether to animate on mount */
  animate?: boolean;
}

export default function OliveLogo({ size = 48, className = '', animate = true }: OliveLogoProps) {
  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Zaytoun Vision olive branch logo"
    >
      {/* Main branch stem */}
      <path
        d="M12 52 C20 44, 28 36, 36 28 C40 24, 46 18, 52 14"
        stroke="#2D5016"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left lower leaf */}
      <ellipse
        cx="18"
        cy="46"
        rx="6"
        ry="3"
        transform="rotate(-35 18 46)"
        fill="#2D5016"
        opacity="0.9"
      />

      {/* Middle-left leaf */}
      <ellipse
        cx="26"
        cy="38"
        rx="7"
        ry="3"
        transform="rotate(-50 26 38)"
        fill="#2D5016"
        opacity="0.85"
      />

      {/* Middle-right leaf (upper side) */}
      <ellipse
        cx="33"
        cy="34"
        rx="6"
        ry="2.8"
        transform="rotate(30 33 34)"
        fill="#4A7C59"
        opacity="0.8"
      />

      {/* Upper-left leaf */}
      <ellipse
        cx="38"
        cy="26"
        rx="7"
        ry="3"
        transform="rotate(-45 38 26)"
        fill="#2D5016"
        opacity="0.9"
      />

      {/* Top leaf */}
      <ellipse
        cx="46"
        cy="20"
        rx="6"
        ry="2.5"
        transform="rotate(35 46 20)"
        fill="#4A7C59"
        opacity="0.85"
      />

      {/* Small tip leaf */}
      <ellipse
        cx="50"
        cy="16"
        rx="4"
        ry="2"
        transform="rotate(-40 50 16)"
        fill="#2D5016"
        opacity="0.7"
      />

      {/* Olive 1 — large gold */}
      <circle cx="22" cy="42" r="3.5" fill="#C9A84C" />
      <circle cx="21" cy="41" r="1" fill="#d4b96a" opacity="0.6" />

      {/* Olive 2 — medium gold */}
      <circle cx="40" cy="22" r="3" fill="#C9A84C" />
      <circle cx="39" cy="21" r="0.8" fill="#d4b96a" opacity="0.6" />

      {/* Olive 3 — small accent */}
      <circle cx="30" cy="32" r="2.5" fill="#a88a32" opacity="0.85" />
      <circle cx="29.2" cy="31.2" r="0.7" fill="#d4b96a" opacity="0.5" />

      {/* Leaf veins for detail */}
      <line x1="23" y1="38" x2="29" y2="38" stroke="#1e3a0e" strokeWidth="0.5" opacity="0.3" />
      <line x1="35" y1="26" x2="41" y2="26" stroke="#1e3a0e" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );

  if (!animate) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        {svgContent}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`inline-flex items-center ${className}`}
    >
      {svgContent}
    </motion.div>
  );
}
