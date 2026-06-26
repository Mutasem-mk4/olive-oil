interface RiskBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
}

const CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  low: {
    label: 'Low Risk',
    bg:   'bg-green-50',
    text: 'text-green-700',
    dot:  'bg-green-500',
  },
  medium: {
    label: 'Medium Risk',
    bg:   'bg-amber-50',
    text: 'text-amber-700',
    dot:  'bg-amber-500',
  },
  high: {
    label: 'High Risk',
    bg:   'bg-red-50',
    text: 'text-red-700',
    dot:  'bg-red-500',
  },
};

export default function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const config = CONFIG[level.toLowerCase()] ?? CONFIG['medium'];
  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1.5'
    : size === 'lg'
    ? 'px-4 py-1.5 text-base gap-2'
    : 'px-3 py-1 text-sm gap-2';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
      {config.label}
    </span>
  );
}
