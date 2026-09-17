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
import { AlertTriangle, CheckCircle, Search, Layers } from 'lucide-react';
import Header from '../../components/layout/Header';
import HelpPopover from '../../components/shared/HelpPopover';
import FilterBar from '../../components/shared/FilterBar';
import KpiCard from '../../components/shared/KpiCard';
import { getVisibleKpis } from '../../data/pageLayouts';
import { usePageLayout } from '../../hooks/usePageLayout';
import { useLanguage } from '../../contexts/LanguageContext';

const defectTypeData = [
  { type: 'Surface', count: 45, percentage: 32 },
  { type: 'Dimensional', count: 38, percentage: 27 },
  { type: 'Assembly', count: 28, percentage: 20 },
  { type: 'Electrical', count: 18, percentage: 13 },
  { type: 'Other', count: 11, percentage: 8 },
];

const qualityTrendData = [
  { batch: 'B-001', yield: 97.5, defects: 2.5 },
  { batch: 'B-002', yield: 98.0, defects: 2.0 },
  { batch: 'B-003', yield: 97.8, defects: 2.2 },
  { batch: 'B-004', yield: 98.3, defects: 1.7 },
  { batch: 'B-005', yield: 98.1, defects: 1.9 },
  { batch: 'B-006', yield: 98.5, defects: 1.5 },
  { batch: 'B-007', yield: 98.2, defects: 1.8 },
];

const productVariants = [
  { id: 'PRD-A', name: 'Product A - Standard', yield: 98.5, volume: 4500, status: 'good' },
  { id: 'PRD-B', name: 'Product B - Premium', yield: 97.8, volume: 2800, status: 'good' },
  { id: 'PRD-C', name: 'Product C - Economy', yield: 96.2, volume: 6200, status: 'warning' },
  { id: 'PRD-D', name: 'Product D - Custom', yield: 99.1, volume: 1200, status: 'good' },
];

/* ---------------------------------------------------------------------------
 * JPB — Component Traceability. OLCULEN veri, uydurma satir YOK.
 * Kaynak: TBL_LOTIE (34.861 lot) + TBL_Qual_Blocage (blokaj kodu -> aciklama).
 * Kolon doluluk: COARTI %100 · LOT %99,4 · DATEREC %100 · BLOCAGE %100 ·
 *                QTE %100 · CERTIF %28,1 (bos gelebilir, oyle gosterilir).
 * BLOCAGE dagilimi: AUCUN 32.570 (%93,4) · bloke 1.598 (%4,58) · kod 0: 693.
 * Asagidaki satirlar tablonun EN GUNCEL kayitlaridir (Eylul 2024 — JPB
 * verisinin bittigi yer). Olcum 2026-08-31.
 * ------------------------------------------------------------------------- */
interface TraceabilityItem {
  /** COARTI — parca / malzeme kodu */
  component: string;
  /** LOT — parti numarasi (%0,6 bos) */
  lot: string;
  /** CERTIF — sertifika referansi (%71,9 bos) */
  certificate: string;
  /** DATEREC — giris tarihi */
  received: string;
  /** QTE */
  qty: number;
  /** BLOCAGE kodu — '1' ve '0' serbest, digerleri bloke */
  blockCode: string;
  /** TBL_Qual_Blocage.DESPAR karsiligi */
  blockLabel: string;
}

const traceabilityData: TraceabilityItem[] = [
  { component: 'S5886-805', lot: '24W39-48270', certificate: '', received: '25.09.2024', qty: 91, blockCode: '100', blockLabel: 'ATTENTE VALIDATION INTERNE' },
  { component: 'S5886-808', lot: '24W39-48916', certificate: '', received: '25.09.2024', qty: 274, blockCode: '100', blockLabel: 'ATTENTE VALIDATION INTERNE' },
  { component: '2073M57P03', lot: '24W39-50000/1', certificate: '', received: '25.09.2024', qty: 1, blockCode: '100', blockLabel: 'ATTENTE VALIDATION INTERNE' },
  { component: 'AMS 5666 ⌀22.22', lot: '324969', certificate: '1346045', received: '24.09.2024', qty: 301.37, blockCode: '100', blockLabel: 'ATTENTE VALIDATION INTERNE' },
  { component: 'STR/MAT_JPB210779-56', lot: '11W28', certificate: '19773', received: '04.10.2011', qty: 600, blockCode: '101', blockLabel: 'QUARANTAINE' },
  { component: 'ST5362-06', lot: '24W39-48327/1', certificate: '', received: '25.09.2024', qty: 311, blockCode: '1', blockLabel: 'AUCUN' },
  { component: 'JPB05000ST2059', lot: '24W39-49743/1', certificate: '', received: '25.09.2024', qty: 12, blockCode: '1', blockLabel: 'AUCUN' },
];

const isBlocked = (item: TraceabilityItem) => !['0', '1'].includes(item.blockCode);

/* ---------------------------------------------------------------------------
 * KAM — Receipt Inspection. Traceability karsiligi DEGIL, KAM'in kendi yapisi:
 * KAM parti (lot) tutmuyor ve bu tabloda tedarikci kolonu yok, o yuzden ayni
 * kart kurulamadi (Isil karari 2026-08-31: "KAM icin olabilecek yapiyi farkli
 * sekilde kuruyoruz").
 *
 * Kaynak: Receipts.xlsx — 999 mal kabul kaydi, 150 tekil parca.
 * Kolonlar %100 dolu: Part No · Arrived Qty · Inspected Qty · Scrapped Qty ·
 * Returned Qty. ('Inspection Code' %22,3 dolu ama TEKIL=1 — bilgi tasimiyor,
 * alinmadi.)
 * Toplam: gelen 276.103.286 · muayene 10.992.151 (%4,0) · hurda 2.275 ·
 * iade 2.168.972. Hurda veya iadesi olan parca sayisi: 12.
 *
 * NOT: birkac parcada muayene > gelen gorunuyor (ornegin 30261290: 378.550 >
 * 377.500). Sebep toplamanin farkli donemlerdeki kabullere yayilmasi; sayilar
 * ham veriden oldugu gibi alindi, duzeltilmedi. Olcum 2026-08-31.
 * ------------------------------------------------------------------------- */
interface ReceiptInspectionItem {
  part: string;
  description: string;
  arrived: number;
  inspected: number;
  scrapped: number;
  returned: number;
}

const receiptInspectionData: ReceiptInspectionItem[] = [
  { part: '1645055', description: 'Pressfit pin 18.20mm', arrived: 7795200, inspected: 4078900, scrapped: 0, returned: 2092300 },
  { part: '30261126', description: 'Transducer box asm.', arrived: 394624, inspected: 330784, scrapped: 352, returned: 76672 },
  { part: '30261290', description: 'Dessicant Box assembly', arrived: 377500, inspected: 378550, scrapped: 1050, returned: 0 },
  { part: '2006697', description: 'Preprinted traylabel', arrived: 302750, inspected: 303500, scrapped: 750, returned: 0 },
  { part: '1980511', description: 'Packaging tray Raised bottom', arrived: 614400, inspected: 314881, scrapped: 25, returned: 0 },
  { part: '2210216', description: 'Strainer (⌀17)', arrived: 720090, inspected: 379913, scrapped: 23, returned: 0 },
  { part: '1731269', description: 'MLCC 100n 25V 0402 X7R ±10%', arrived: 34450000, inspected: 0, scrapped: 0, returned: 0 },
  { part: '1729008', description: 'RESISTOR 10K0 1% 0402 TC100 62mW', arrived: 20020000, inspected: 0, scrapped: 0, returned: 0 },
];


export default function ProductDT() {
  const { t } = useLanguage();
  const layout = usePageLayout('product');
  const visibleKpis = getVisibleKpis(layout.items);
  const showQualityTrend = layout.isVisible('quality-trend');
  const showDefectDistribution = layout.isVisible('defect-distribution');

  return (
    <div className="min-h-screen">
      <Header
        title={t('prod.title')}
        subtitle={t('prod.subtitle')}
      />
        <FilterBar />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
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

        {(showQualityTrend || showDefectDistribution) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {showQualityTrend && (
          <div className={`${showDefectDistribution ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl shadow-card p-5 overflow-hidden`}>
            <h3 className="font-semibold text-surface-900 mb-4">{t('prod.qualityTrend')}</h3>
            <div className="h-72 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={qualityTrendData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="batch" tick={{ fontSize: 12 }} stroke="#737373" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#737373" domain={[95, 100]} width={40} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#737373" domain={[0, 5]} width={40} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="yield" stroke="#10b981" strokeWidth={2} name={t('prod.yieldPct')}>
                    <LabelList dataKey="yield" position="top" fontSize={10} fill="#10b981" offset={8} />
                  </Line>
                  <Line yAxisId="right" type="monotone" dataKey="defects" stroke="#ef4444" strokeWidth={2} name={t('prod.defectsPct')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}

          {showDefectDistribution && (
          <div className="bg-white rounded-xl shadow-card p-5 overflow-hidden">
            <h3 className="font-semibold text-surface-900 mb-4">{t('prod.defectDistribution')}</h3>
            <div className="h-72 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defectTypeData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#737373" />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} stroke="#737373" width={75} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" name={t('dt.count')} radius={[0, 4, 4, 0]}>
                    <LabelList position="right" fontSize={10} fill="#333" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}
        </div>
        )}

        {layout.isVisible('product-variants') && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="font-semibold text-surface-900 mb-4">{t('prod.productVariants')}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {productVariants.map((product) => (
              <div
                key={product.id}
                className={`rounded-xl border p-4 ${
                  product.status === 'good' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs text-surface-500">{product.id}</span>
                    <h4 className="font-medium text-surface-900 line-clamp-1">{product.name}</h4>
                  </div>
                  {product.status === 'good' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-600">{t('prod.yieldRate')}</span>
                    <span className={`font-medium ${
                      product.yield >= 98 ? 'text-green-600' :
                      product.yield >= 97 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {product.yield}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-600">{t('prod.volume')}</span>
                    <span className="font-medium text-surface-900">{product.volume.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {layout.isVisible('component-traceability') && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">{t('prod.componentTraceability')}</h3>
            <HelpPopover
              text={t('prod.helpTrace')}
              linkTo="/help"
              linkLabel={t('prod.helpLink')}
              position="bottom-left"
            />
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder={t('prod.searchComponent')}
                className="pl-9 pr-4 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thComponent')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thLot')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thCertificate')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thReceived')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thQty')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {traceabilityData.map((item) => (
                <tr
                  key={`${item.component}-${item.lot}-${item.received}`}
                  className={`border-b border-surface-100 hover:bg-surface-50 ${
                    isBlocked(item) ? 'bg-red-50/40' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-surface-400" />
                      <span className="font-medium text-surface-900">{item.component}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-surface-600">
                      {item.lot || <span className="text-surface-300">—</span>}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-surface-600">
                      {item.certificate || <span className="text-surface-300">—</span>}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-surface-700">{item.received}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-surface-700">
                    {item.qty.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${isBlocked(item) ? 'badge-critical' : 'badge-success'}`}>
                      {item.blockLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        )}

        {/* KAM — Receipt Inspection. Rakamlar Receipts.xlsx'ten OLCULDU. */}
        {layout.isVisible('receipt-inspection') && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-surface-900">{t('prod.receiptInspection')}</h3>
              <HelpPopover
                text={t('prod.helpReceipt')}
                linkTo="/help"
                linkLabel={t('prod.helpLink')}
                position="bottom-left"
              />
            </div>
            <span className="text-xs text-surface-400">999 receipts · 150 parts</span>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thPart')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thArrived')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thInspected')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thScrapped')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-surface-600">{t('prod.thReturned')}</th>
              </tr>
            </thead>
            <tbody>
              {receiptInspectionData.map((item) => {
                const flagged = item.scrapped > 0 || item.returned > 0;
                return (
                  <tr
                    key={item.part}
                    className={`border-b border-surface-100 hover:bg-surface-50 ${
                      flagged ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-surface-400" />
                        <div>
                          <div className="font-medium text-surface-900">{item.part}</div>
                          <div className="text-xs text-surface-500">{item.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-surface-700">
                      {item.arrived.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-surface-700">
                      {item.inspected ? item.inspected.toLocaleString() : <span className="text-surface-300">—</span>}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono text-sm ${item.scrapped ? 'text-red-600 font-semibold' : 'text-surface-400'}`}>
                      {item.scrapped ? item.scrapped.toLocaleString() : '—'}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono text-sm ${item.returned ? 'text-amber-600 font-semibold' : 'text-surface-400'}`}>
                      {item.returned ? item.returned.toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <p className="mt-3 font-mono text-xs text-surface-400">
            KAM · Receipts.xlsx — Part No / Arrived Qty / Inspected Qty / Scrapped Qty / Returned Qty · 999 receipts · measured 2026-08-31
          </p>
        </div>
        )}

      </div>


    </div>
  );
}
