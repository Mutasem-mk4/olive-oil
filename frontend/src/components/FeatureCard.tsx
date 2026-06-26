import type { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  description?: string;
  accent?: boolean;
}

export default function FeatureCard({ icon, title, value, description, accent }: FeatureCardProps) {
  return (
    <div
      className={`card shadow-card flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        accent ? 'border-olive-200' : ''
      }`}
    >
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${
        accent ? 'bg-olive-50 text-olive-500' : 'bg-gray-50 text-gray-500'
      }`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{title}</p>
        <p className={`text-2xl font-bold ${accent ? 'text-olive-600' : 'text-gray-900'}`}>{value}</p>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      </div>
    </div>
  );
}
