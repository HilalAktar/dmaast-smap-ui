import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type KpiTone = 'default' | 'positive' | 'negative' | 'warning';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  tone?: KpiTone;
}

// KPI card with a small colored semantic icon chip (top-right). Colour carries
// meaning via `tone`: default=blue, positive=green, negative=red, warning=amber.
export default function KpiCard({ label, value, sub, icon: Icon, tone = 'default' }: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-card--${tone}`}>
      {Icon && (
        <span className="kpi-card__icon">
          <Icon size={16} />
        </span>
      )}
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
