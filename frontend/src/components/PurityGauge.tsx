interface PurityGaugeProps {
  score: number; // 0-100
}

export default function PurityGauge({ score }: PurityGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color =
    clampedScore >= 75 ? '#1D9E75' :
    clampedScore >= 50 ? '#f59e0b' :
                         '#ef4444';

  return (
    <div className="w-full">
      {/* Score label */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Purity Score</span>
        <span className="text-sm font-semibold" style={{ color }}>{clampedScore}%</span>
      </div>

      {/* Track */}
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-fill transition-all"
          style={
            {
              '--target-width': `${clampedScore}%`,
              width: `${clampedScore}%`,
              backgroundColor: color,
            } as React.CSSProperties
          }
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">0%</span>
        <span className="text-xs text-gray-400">50%</span>
        <span className="text-xs text-gray-400">100%</span>
      </div>
    </div>
  );
}
