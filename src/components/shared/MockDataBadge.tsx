import { FlaskConical, Info } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { tx } from '../../i18n/tx';

/**
 * Mock veri işareti — kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "Planned"
 * yer tutucu sayfalar adına uygun MOCK içerikle dolduruldu. Bu rozet ve uyarı
 * kutusu, gösterilen rakamların ölçülmüş/canlı veri OLMADIĞINI her sayfada
 * görünür kılar. Kaynak: src/data/mock/*.ts (`*_MOCK_PROVENANCE`).
 */
export function MockDataBadge({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 ${className}`}
    >
      <FlaskConical className="w-3 h-3" aria-hidden="true" />
      {tx(t, 'mock.badge', 'Mock data')}
    </span>
  );
}

export function MockDataNotice({ text }: { text?: string }) {
  const { t } = useLanguage();
  return (
    <div
      role="note"
      className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
    >
      <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        {text ??
          tx(
            t,
            'mock.notice',
            'All values on this page are mock data for design and demonstration only — not measured, not calibrated and not connected to KAM/JPB systems.',
          )}
      </span>
    </div>
  );
}
