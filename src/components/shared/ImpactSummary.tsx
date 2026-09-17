import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, DollarSign, Zap, Leaf, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ImpactItem {
  id: string;
  label: string;
  change: number;
  unit?: string;
  category: 'cost' | 'production' | 'energy' | 'sustainability' | 'quality' | 'time' | 'other';
  higherIsBetter?: boolean;
  severity?: 'low' | 'medium' | 'high';
}

interface ImpactSummaryProps {
  impacts: ImpactItem[];
  title?: string;
  scenarioName?: string;
}

const categoryIcons: Record<string, LucideIcon> = {
  cost: DollarSign,
  production: Package,
  energy: Zap,
  sustainability: Leaf,
  quality: CheckCircle,
  time: AlertTriangle,
  other: TrendingUp,
};

export default function ImpactSummary({
  impacts,
  title = 'Key Impacts',
  scenarioName,
}: ImpactSummaryProps) {
  const getImpactStyle = (change: number, higherIsBetter = true) => {
    const isPositive = higherIsBetter ? change > 0 : change < 0;
    const isNeutral = Math.abs(change) < 0.5;

    if (isNeutral) {
      return {
        bg: 'bg-surface-100',
        border: 'border-surface-200',
        text: 'text-surface-600',
        icon: Minus,
      };
    }

    return {
      bg: isPositive ? 'bg-green-50' : 'bg-red-50',
      border: isPositive ? 'border-green-200' : 'border-red-200',
      text: isPositive ? 'text-green-700' : 'text-red-700',
      icon: change > 0 ? TrendingUp : TrendingDown,
    };
  };

  const getSeverityStyle = (severity?: string) => {
    switch (severity) {
      case 'high':
        return 'ring-2 ring-red-300 ring-offset-1';
      case 'medium':
        return 'ring-2 ring-amber-300 ring-offset-1';
      default:
        return '';
    }
  };

  const positiveImpacts = impacts.filter(i => {
    const isPositive = i.higherIsBetter !== false ? i.change > 0 : i.change < 0;
    return isPositive && Math.abs(i.change) >= 0.5;
  });

  const negativeImpacts = impacts.filter(i => {
    const isPositive = i.higherIsBetter !== false ? i.change > 0 : i.change < 0;
    return !isPositive && Math.abs(i.change) >= 0.5;
  });

  const neutralImpacts = impacts.filter(i => Math.abs(i.change) < 0.5);

  const overallScore = impacts.reduce((acc, impact) => {
    const weight = impact.severity === 'high' ? 3 : impact.severity === 'medium' ? 2 : 1;
    const effectiveChange = impact.higherIsBetter !== false ? impact.change : -impact.change;
    return acc + (effectiveChange * weight);
  }, 0) / impacts.length;

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="p-4 border-b border-surface-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-surface-900">{title}</h3>
            {scenarioName && (
              <p className="text-sm text-surface-500 mt-0.5">Scenario: {scenarioName}</p>
            )}
          </div>
          <div className={`px-3 py-1.5 rounded-lg ${
            overallScore > 2 ? 'bg-green-100 text-green-700' :
            overallScore < -2 ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            <span className="text-sm font-medium">
              {overallScore > 2 ? 'Positive Outlook' :
               overallScore < -2 ? 'Negative Outlook' :
               'Mixed Results'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {impacts.map(impact => {
            const style = getImpactStyle(impact.change, impact.higherIsBetter);
            const CategoryIcon = categoryIcons[impact.category] || TrendingUp;
            const ChangeIcon = style.icon;

            return (
              <div
                key={impact.id}
                className={`p-3 rounded-lg border ${style.bg} ${style.border} ${getSeverityStyle(impact.severity)}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CategoryIcon className="w-4 h-4 text-surface-500" />
                  <span className="text-xs text-surface-600 min-w-0 break-words">{impact.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChangeIcon className={`w-5 h-5 ${style.text}`} />
                  <span className={`text-lg font-bold ${style.text}`}>
                    {impact.change > 0 ? '+' : ''}{impact.change.toFixed(1)}{impact.unit || '%'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-surface-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-green-50">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Improvements</span>
              </div>
              <span className="text-2xl font-bold text-green-700">{positiveImpacts.length}</span>
            </div>
            <div className="p-3 rounded-lg bg-red-50">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">Concerns</span>
              </div>
              <span className="text-2xl font-bold text-red-700">{negativeImpacts.length}</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-50">
              <div className="flex items-center justify-center gap-1 text-surface-600 mb-1">
                <Minus className="w-4 h-4" />
                <span className="text-sm font-medium">Unchanged</span>
              </div>
              <span className="text-2xl font-bold text-surface-700">{neutralImpacts.length}</span>
            </div>
          </div>
        </div>

        {(positiveImpacts.length > 0 || negativeImpacts.length > 0) && (
          <div className="mt-4 p-3 rounded-lg bg-surface-50 border border-surface-200">
            <h4 className="text-sm font-medium text-surface-700 mb-2">Summary Analysis</h4>
            <div className="space-y-1 text-sm text-surface-600">
              {positiveImpacts.length > 0 && (
                <p>
                  <span className="text-green-600 font-medium">Positive: </span>
                  {positiveImpacts.map(i => i.label).join(', ')}
                </p>
              )}
              {negativeImpacts.length > 0 && (
                <p>
                  <span className="text-red-600 font-medium">Attention needed: </span>
                  {negativeImpacts.map(i => i.label).join(', ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
