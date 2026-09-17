import type { UserRole } from '../contexts/RoleContext';
import type { KpiData } from '../types';
import type { LayoutItem, LayoutItemDefinition, PageId, PageLayoutConfig } from '../types/pageLayout';
import type { Company } from '../contexts/CompanyContext';
import { dashboardKpis } from './mockData';

const ALL_ROLES: UserRole[] = ['manager', 'engineer', 'operator', 'admin', 'developer', 'superuser'];

function fullDefault(ids: string[]): Record<UserRole, string[]> {
  return Object.fromEntries(ALL_ROLES.map((role) => [role, ids])) as Record<UserRole, string[]>;
}

function buildLayoutItems(
  definitions: LayoutItemDefinition[],
  visibleIds: string[],
): LayoutItem[] {
  const visibleSet = new Set(visibleIds);
  const orderedVisible = visibleIds
    .map((id) => definitions.find((d) => d.id === id))
    .filter((d): d is LayoutItemDefinition => Boolean(d));

  const hidden = definitions.filter((d) => !visibleSet.has(d.id));

  return [...orderedVisible, ...hidden].map((item, index) => ({
    ...item,
    visible: visibleSet.has(item.id),
    order: index,
  }));
}

export function getRoleDefaultLayout(pageId: PageId, role: UserRole): LayoutItem[] {
  const config = PAGE_LAYOUTS[pageId];
  const visibleIds = config.roleDefaults[role] ?? config.roleDefaults.engineer;
  return buildLayoutItems(config.items, visibleIds);
}

/**
 * Bir sayfanin belirli bir use case'te GECERLI kart tanimlari.
 * Işıl karari 2026-08-30: iki arayuzun katalogu ayni olmak zorunda degil.
 * scope belirtilmemis kartlar iki arayuzde de gecerlidir.
 */
export function getCompanyItems(pageId: PageId, company: Company): LayoutItemDefinition[] {
  return PAGE_LAYOUTS[pageId].items.filter(
    (item) => !item.scope || item.scope === 'both' || item.scope === company,
  );
}

/**
 * Rol varsayilanlari da kapsamla suzulur — baska firmaya ait bir kart
 * varsayilan listede kalirsa admin panelinde hayalet kalem uretir.
 */
export function getCompanyRoleDefaults(
  pageId: PageId,
  role: UserRole,
  company: Company,
): string[] {
  const config = PAGE_LAYOUTS[pageId];
  const allowed = new Set(getCompanyItems(pageId, company).map((i) => i.id));
  const defaults = config.roleDefaults[role] ?? config.roleDefaults.engineer ?? [];
  return defaults.filter((id) => allowed.has(id));
}

export const PAGE_LAYOUTS: Record<PageId, PageLayoutConfig> = {
  dashboard: {
    pageId: 'dashboard',
    label: 'Dashboard',
    items: [
      // Isil is emri 2026-09-02 — quick-stats artik KPI tanimindan beslenir,
      //   sabit dize tasimaz. OEE kutusu Defect Rate ile degistirildi:
      //   OEE'nin Availability bacagi iki firmada da OLCULEMEZ
      //   (KAM 'Machine No' 1502/1502 BOS · JPB 'CAPEMPR' 244.290 satirda hep 0),
      //   Defect Rate ise iki firmada da gercek: KAM %0,79 (Receipts, pcs)
      //   JPB %2,04 (NBPIEABIME/NBPIE, 5.779 satir). Olcum 2026-09-02.
      { id: 'quick-stats', title: 'Quick Stats', type: 'widget',
        kpiIds: ['production-throughput', 'defect-rate', 'lead-time'] },
      // KPI listesi artik INDEX'ten degil BURADAN cozulur (kpiIds).
      //   CIKARILDI 2026-09-02 (olcumle): equipment-availability · oee
      //     -> Availability bacagi yok (yukaridaki olcum).
      //   CIKARILDI: energy-per-unit · carbon-footprint
      //     -> enerji/emisyon alani iki firmanin 3.200 kolonunda da YOK.
      //     Bu dordu 2026-08-30/31'de DT sayfalarindan cikarilmisti; Dashboard
      //     kayit defterine bakmadigi icin ekranda kalmislardi.
      //   CIKARILDI: supplier-reliability
      //     -> KAM'da FIILI kabul tarihi yok (yalniz 'Planned Receipt', plan),
      //        JPB'de tedarikci master'i hic yok. Iki firmada da kurulamaz.
      { id: 'kpi-primary', title: 'Primary KPIs', type: 'widget',
        kpiIds: ['production-throughput', 'yield-rate', 'defect-rate',
                 'lead-time', 'delivery-accuracy'] },
      { id: 'production-trend', title: 'Production Trend', type: 'widget' },
      // CIKARILDI 2026-08-31 (Isil): muda-analysis · waste-reduction.
      //   Gerekce: KPI tablolarinda karsiliklari YOK. MUDA'nin 7 kategorisinden
      //   yalniz JPB 'Waiting time' tanimli; Transport/Motion/Overprocessing
      //   hicbir tabloda ve hicbir veri setinde yok. Atik azaltma gostergesi de yok.
      //   Denetim: work/smap-arayuz/02-kpi-veri-kaynagi-denetimi.md
      { id: 'alerts', title: 'Recent Alerts', type: 'widget' },
      // GIZLENDI 2026-08-31 (Isil): 4 dogrulama gorevi elle uydurulmustu ve
      //   ikisi olmayan veriye dayaniyordu (M-102 sensor okumasi, C-445 emniyet
      //   stogu). Widget SILINMEDI — Isil'in tarifiyle "survey" olarak yeniden
      //   kurulacak; tasarim gelince bu satir geri acilir.
      // { id: 'hitl-tasks', title: 'Validation Tasks', type: 'widget' },
      // Ikincil serit: KAM'da olculebilen, JPB'de kurulamayan iki kalem.
      //   inventory-turnover -> KAM 'Total Inventory Value' 1.380 satir %100 dolu,
      //     toplam 85.300.998. DIKKAT: bu bir DEGER'dir, DEVIR HIZI degil —
      //     stok tek anlik goruntu (19 Kas 2024), devir hizi kurulamaz.
      //   cost-efficiency -> KAM 'Total Cost/Base' + 'Net Amt/Base' 549 satir,
      //     maliyet/gelir %37,36. JPB'de TAUXHOMMETP/TU 244.290 satirda hep 0.
      //   Ikisinin de basligi ve tanimi duzeltilmeli — bkz. kart-veri-haritasi.md §5.5
      { id: 'kpi-secondary', title: 'Secondary KPIs', type: 'widget', scope: 'kam',
        kpiIds: ['inventory-turnover', 'cost-efficiency'] },
    ],
    roleDefaults: {
      manager: ['quick-stats', 'kpi-primary', 'production-trend', 'alerts', 'kpi-secondary'],
      engineer: ['quick-stats', 'kpi-primary', 'production-trend', 'kpi-secondary'],
      operator: ['quick-stats', 'alerts'],
      admin: ['quick-stats', 'kpi-primary', 'production-trend', 'alerts', 'kpi-secondary'],
      developer: ['quick-stats', 'kpi-primary', 'production-trend'],
      superuser: ['quick-stats', 'kpi-primary', 'production-trend', 'alerts', 'kpi-secondary'],
    },
  },
  'value-chain': {
    pageId: 'value-chain',
    label: 'Value Chain DT',
    items: [
      { id: 'lead-time', title: 'End-to-End Lead Time', type: 'kpi' },
      { id: 'delivery-accuracy', title: 'Delivery Accuracy', type: 'kpi' },
      { id: 'inventory-turnover', title: 'Inventory Value', type: 'kpi' },
      { id: 'supplier-reliability', title: 'Supplier Reliability', type: 'kpi' },
      { id: 'production-throughput', title: 'Production Throughput', type: 'kpi' },
      { id: 'cost-efficiency', title: 'Unit Cost', type: 'kpi' },
      { id: 'supply-chain-flow', title: 'Supply Chain Flow', type: 'card' },
      { id: 'lead-time-trend', title: 'Lead Time Trend', type: 'card' },
      { id: 'order-status', title: 'Order Status', type: 'card' },
      { id: 'network-nodes', title: 'Network Nodes', type: 'card' },
    ],
    roleDefaults: {
      manager: ['lead-time', 'delivery-accuracy', 'inventory-turnover', 'supplier-reliability', 'supply-chain-flow', 'lead-time-trend', 'order-status', 'network-nodes'],
      engineer: ['lead-time', 'delivery-accuracy', 'inventory-turnover', 'supplier-reliability', 'production-throughput', 'supply-chain-flow', 'lead-time-trend', 'order-status', 'network-nodes'],
      operator: ['lead-time', 'delivery-accuracy', 'order-status', 'network-nodes'],
      admin: ['lead-time', 'delivery-accuracy', 'inventory-turnover', 'supplier-reliability', 'production-throughput', 'cost-efficiency', 'supply-chain-flow', 'lead-time-trend', 'order-status', 'network-nodes'],
      developer: ['lead-time', 'delivery-accuracy', 'inventory-turnover', 'supplier-reliability', 'supply-chain-flow', 'lead-time-trend', 'order-status', 'network-nodes'],
      superuser: ['lead-time', 'delivery-accuracy', 'inventory-turnover', 'supplier-reliability', 'production-throughput', 'cost-efficiency', 'supply-chain-flow', 'lead-time-trend', 'order-status', 'network-nodes'],
    },
  },
  manufacturing: {
    pageId: 'manufacturing',
    label: 'Manufacturing DT',
    // Işıl onayi 2026-08-30 — masterdata MON + usable% ile secildi.
    // CIKARILDI: equipment-availability · oee (tekil kart)  —  oee-breakdown ve
    //   machine-status 2026-08-31'de GERI ALINDI (unit_states / PackML).
    //   (makine kimligi ve durus iki firmada da yok: KAM 'Machine No' %0,
    //    JPB 'CAPEMPR' 244.290 satirda hep 0, 'Machine_Capacity' FILLED BUT ALL ZERO)
    // CIKARILDI: energy-per-unit (enerji alani yok) · what-if-panel (simulasyon, kapsam disi)
    items: [
      { id: 'production-throughput', title: 'Production Throughput', type: 'kpi' },
      { id: 'yield-rate', title: 'Yield Rate', type: 'kpi' },
      { id: 'defect-rate', title: 'Defect Rate', type: 'kpi' },
      { id: 'cost-efficiency', title: 'Unit Cost', type: 'kpi' },
      // JPB: Completion_Rate usable 99.9% (max(NBPIE per NAF) / QTEFAB)
      { id: 'completion-rate', title: 'Completion Rate', type: 'kpi', scope: 'jpb' },
      { id: 'production-output', title: 'Production Output', type: 'card' },
      // JPB: Actual_Production_Hours (TPSPASSE) usable 97.7% — KAM'da yalniz planlanan (30.6%)
      { id: 'cycle-time-analysis', title: 'Cycle Time Analysis', type: 'card', scope: 'jpb' },
      // KAM: Shop Order Material Summary Status — OLCULDU tekil=3 (760 Completely Issued /
      // 208 Partially Issued / 2 Not Reserved). Shop_Order_Status ve Operation_Status
      // usable %100 gorunuyor ama TEKIL=1 (hepsi Closed / Completely Reported) — bilgi tasimiyor.
      // GERI ALINDI 2026-08-31 (Isil): unit_states (PackML) Availability'yi sagliyor;
      //   OEE'yi KAM'da koordinator (IDE), JPB'de JPB kendisi KPI tablosuna eklemis.
      //   Kartlar DEGER gostermiyor — her bacagin kaynagini ve bagli olup olmadigini gosteriyor.
      { id: 'oee-breakdown', title: 'OEE Breakdown', type: 'card' },
      { id: 'machine-status', title: 'Machine Status', type: 'card' },
      { id: 'material-readiness', title: 'Material Readiness', type: 'card', scope: 'kam' },
      // JPB: Actual 97.7% ↔ Estimated (GA_NBH) 26.7%
      { id: 'actual-vs-planned-hours', title: 'Actual vs Planned Hours', type: 'card', scope: 'jpb' },
    ],
    roleDefaults: {
      manager: ['production-throughput', 'yield-rate', 'defect-rate', 'completion-rate', 'production-output', 'oee-breakdown', 'machine-status', 'material-readiness', 'cycle-time-analysis'],
      engineer: ['production-throughput', 'yield-rate', 'defect-rate', 'cost-efficiency', 'completion-rate', 'production-output', 'oee-breakdown', 'machine-status', 'cycle-time-analysis', 'material-readiness', 'actual-vs-planned-hours'],
      operator: ['production-throughput', 'yield-rate', 'production-output', 'oee-breakdown', 'machine-status', 'material-readiness'],
      admin: ['production-throughput', 'yield-rate', 'defect-rate', 'cost-efficiency', 'completion-rate', 'production-output', 'oee-breakdown', 'machine-status', 'cycle-time-analysis', 'material-readiness', 'actual-vs-planned-hours'],
      developer: ['production-throughput', 'yield-rate', 'production-output', 'oee-breakdown', 'machine-status', 'cycle-time-analysis', 'material-readiness'],
      superuser: ['production-throughput', 'yield-rate', 'defect-rate', 'cost-efficiency', 'completion-rate', 'production-output', 'oee-breakdown', 'machine-status', 'cycle-time-analysis', 'material-readiness', 'actual-vs-planned-hours'],
    },
  },
  logistics: {
    pageId: 'logistics',
    label: 'Logistics DT',
    // Işıl onayi 2026-08-30 — CIKARILDI: fleet-utilization · transport-cost (arac/navlun
    // verisi iki firmada da yok) · route-performance (rota performansi MON listesinde yok)
    items: [
      { id: 'delivery-accuracy', title: 'Delivery Accuracy', type: 'kpi' },
      { id: 'lead-time', title: 'End-to-End Lead Time', type: 'kpi' },
      { id: 'inventory-turnover', title: 'Inventory Value', type: 'kpi' },
      // KAM: Actual_Ship_Date 100% + Actual_Delivery_Date 99.2%.
      // JPB: Actual_Ship_Date yalniz 3.9%, DUREETRANS OLCULDU = %0 bos -> JPB'de yok
      { id: 'avg-transit-time', title: 'Avg Transit Time', type: 'kpi', scope: 'kam' },
      // KAM: Ship_Delay_Days usable 100%
      { id: 'late-delivery-rate', title: 'Late Delivery Rate', type: 'kpi', scope: 'kam' },
      // JPB: Dispatch_Conformity_Check (BLCOCCheck) usable 81.1%
      { id: 'dispatch-conformity', title: 'Dispatch Conformity Check', type: 'kpi', scope: 'jpb' },
      { id: 'shipment-stats', title: 'Shipment Status Cards', type: 'card' },
      { id: 'volume-trend', title: 'Volume Trend', type: 'card' },
      // KAM: Shipment_Status 100%. JPB'de karsiligi RESTE 27.5% — zayif, alinmadi
      { id: 'active-shipments', title: 'Active Shipments', type: 'card', scope: 'kam' },
    ],
    roleDefaults: {
      manager: ['delivery-accuracy', 'lead-time', 'avg-transit-time', 'late-delivery-rate', 'dispatch-conformity', 'shipment-stats', 'volume-trend', 'active-shipments'],
      engineer: ['delivery-accuracy', 'lead-time', 'inventory-turnover', 'avg-transit-time', 'late-delivery-rate', 'dispatch-conformity', 'shipment-stats', 'volume-trend', 'active-shipments'],
      operator: ['delivery-accuracy', 'avg-transit-time', 'dispatch-conformity', 'shipment-stats', 'active-shipments'],
      admin: ['delivery-accuracy', 'lead-time', 'inventory-turnover', 'avg-transit-time', 'late-delivery-rate', 'dispatch-conformity', 'shipment-stats', 'volume-trend', 'active-shipments'],
      developer: ['delivery-accuracy', 'lead-time', 'shipment-stats', 'volume-trend', 'active-shipments'],
      superuser: ['delivery-accuracy', 'lead-time', 'inventory-turnover', 'avg-transit-time', 'late-delivery-rate', 'dispatch-conformity', 'shipment-stats', 'volume-trend', 'active-shipments'],
    },
  },
  product: {
    pageId: 'product',
    label: 'Product DT',
    // Işıl onayi 2026-08-30 — CIKARILDI: oee (Availability iki firmada da yok)
    items: [
      { id: 'yield-rate', title: 'Yield Rate', type: 'kpi' },
      { id: 'defect-rate', title: 'Defect Rate', type: 'kpi' },
      { id: 'production-throughput', title: 'Production Throughput', type: 'kpi' },
      // JPB: Parts_Inspected_Qty (QTECheck) usable 33.8% — KAM'da ilk-gecis ayrimi yok
      { id: 'first-pass-yield', title: 'First Pass Yield', type: 'kpi', scope: 'jpb' },
      // JPB: Rework_Rate usable 100% (COFRAIS = RETCH payi)
      { id: 'rework-rate', title: 'Rework Rate', type: 'kpi', scope: 'jpb' },
      // JPB: Quality_Hold_Rate usable 98% (BLOCAGE'li lot payi)
      { id: 'quality-hold-rate', title: 'Quality Hold Rate', type: 'kpi', scope: 'jpb' },
      // KAM: Inspected_Qty usable 20.8% — kapsam dusuk ama tek kaynak burada
      { id: 'inspection-coverage', title: 'Inspection Coverage', type: 'kpi', scope: 'kam' },
      { id: 'quality-trend', title: 'Quality Trend by Batch', type: 'card' },
      // JPB: TBL_CtrlCommande TypeDefaut/Defaut/Resolution — KAM'da hata TIPI yok, yalniz adet
      { id: 'defect-distribution', title: 'Defect Distribution', type: 'card', scope: 'jpb' },
      { id: 'product-variants', title: 'Product Variants Performance', type: 'card' },
      // JPB: TBL_LOTIE — LOT %99,4 · CERTIF %28,1 · DATEREC/BLOCAGE/QTE %100.
      //   KAM parti (lot) tutmuyor, bu tabloda tedarikci kolonu da yok
      //   -> ayni kart KAM'da kurulamaz (Isil karari 2026-08-31).
      { id: 'component-traceability', title: 'Component Traceability', type: 'card', scope: 'jpb' },
      // KAM karsiligi AYRI yapi: Receipts.xlsx, 999 kabul / 150 parca, bes kolon da %100 dolu.
      { id: 'receipt-inspection', title: 'Receipt Inspection', type: 'card', scope: 'kam' },
    ],
    roleDefaults: {
      manager: ['yield-rate', 'defect-rate', 'first-pass-yield', 'rework-rate', 'quality-hold-rate', 'inspection-coverage', 'quality-trend', 'defect-distribution', 'product-variants', 'component-traceability', 'receipt-inspection'],
      engineer: ['yield-rate', 'defect-rate', 'production-throughput', 'first-pass-yield', 'rework-rate', 'quality-hold-rate', 'inspection-coverage', 'quality-trend', 'defect-distribution', 'product-variants', 'component-traceability', 'receipt-inspection'],
      operator: ['yield-rate', 'defect-rate', 'first-pass-yield', 'rework-rate', 'product-variants', 'component-traceability', 'receipt-inspection'],
      admin: ['yield-rate', 'defect-rate', 'production-throughput', 'first-pass-yield', 'rework-rate', 'quality-hold-rate', 'inspection-coverage', 'quality-trend', 'defect-distribution', 'product-variants', 'component-traceability', 'receipt-inspection'],
      developer: ['yield-rate', 'defect-rate', 'first-pass-yield', 'rework-rate', 'product-variants', 'component-traceability', 'receipt-inspection'],
      superuser: ['yield-rate', 'defect-rate', 'production-throughput', 'first-pass-yield', 'rework-rate', 'quality-hold-rate', 'inspection-coverage', 'quality-trend', 'defect-distribution', 'product-variants', 'component-traceability', 'receipt-inspection'],
    },
  },
  // MOCK — kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "planned" boş sayfa, adına
  // uygun MOCK skor kartıyla dolduruldu (src/data/mock/sustainabilityMock.ts).
  // Işıl kararının (2026-08-30) gerekçesi geçerli kalır ve sayfada görünür: enerji/karbon/
  // su/atık göstergeleri KAM ve JPB ERP verisinde SIFIR, MES/SCADA/IoT kaynağı ister.
  // Buradaki 4 kalem yeni (mock) modüllerdir; önceki 12 kalem git'te (d8563fb).
  sustainability: {
    pageId: 'sustainability',
    label: 'Sustainability',
    items: [
      { id: 'sustainability-scorecard', title: 'Sustainability Scorecard (mock)', type: 'card' },
      { id: 'energy-carbon-trend', title: 'Energy & Carbon Trend (mock)', type: 'card' },
      { id: 'process-breakdown', title: 'Energy by Process (mock)', type: 'card' },
      { id: 'circularity-actions', title: 'Circularity Actions (mock)', type: 'card' },
    ],
    roleDefaults: {
      manager: ['sustainability-scorecard', 'energy-carbon-trend', 'process-breakdown', 'circularity-actions'],
      engineer: ['sustainability-scorecard', 'energy-carbon-trend', 'process-breakdown', 'circularity-actions'],
      operator: ['sustainability-scorecard', 'process-breakdown'],
      admin: ['sustainability-scorecard', 'energy-carbon-trend', 'process-breakdown', 'circularity-actions'],
      developer: ['sustainability-scorecard', 'energy-carbon-trend', 'process-breakdown', 'circularity-actions'],
      superuser: ['sustainability-scorecard', 'energy-carbon-trend', 'process-breakdown', 'circularity-actions'],
    },
  },
  'value-chain-sim': {
    pageId: 'value-chain-sim',
    label: 'Value Chain Simulation',
    items: [
      { id: 'baseline-metrics', title: 'Baseline State Cards', type: 'card' },
      { id: 'impact-summary', title: 'Impact Summary (Results)', type: 'card' },
      { id: 'comparison-view', title: 'Comparison View (Results)', type: 'card' },
      { id: 'inventory-demand', title: 'Inventory & Demand Simulation', type: 'card' },
    ],
    roleDefaults: {
      manager: ['baseline-metrics', 'impact-summary', 'comparison-view', 'inventory-demand'],
      engineer: ['baseline-metrics', 'impact-summary', 'comparison-view', 'inventory-demand'],
      operator: ['baseline-metrics', 'inventory-demand'],
      admin: ['baseline-metrics', 'impact-summary', 'comparison-view', 'inventory-demand'],
      developer: ['baseline-metrics', 'impact-summary', 'comparison-view', 'inventory-demand'],
      superuser: ['baseline-metrics', 'impact-summary', 'comparison-view', 'inventory-demand'],
    },
  },
  'manufacturing-sim': {
    pageId: 'manufacturing-sim',
    label: 'Manufacturing Simulation',
    items: [
      { id: 'baseline-metrics', title: 'Baseline State Cards', type: 'card' },
      { id: 'impact-summary', title: 'Impact Summary (Results)', type: 'card' },
      { id: 'comparison-view', title: 'Comparison View (Results)', type: 'card' },
      { id: 'production-output', title: 'Production Output Simulation', type: 'card' },
      { id: 'machine-utilization', title: 'Machine Utilization', type: 'card' },
      { id: 'bottleneck-analysis', title: 'Bottleneck Analysis', type: 'card' },
    ],
    roleDefaults: {
      manager: ['baseline-metrics', 'impact-summary', 'comparison-view', 'production-output'],
      engineer: ['baseline-metrics', 'impact-summary', 'comparison-view', 'production-output', 'machine-utilization', 'bottleneck-analysis'],
      operator: ['baseline-metrics', 'production-output', 'machine-utilization'],
      admin: ['baseline-metrics', 'impact-summary', 'comparison-view', 'production-output', 'machine-utilization', 'bottleneck-analysis'],
      developer: ['baseline-metrics', 'impact-summary', 'comparison-view', 'production-output', 'machine-utilization', 'bottleneck-analysis'],
      superuser: ['baseline-metrics', 'impact-summary', 'comparison-view', 'production-output', 'machine-utilization', 'bottleneck-analysis'],
    },
  },
  'mo-dss': {
    pageId: 'mo-dss',
    label: 'Multi-Objective Decision Support',
    items: [
      { id: 'objective-weights', title: 'Objective Weights', type: 'card' },
      { id: 'pareto-front', title: 'Pareto Front Visualization', type: 'card' },
      { id: 'solution-comparison', title: 'Solution Comparison', type: 'card' },
      { id: 'strategy-ranking', title: 'Strategy Ranking', type: 'card' },
      { id: 'ai-recommendations', title: 'AI Recommendations', type: 'card' },
    ],
    roleDefaults: {
      manager: ['objective-weights', 'pareto-front', 'solution-comparison', 'strategy-ranking', 'ai-recommendations'],
      engineer: ['objective-weights', 'pareto-front', 'solution-comparison', 'strategy-ranking', 'ai-recommendations'],
      operator: ['objective-weights', 'strategy-ranking'],
      admin: ['objective-weights', 'pareto-front', 'solution-comparison', 'strategy-ranking', 'ai-recommendations'],
      developer: ['objective-weights', 'pareto-front', 'solution-comparison', 'strategy-ranking', 'ai-recommendations'],
      superuser: ['objective-weights', 'pareto-front', 'solution-comparison', 'strategy-ranking', 'ai-recommendations'],
    },
  },
  scheduling: {
    pageId: 'scheduling',
    label: 'Scheduling Assessment',
    items: [
      { id: 'process-scope', title: 'Process / Scope Selector', type: 'card' },
      { id: 'recommended-scenarios', title: 'Recommended Scenarios', type: 'card' },
      { id: 'gantt-timeline', title: 'Gantt Timeline', type: 'card' },
      { id: 'comparison-table', title: 'Current vs. Proposed Comparison', type: 'card' },
    ],
    roleDefaults: {
      manager: ['process-scope', 'recommended-scenarios', 'gantt-timeline', 'comparison-table'],
      engineer: ['process-scope', 'recommended-scenarios', 'gantt-timeline', 'comparison-table'],
      operator: ['process-scope', 'recommended-scenarios', 'gantt-timeline'],
      admin: ['process-scope', 'recommended-scenarios', 'gantt-timeline', 'comparison-table'],
      developer: ['process-scope', 'recommended-scenarios', 'gantt-timeline', 'comparison-table'],
      superuser: ['process-scope', 'recommended-scenarios', 'gantt-timeline', 'comparison-table'],
    },
  },
};

const PAGE_LOCAL_KPIS: Record<string, KpiData> = {
  /* ------------------------------------------------------------------
   * Işıl onayi 2026-08-30 — masterdata MON + usable% ile secilen YENI KPI'lar.
   * Sayilar tasarim yer tutucusudur (bu prototipte backend yoktur);
   * dataSource alani her KPI'in ARKASINDAKI GERCEK kolonu ve olculen
   * kullanilabilirlik oranini tasir. Kart eklenmesinin gerekcesi odur.
   * ---------------------------------------------------------------- */
  'completion-rate': {
    id: 'completion-rate',
    label: 'Completion Rate',
    value: 94.6,
    unit: '%',
    trend: 1.8,
    target: 98,
    cluster: 'delivery',
    definition: 'Produced quantity against the ordered quantity of a work order.',
    dataSource: 'JPB · CALCULATED max(NBPIE per NAF) / QTEFAB — usable 99.9%',
    sparklineData: [91.2, 92.0, 92.8, 93.1, 93.9, 94.2, 94.4, 94.6],
  },
  /*
   * 2026-08-31 — 'late-delivery-rate' bu karta donustu (Isıl onayi).
   * ESKI HALI DAYANAKSIZDI: Shipments.xlsx icinde 'Actual Ship Date',
   * 'Planned Ship Date/Time' kolonunun 359 satirin 359'unda saniyesi
   * saniyesine KOPYASI. Fark her zaman sifir; kart 1.4 gun gosteremezdi.
   * "usable 100%" dogruydu ama anlamsizdi (4. veri durumu).
   * Dogru kaynak Ext Customer Order Lines: soz verilen teslim tarihi ile
   * gerceklesen sevk tarihi. Olcum 2026-08-31.
   */
  'late-delivery-rate': {
    id: 'late-delivery-rate',
    label: 'Late Delivery Rate',
    value: 13.4,
    unit: '%',
    trend: -0.8,
    target: 5,
    cluster: 'delivery',
    definition:
      'Share of order lines shipped after the promised delivery date. Lower bound: the data has no actual delivery date, so transit time is not counted — real lateness can only be higher.',
    dataSource:
      'KAM · Ext Customer Order Lines — Promised Delivery Date/Time vs Last Actual Ship Date · 84 of 626 lines late · avg 3.7 d, max 36 d · measured 2026-08-31',
    sparklineData: [16.1, 15.7, 15.2, 14.8, 14.3, 13.9, 13.6, 13.4],
  },
  'dispatch-conformity': {
    id: 'dispatch-conformity',
    label: 'Dispatch Conformity Check',
    value: 96.1,
    unit: '%',
    trend: 0.7,
    target: 100,
    cluster: 'delivery',
    definition: 'Share of dispatches that passed the delivery-note conformity control.',
    dataSource: 'JPB · TBL_CtrlCommande BLCOCCheck — usable 81.1%',
    sparklineData: [94.0, 94.6, 95.0, 95.2, 95.6, 95.8, 96.0, 96.1],
  },
  'quality-hold-rate': {
    id: 'quality-hold-rate',
    label: 'Quality Hold Rate',
    value: 3.7,
    unit: '%',
    trend: -0.5,
    target: 2,
    cluster: 'resource',
    definition: 'Share of received lots placed on quality hold.',
    dataSource: 'JPB · CALCULATED share of lots with BLOCAGE — usable 98%',
    sparklineData: [5.1, 4.8, 4.5, 4.3, 4.0, 3.9, 3.8, 3.7],
  },
  'inspection-coverage': {
    id: 'inspection-coverage',
    label: 'Inspection Coverage',
    value: 20.8,
    unit: '%',
    trend: 0.9,
    target: 40,
    cluster: 'resource',
    definition:
      'Share of received quantity that was inspected. Coverage in the source data is low — read as an indicator, not a guarantee.',
    dataSource: 'KAM · Receipts Inspected Qty — usable 20.8%',
    sparklineData: [18.1, 18.6, 19.2, 19.5, 20.0, 20.3, 20.6, 20.8],
  },
  'avg-transit-time': {
    id: 'avg-transit-time',
    label: 'Avg Transit Time',
    value: 2.3,
    unit: 'days',
    trend: -0.4,
    target: 2.0,
    cluster: 'delivery',
    sparklineData: [3.0, 2.8, 2.7, 2.6, 2.5, 2.4, 2.3, 2.3],
  },
  /* SAHIPSIZ TANIMLAR SILINDI — 2026-08-31 (Isil onayi).
   * fleet-utilization · transport-cost · water-consumption · recycling-rate:
   * hicbir sayfanin kayit defterinde yoktular (cizilmiyorlardi) ve KAM/JPB KPI
   * tablolarinda da karsiliklari yok. Filo, tasima maliyeti, su ve geri donusum
   * gostergesi iki firmanin verisinde de bulunmuyor. */
  'first-pass-yield': {
    id: 'first-pass-yield',
    label: 'First Pass Yield',
    value: 96.5,
    unit: '%',
    trend: 1.2,
    target: 98,
    cluster: 'cost',
    sparklineData: [94, 94.5, 95, 95.5, 96, 96.2, 96.4, 96.5],
  },
  'rework-rate': {
    id: 'rework-rate',
    label: 'Rework Rate',
    value: 2.4,
    unit: '%',
    trend: -0.8,
    target: 2.0,
    cluster: 'cost',
    sparklineData: [4.0, 3.5, 3.2, 3.0, 2.8, 2.6, 2.5, 2.4],
  },
};

const kpiCatalog = new Map<string, KpiData>([
  ...dashboardKpis.map((kpi) => [kpi.id, kpi] as const),
  ...Object.entries(PAGE_LOCAL_KPIS),
]);

export function getKpiData(kpiId: string): KpiData | undefined {
  return kpiCatalog.get(kpiId);
}

/**
 * Bir widget'in cizecegi KPI'lar — kayit defterindeki `kpiIds` beyanindan.
 *
 * Isil is emri 2026-09-02 (Bulgu 1). Dashboard eskiden `dashboardKpis` dizisini
 * index'ten diliyordu; bir KPI kayit defterinden cikarilsa bile ekranda kaliyordu.
 * Artik tek kaynak kayit defteridir: burada yoksa cizilmez.
 *
 * `kpiIds` beyan edilmemisse BOS dondurur — sessizce mock diziye DUSMEZ.
 * Bilinmeyen bir kimlik verilirse o kalem atlanir (kart kaydi ile KPI katalogu
 * arasindaki kopukluk gorunur kalsin diye uydurma deger uretilmez).
 */
export function getWidgetKpis(pageId: PageId, widgetId: string): KpiData[] {
  const item = PAGE_LAYOUTS[pageId]?.items.find((i) => i.id === widgetId);
  if (!item?.kpiIds) return [];
  return item.kpiIds
    .map((id) => getKpiData(id))
    .filter((kpi): kpi is KpiData => Boolean(kpi));
}

export function getVisibleKpis(items: LayoutItem[]): KpiData[] {
  return items
    .filter((item) => item.type === 'kpi' && item.visible)
    .sort((a, b) => a.order - b.order)
    .map((item) => getKpiData(item.id))
    .filter((kpi): kpi is KpiData => Boolean(kpi));
}

export function getStorageKey(pageId: PageId, role: UserRole): string {
  return `smap-page-layout-${pageId}-${role}`;
}

export function getAllPageIds(): PageId[] {
  return Object.keys(PAGE_LAYOUTS) as PageId[];
}

// Keep fullDefault exported for potential admin tooling
export { fullDefault, buildLayoutItems };
