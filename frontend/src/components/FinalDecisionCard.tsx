import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { FinalDecision } from '../types';

interface FinalDecisionCardProps {
  decision: FinalDecision;
}

export default function FinalDecisionCard({ decision }: FinalDecisionCardProps) {
  const isAuthentic = decision.status === 'authentic';
  const isAdulterated = decision.status === 'adulterated';
  const Icon = isAuthentic ? CheckCircle2 : isAdulterated ? ShieldAlert : AlertTriangle;
  const theme = isAuthentic
    ? {
        card: 'bg-olive-50 border-olive-200',
        icon: 'text-olive-600',
        label: 'text-olive-500',
        value: 'text-olive-600',
        meter: 'bg-olive-500',
      }
    : isAdulterated
      ? {
          card: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          label: 'text-red-700',
          value: 'text-red-700',
          meter: 'bg-red-500',
        }
      : {
          card: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          label: 'text-yellow-700',
          value: 'text-yellow-700',
          meter: 'bg-yellow-500',
        };
  const agreementLabel = decision.agreement.replace(/_/g, ' ');

  return (
    <div className={`p-6 rounded-2xl border shadow-sm ${theme.card}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-white ${theme.icon}`}>
            <Icon size={26} />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${theme.label}`}>Final decision</p>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1">{decision.label}</h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{decision.message}</p>
            <p className="text-xs text-gray-500 mt-2 capitalize">
              Agreement: {agreementLabel}
            </p>
          </div>
        </div>
        <div className="min-w-[150px]">
          <div className="text-left sm:text-right">
            <p className={`text-3xl font-extrabold ${theme.value}`}>{decision.confidence.toFixed(1)}%</p>
            <p className="text-[10px] uppercase font-bold tracking-wide text-gray-400 mt-1">Fluorescence confidence</p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/80 overflow-hidden border border-white">
            <div
              className={`h-full rounded-full ${theme.meter}`}
              style={{ width: `${Math.max(0, Math.min(100, decision.confidence))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
