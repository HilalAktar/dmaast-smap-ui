import { AlertTriangle, AlertCircle, Info, Clock, Check } from 'lucide-react';
import Tooltip from './Tooltip';
import { useLanguage } from '../../contexts/LanguageContext';
import { tAlertTitle, tAlertMessage, tTimeAgo } from '../../i18n/dataLabels';
import type { Alert, AlertSeverity } from '../../types';

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  compact?: boolean;
}

const severityConfig: Record<AlertSeverity, { icon: React.ElementType; bg: string; border: string; text: string }> = {
  critical: { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  warning: { icon: AlertCircle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
};

export default function AlertCard({ alert, onAcknowledge, compact = false }: AlertCardProps) {
  const { t } = useLanguage();
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  // Veri-kaynaklı etiket i18n (dataLabels deseni): başlık/metin aktif dile
  // bağlanır, ölçülen sayılar/ERP kodları çeviride aynen korunur.
  const title = tAlertTitle(t, alert);
  const message = tAlertMessage(t, alert);

  return (
    <div
      className={`rounded-lg border ${config.bg} ${config.border} ${alert.acknowledged ? 'opacity-60' : ''} overflow-hidden`}
      style={{ maxHeight: compact ? '120px' : '150px' }}
    >
      <div className={`${compact ? 'p-3' : 'p-4'} h-full flex flex-col`}>
        <div className="flex items-start gap-3 flex-1 min-h-0">
          <div className={`p-1.5 rounded-full ${config.bg} flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${config.text}`} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-2 flex-shrink-0">
              <h4
                className={`font-medium text-sm ${config.text} line-clamp-1`}
                title={title}
              >
                {title}
              </h4>
              <span className="text-xs text-surface-500 whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {tTimeAgo(t, alert.timestamp)}
              </span>
            </div>

            <p
              className={`text-sm text-surface-600 mt-1 ${compact ? 'line-clamp-2' : 'line-clamp-2'} overflow-hidden`}
              title={message}
            >
              {message}
            </p>

            <div className="flex items-center justify-between mt-auto pt-2 flex-shrink-0">
              <span className="text-xs text-surface-500 max-w-[150px] break-words lite-hide" title={alert.source}>
                {t('common.source')}: {alert.source}
              </span>
              {!alert.acknowledged && onAcknowledge && (
                <Tooltip content={t('alerts.acknowledge')}>
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="flex items-center gap-1 text-xs text-surface-600 hover:text-surface-900 transition-colors flex-shrink-0 ml-2"
                  >
                    <Check className="w-3 h-3" />
                    Ack
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
