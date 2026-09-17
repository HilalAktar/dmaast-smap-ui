import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import Header from '../../components/layout/Header';
import FilterBar from '../../components/shared/FilterBar';
import KpiCard from '../../components/shared/KpiCard';
import ExportPanel from '../../components/shared/ExportPanel';
import { getVisibleKpis } from '../../data/pageLayouts';
import { usePageLayout } from '../../hooks/usePageLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { productionTrendData } from '../../data/mockData';

/* ---------------------------------------------------------------------------
 * OEE ve Makine Durumu — GERI ALINDI 2026-08-31 (Isil onayi).
 *
 * 2026-08-30'da "veri yok" gerekcesiyle cikarilmislardi. O gerekce ELIMIZDEKI
 * ERP IHRACI icin dogruydu, ama HEDEF VERI MODELI icin degil: KAM Data sources
 * belgesindeki `unit_states` yapisi PackML durumu + UnitMode (Production ·
 * Maintenance · Manual · Changeover) tasiyor, yani Availability'yi saglıyor.
 * Ayrica OEE'yi KAM tarafinda koordinator (IDE), JPB tarafinda JPB kendisi
 * KPI tablosuna eklemis.
 *
 * 🔴 UYDURMA RAKAM YOK. Bu kartlar bilerek DEGER GOSTERMIYOR; her bacagin
 * arkasindaki kaynagi ve o kaynagin bugun bagli olup olmadigini gosteriyorlar.
 * Amac kapsam sorusunu cevaplamak: "boyle bir veri API'dan gelse arayuzde
 * karsiligi var mi?" — evet, yeri burasi.
 * Denetim: work/smap-arayuz/02-kpi-veri-kaynagi-denetimi.md
 * ------------------------------------------------------------------------- */

interface SourceLeg {
  label: string;
  /** Bugun bagli mi — ERP ihracindan hesaplanabiliyor mu */
  connected: boolean;
  /** Arkasindaki gercek tablo/alan */
  source: string;
  note: string;
}

const OEE_LEGS: SourceLeg[] = [
  {
    label: 'Availability',
    connected: false,
    source: 'unit_states — modes.production vs modes.maintenance / changeover',
    note: 'Arrives with the equipment stream (Kafka). Not present in the ERP extract.',
  },
  {
    label: 'Performance',
    connected: true,
    source: 'JPB · POINT.TPSPASSE against GAMME planned time',
    note: 'Computable today from the shopfloor time tracking.',
  },
  {
    label: 'Quality',
    connected: true,
    source: 'JPB · POINT.NBPIEABIME / NBPIE · CtrlCommande.TypeDefaut',
    note: 'Computable today: 595,785 damaged of 1,025,229,565 produced (0.058%).',
  },
];

/** PackML UnitMode'lari — unit_states.modes altindaki dort mod */
const UNIT_MODES: SourceLeg[] = [
  { label: 'Production', connected: false, source: 'unit_states.modes.production', note: 'Normal production mode.' },
  { label: 'Maintenance', connected: false, source: 'unit_states.modes.maintenance', note: 'Equipment under maintenance.' },
  { label: 'Manual', connected: false, source: 'unit_states.modes.manual', note: 'Run under manual control.' },
  { label: 'Changeover', connected: false, source: 'unit_states.modes.changeover', note: 'Fixtures / components being changed.' },
];

/*
 * i18n eşlemeleri (T4.2). Veri dizileri (OEE_LEGS / UNIT_MODES / MATERIAL_READINESS)
 * DEĞİŞTİRİLMEDİ: sayılar, `source` provenance ve `connected` bayrakları korunur.
 * Yalnız görünen etiket/not/rozet metni çevrilir. Ölçülmüş rakam taşıyan Quality
 * notu map'te yer almaz → `leg.note` kaynak dilinde gösterilir.
 */
const legLabelKeys: Record<string, string> = {
  Availability: 'mfg.legAvailability',
  Performance: 'mfg.legPerformance',
  Quality: 'mfg.legQuality',
  Production: 'mfg.modeProduction',
  Maintenance: 'mfg.modeMaintenance',
  Manual: 'mfg.modeManual',
  Changeover: 'mfg.modeChangeover',
};
const legNoteKeys: Record<string, string> = {
  Availability: 'mfg.noteAvailability',
  Performance: 'mfg.notePerformance',
  Production: 'mfg.noteModeProduction',
  Maintenance: 'mfg.noteModeMaintenance',
  Manual: 'mfg.noteModeManual',
  Changeover: 'mfg.noteModeChangeover',
};
const matLabelKeys: Record<string, string> = {
  'Completely Issued': 'mfg.matCompletelyIssued',
  'Partially Issued': 'mfg.matPartiallyIssued',
  'Not Reserved': 'mfg.matNotReserved',
};

function SourceLegRow({ leg }: { leg: SourceLeg }) {
  const { t } = useLanguage();
  const labelKey = legLabelKeys[leg.label];
  const noteKey = legNoteKeys[leg.label];
  return (
    <div className="flex items-start gap-3 border-b border-surface-100 py-3 last:border-b-0">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          leg.connected ? 'bg-green-500' : 'bg-surface-300'
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-surface-900">{labelKey ? t(labelKey) : leg.label}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              leg.connected
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-surface-100 text-surface-500 border border-surface-200'
            }`}
          >
            {leg.connected ? t('mfg.sourceAvailable') : t('mfg.awaitingStream')}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-surface-600">{noteKey ? t(noteKey) : leg.note}</p>
        <p className="mt-1 font-mono text-xs text-surface-400">{leg.source}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * KAM — Material Readiness.
 * OLCULEN degerler: KAM IFS ihraci "Shop Orders  Assembly.xlsx", 970 is emri,
 * kolon "Shop Order Material Summary Status" (tekil = 3).
 * Bu kart uydurma sayi TASIMAZ; asagidaki adetler ham veriden sayilmistir.
 * ------------------------------------------------------------------------- */
const MATERIAL_READINESS = [
  { label: 'Completely Issued', count: 760, bar: 'bg-green-500' },
  { label: 'Partially Issued', count: 208, bar: 'bg-amber-500' },
  { label: 'Not Reserved', count: 2, bar: 'bg-red-500' },
];
const MATERIAL_READINESS_TOTAL = MATERIAL_READINESS.reduce((s, x) => s + x.count, 0);

/* ---------------------------------------------------------------------------
 * JPB — Actual vs Planned Hours.
 * OLCULEN toplamlar: TBL_GAMME (244.290 satir), GA_NBH (plan) / GA_NBHR (fiili),
 * COFRAIS (operasyon faz kodu) bazinda toplanmistir. Saat cinsinden.
 * DISARIDA BIRAKILANLAR: LIVRA (plan 147 s / fiili 50.551 s) ve OUV10
 * (plan 7 s / fiili 43.930 s) — bu fazlarda plan saati tutulmuyor, sapma anlamsiz.
 * ------------------------------------------------------------------------- */
const ACTUAL_VS_PLANNED = [
  { phase: 'USI10', planned: 165626, actual: 190455 },
  { phase: 'CONTR', planned: 66677, actual: 29144 },
  { phase: 'CARRE', planned: 26365, actual: 26066 },
  { phase: 'EBAVM', planned: 26019, actual: 24088 },
];

const cycleTimeData = [
  { station: 'Station 1', actual: 42, target: 45 },
  { station: 'Station 2', actual: 38, target: 40 },
  { station: 'Station 3', actual: 55, target: 50 },
  { station: 'Station 4', actual: 32, target: 35 },
  { station: 'Station 5', actual: 48, target: 45 },
];

export default function ManufacturingDT() {
  const { t } = useLanguage();
  const layout = usePageLayout('manufacturing');
  const visibleKpis = getVisibleKpis(layout.items);
  const showCharts = layout.isVisible('production-output');

  return (
    <div className="min-h-screen">
      <Header
        title={t('mfg.title')}
        subtitle={t('mfg.subtitle')}
      />
      <div className="flex items-center justify-between bg-white border-b border-surface-200">
        <div className="flex-1 min-w-0">
          <FilterBar showAutoRefresh={true} />
        </div>
        <div className="pr-4 flex-shrink-0">
          <ExportPanel
            reportTitle={t('mfg.exportReport')}
            onExport={(format, sections) => console.log('Exporting:', format, sections)}
          />
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6" id="printable-content">
        {visibleKpis.length > 0 && (
          <div className={`grid gap-4 ${
            visibleKpis.length >= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
            visibleKpis.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
            visibleKpis.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          }`}>
            {visibleKpis.map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        )}

        {showCharts && (
        <div className="grid grid-cols-3 gap-6">
          {layout.isVisible('production-output') && (
          <div className="col-span-3 bg-white rounded-xl shadow-card p-5">
            <h3 className="font-semibold text-surface-900 mb-4">{t('mfg.productionOutput')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#737373" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#737373" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="#0066b3" strokeWidth={2} name={t('dt.actual')}>
                  <LabelList dataKey="actual" position="top" fontSize={10} fill="#0066b3" offset={8} />
                </Line>
                  <Line type="monotone" dataKey="target" stroke="#d4d4d4" strokeWidth={2} strokeDasharray="5 5" name={t('dt.target')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}
        </div>
        )}

        {/* KAM — Material Readiness. Rakamlar KAM IFS ihracindan OLCULDU
            (Shop Orders Assembly, 970 is emri, 'Shop Order Material Summary Status'). */}
        {/* OEE — KPI tablolarinda tanimli (KAM: IDE · JPB: kendi). Deger yok, kaynak var. */}
        {layout.isVisible('oee-breakdown') && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-semibold text-surface-900">{t('mfg.oeeTitle')}</h3>
            <span className="text-xs text-surface-400">{t('mfg.oeeKpiBy')}</span>
          </div>
          <p className="mb-3 text-sm text-surface-500">
            {t('mfg.oeeDesc')}
          </p>
          <div>
            {OEE_LEGS.map((leg) => (
              <SourceLegRow key={leg.label} leg={leg} />
            ))}
          </div>
        </div>
        )}

        {/* Makine durumu — unit_states PackML modlari. */}
        {layout.isVisible('machine-status') && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-semibold text-surface-900">{t('mfg.machineStatus')}</h3>
            <span className="text-xs text-surface-400">unit_states · PackML</span>
          </div>
          <p className="mb-3 text-sm text-surface-500">
            {t('mfg.machineStatusDesc')}
          </p>
          <div>
            {UNIT_MODES.map((mode) => (
              <SourceLegRow key={mode.label} leg={mode} />
            ))}
          </div>
          <p className="mt-3 font-mono text-xs text-surface-400">
            KAM · unit_states — unit_name / unit_id / window_start / duration / modes / throttled / raw_states
          </p>
        </div>
        )}

        {layout.isVisible('material-readiness') && (
          <div className="bg-white rounded-xl shadow-card p-5">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold text-surface-900">{t('mfg.materialReadiness')}</h3>
              <span className="text-xs text-surface-400">
                {t('common.source')}: Shop Orders · Material Summary Status
              </span>
            </div>
            <p className="text-sm text-surface-500 mb-4">
              {t('mfg.materialReadinessDesc')}
            </p>

            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-100">
              {MATERIAL_READINESS.map((s) => (
                <div
                  key={s.label}
                  className={s.bar}
                  style={{ width: `${(s.count / MATERIAL_READINESS_TOTAL) * 100}%` }}
                  title={`${t(matLabelKeys[s.label])}: ${s.count}`}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MATERIAL_READINESS.map((s) => (
                <div key={s.label} className="rounded-lg border border-surface-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.bar}`} />
                    <span className="text-sm text-surface-600">{t(matLabelKeys[s.label])}</span>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-surface-900">{s.count}</p>
                  <p className="text-xs text-surface-500">
                    {t('mfg.pctOfTotal')
                      .replace('{pct}', ((s.count / MATERIAL_READINESS_TOTAL) * 100).toFixed(1))
                      .replace('{total}', String(MATERIAL_READINESS_TOTAL))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JPB — Actual vs Planned Hours. Toplamlar TBL_GAMME'den OLCULDU
            (GA_NBH plan / GA_NBHR fiili, COFRAIS bazinda). Plan saati tutulmayan
            operasyonlar (LIVRA, OUV*) disarida birakildi — sapma anlamsiz olurdu. */}
        {layout.isVisible('actual-vs-planned-hours') && (
          <div className="bg-white rounded-xl shadow-card p-5">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold text-surface-900">{t('mfg.actualVsPlanned')}</h3>
              <span className="text-xs text-surface-400">{t('common.source')}: Routing · GA_NBH / GA_NBHR</span>
            </div>
            <p className="text-sm text-surface-500 mb-4">
              {t('mfg.actualVsPlannedDesc')}
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ACTUAL_VS_PLANNED}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="phase" tick={{ fontSize: 12 }} stroke="#737373" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#737373" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="planned" fill="#a3a3a3" name={t('dt.planned')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#0066b3" name={t('dt.actual')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {layout.isVisible('cycle-time-analysis') && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="font-semibold text-surface-900 mb-4">{t('mfg.cycleTime')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="station" tick={{ fontSize: 12 }} stroke="#737373" />
                <YAxis tick={{ fontSize: 12 }} stroke="#737373" />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" fill="#0066b3" name={t('mfg.actualSec')} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="actual" position="top" fontSize={10} fill="#333" />
              </Bar>
                <Bar dataKey="target" fill="#d4d4d4" name={t('mfg.targetSec')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}
      </div>

    </div>
  );
}
