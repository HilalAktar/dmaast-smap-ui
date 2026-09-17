import type { KpiData, DigitalTwinNode, SimulationScenario, HitlValidationTask } from '../types';

export const dashboardKpis: KpiData[] = [
  {
    id: 'equipment-availability',
    label: 'Equipment Availability',
    value: 94.2,
    unit: '%',
    trend: 2.1,
    target: 95,
    cluster: 'delivery',
    sparklineData: [91, 92, 93, 92, 94, 93, 94, 94.2],
    definition: 'Percentage of scheduled time that equipment is operational and available for production.',
    dataSource: 'Manufacturing DT',
    helpUrl: '/help#equipment-availability',
  },
  {
    id: 'production-throughput',
    label: 'Production Throughput',
    value: 1248,
    unit: 'units/day',
    trend: 5.3,
    target: 1300,
    cluster: 'delivery',
    sparklineData: [1100, 1150, 1180, 1200, 1220, 1230, 1240, 1248],
    definition: 'Total number of finished units produced per day across all active production lines.',
    dataSource: 'UNCERTAIN · KAM · Shop Orders - Assembly (Completed Qty) · JPB · TBLVIEW_NBPOINT_SUIVIPROD (NBPIE, 5,779 rows) — part counts exist but no reliable per-day time basis · displayed number is a placeholder',
    helpUrl: '/help#production-throughput',
  },
  {
    id: 'oee',
    label: 'OEE',
    value: 87.5,
    unit: '%',
    trend: 1.8,
    target: 90,
    cluster: 'delivery',
    sparklineData: [82, 84, 85, 86, 86, 87, 87, 87.5],
    definition: 'Overall Equipment Effectiveness combining availability, performance, and quality rates.',
    dataSource: 'Manufacturing DT',
    helpUrl: '/help#oee',
  },
  {
    id: 'yield-rate',
    label: 'Yield Rate',
    value: 98.2,
    unit: '%',
    trend: 0.5,
    target: 99,
    cluster: 'cost',
    sparklineData: [97, 97.5, 97.8, 98, 98, 98.1, 98.2, 98.2],
    definition: 'Ratio of good units produced to total units started, measuring production quality.',
    dataSource: 'KAM · Shop Orders - Assembly — UNCERTAIN (no started-vs-good split) · JPB · TBLVIEW_NBPOINT_SUIVIPROD NBPIE/(NBPIE+NBPIEABIME) — real · displayed number is a placeholder',
    helpUrl: '/help#yield-rate',
  },
  {
    id: 'defect-rate',
    label: 'Defect Rate',
    value: 1.8,
    unit: '%',
    trend: -0.3,
    target: 1.5,
    cluster: 'cost',
    sparklineData: [2.5, 2.3, 2.2, 2.0, 1.9, 1.9, 1.8, 1.8],
    definition: 'Percentage of produced units that fail quality inspection criteria.',
    dataSource: 'KAM · Receipts Scrapped/Arrived Qty (0.79%) · JPB · TBLVIEW_NBPOINT NBPIEABIME/NBPIE (2.04%) — real, measured 2026-09-02 · displayed number is a placeholder',
    helpUrl: '/help#defect-rate',
  },
  {
    id: 'lead-time',
    label: 'End-to-End Lead Time',
    value: 12.4,
    unit: 'days',
    trend: -1.2,
    target: 10,
    cluster: 'delivery',
    sparklineData: [15, 14.5, 14, 13.5, 13, 12.8, 12.5, 12.4],
    definition: 'Total elapsed time from order placement to customer delivery, spanning all supply chain stages.',
    dataSource: 'KAM · Ext Customer Order Lines (Created → Last Actual Ship Date) · JPB · TBL_AFFAIRE+TBL_BL (DATEAF → DATEBL, 10,378 rows) — real · displayed number is a placeholder',
    helpUrl: '/help#lead-time',
  },
  {
    id: 'delivery-accuracy',
    label: 'Delivery Accuracy',
    value: 96.8,
    unit: '%',
    trend: 1.5,
    target: 98,
    cluster: 'delivery',
    sparklineData: [93, 94, 94.5, 95, 95.5, 96, 96.5, 96.8],
    definition: 'Percentage of orders delivered on time and in full to the customer.',
    dataSource: 'KAM · Ext Customer Order Lines (OTIF: Promised vs Last Actual Ship) · JPB · TBL_BL+TBL_AFFAIRE (DATEBL ≤ DDP) — real · displayed number is a placeholder',
    helpUrl: '/help#delivery-accuracy',
  },
  {
    id: 'energy-per-unit',
    label: 'Energy per Unit',
    value: 2.4,
    unit: 'kWh/unit',
    trend: -0.2,
    target: 2.0,
    cluster: 'energy',
    sparklineData: [3.0, 2.9, 2.8, 2.7, 2.6, 2.5, 2.4, 2.4],
    definition: 'Average electrical energy consumed to produce one finished unit.',
    dataSource: 'Sustainability DT',
    helpUrl: '/help#energy-per-unit',
  },
  {
    // T4.2 (iii) — registry (dataSources.ts) AUTORITE: bu kart bir STOK DEGERI'dir,
    //   DEVIR HIZI (turnover) DEGIL. Eski 'Inventory Turnover / turns/year' basligi
    //   stok-vs-oran karistirmasiydi (dijital-ikiz kurali ihlali) ve pageLayouts
    //   basligi ('Inventory Value') ile celisiyordu. Baslik/birim/tanim registry'ye
    //   hizalandi. Deger YER TUTUCU: tek anlik stok goruntusunden devir hizi
    //   turetilemez; gosterilecek gercek figur Isil kararina birakildi (bkz. rapor).
    id: 'inventory-turnover',
    label: 'Inventory Value',
    value: 8.5,
    unit: 'value',
    trend: 0.8,
    target: 10,
    cluster: 'stock',
    sparklineData: [6.5, 7.0, 7.3, 7.6, 7.9, 8.1, 8.3, 8.5],
    definition: 'Point-in-time total stock value (a stock level, not a rate). Inventory turnover cannot be derived from a single stock snapshot.',
    dataSource: 'KAM · Inventory Part in Stock — Total Inventory Value · 1,380 rows 100% filled, total ≈ 85.3M (real, single snapshot 19 Nov 2024) · JPB · TBL_LOTIE+TBL_STOCK (QTE × approx unit cost) — uncertain · displayed number is a placeholder',
    helpUrl: '/help#inventory-turnover',
  },
  {
    id: 'supplier-reliability',
    label: 'Supplier Reliability',
    value: 92.3,
    unit: '%',
    trend: 1.1,
    target: 95,
    cluster: 'resource',
    sparklineData: [88, 89, 89.5, 90, 91, 91.5, 92, 92.3],
    definition: 'Share of supplier deliveries arriving on time. UNCERTAIN: no measurable source in either company.',
    dataSource: 'UNCERTAIN · KAM · Purchase Order Lines has only Planned Receipt Date (no actual receipt date) · JPB has no supplier master/performance table — cannot be measured · displayed number is a placeholder',
    helpUrl: '/help#supplier-reliability',
  },
  {
    id: 'carbon-footprint',
    label: 'Carbon Footprint',
    value: 145,
    unit: 'kg CO2/unit',
    trend: -8.5,
    target: 120,
    cluster: 'energy',
    sparklineData: [180, 175, 168, 162, 155, 150, 148, 145],
    definition: 'Total greenhouse gas emissions measured in CO2 equivalent per unit produced.',
    dataSource: 'Sustainability DT',
    helpUrl: '/help#carbon-footprint',
  },
  {
    // T4.2 (iii) — registry AUTORITE: bu kart 'Unit Cost' (maliyet/gelir orani),
    //   'Cost Efficiency' (gerceklesen-vs-butce) DEGIL. Baslik/tanim/dataSource
    //   registry ve pageLayouts basligi ('Unit Cost') ile hizalandi. Deger YER
    //   TUTUCU: KAM gercek olcum maliyet/gelir %37,36 (549 satir). JPB belirsiz
    //   (TAUXHOMMETP/TU 244.290 satirda hep 0). Gosterilen sayi yer tutucu.
    id: 'cost-efficiency',
    label: 'Unit Cost',
    value: 94.7,
    unit: '%',
    trend: 2.3,
    target: 96,
    cluster: 'cost',
    sparklineData: [89, 90, 91, 92, 93, 93.5, 94, 94.7],
    definition: 'Cost-to-revenue ratio (total cost against net revenue). Lower is better.',
    dataSource: 'KAM · Ext Customer Order Lines — Total Cost/Base ÷ Net Amt/Base · 549 rows, measured 37.36% (real) · JPB · TBL_GAMME TAUXHOMMETP/TU all-zero over 244,290 rows — uncertain · displayed number is a placeholder',
    helpUrl: '/help#cost-efficiency',
  },
];

/*
 * recentAlerts KALDIRILDI — 2026-08-31, Isil karari:
 * "uydurma olanlarin hepsi cikartilsin, sadece gercekten gozukebilecekler kalsin".
 *
 * Buradaki 5 (+ AlertCenter icindeki 5) alarm elle uydurulmustu ve yedisi iki
 * firmada da BULUNMAYAN veriyi anlatiyordu: sensor sicakligi, enerji x2, makine
 * bakimi/durusu, OEE, reorder point, tedarikci puani.
 *
 * Yerine gecen tek kaynak: data/alerts.ts — dordu de ham veriden olculmustur.
 */

export const valueChainNodes: DigitalTwinNode[] = [
  {
    id: 'supplier-1',
    name: 'Raw Material Supplier A',
    type: 'supplier',
    status: 'active',
    metrics: [
      { id: 's1-lead', label: 'Lead Time', value: 5, unit: 'days', cluster: 'delivery' },
      { id: 's1-reliability', label: 'Reliability', value: 94, unit: '%', cluster: 'resource' },
    ],
  },
  {
    id: 'supplier-2',
    name: 'Component Supplier B',
    type: 'supplier',
    status: 'warning',
    metrics: [
      { id: 's2-lead', label: 'Lead Time', value: 8, unit: 'days', cluster: 'delivery' },
      { id: 's2-reliability', label: 'Reliability', value: 87, unit: '%', cluster: 'resource' },
    ],
  },
  {
    id: 'manufacturer-1',
    name: 'Main Assembly Plant',
    type: 'manufacturer',
    status: 'active',
    metrics: [
      { id: 'm1-oee', label: 'OEE', value: 87.5, unit: '%', cluster: 'delivery' },
      { id: 'm1-throughput', label: 'Throughput', value: 1248, unit: 'units/day', cluster: 'delivery' },
    ],
  },
  {
    id: 'logistics-1',
    name: 'Distribution Center',
    type: 'logistics',
    status: 'active',
    metrics: [
      { id: 'l1-accuracy', label: 'Delivery Accuracy', value: 96.8, unit: '%', cluster: 'delivery' },
      { id: 'l1-time', label: 'Avg Transit Time', value: 2.3, unit: 'days', cluster: 'delivery' },
    ],
  },
  {
    id: 'customer-1',
    name: 'European Market',
    type: 'customer',
    status: 'active',
    metrics: [
      { id: 'c1-satisfaction', label: 'Satisfaction', value: 4.2, unit: '/5', cluster: 'delivery' },
      { id: 'c1-demand', label: 'Weekly Demand', value: 8500, unit: 'units', cluster: 'stock' },
    ],
  },
];

export const simulationScenarios: SimulationScenario[] = [
  {
    id: 'scenario-1',
    name: 'Baseline',
    description: 'Current production configuration',
    parameters: {
      productionRate: 1248,
      inventoryLevel: 15000,
      supplierLeadTime: 5,
    },
    results: {
      objectives: { cost: 100, leadTime: 12.4, sustainability: 145 },
      timestamp: new Date(),
      duration: 1250,
    },
  },
  {
    id: 'scenario-2',
    name: 'High Throughput',
    description: 'Maximized production output',
    parameters: {
      productionRate: 1500,
      inventoryLevel: 20000,
      supplierLeadTime: 4,
    },
    results: {
      objectives: { cost: 115, leadTime: 10.2, sustainability: 165 },
      timestamp: new Date(),
      duration: 1480,
    },
  },
  {
    id: 'scenario-3',
    name: 'Lean Operations',
    description: 'Minimized inventory and waste',
    parameters: {
      productionRate: 1100,
      inventoryLevel: 8000,
      supplierLeadTime: 6,
    },
    results: {
      objectives: { cost: 85, leadTime: 14.5, sustainability: 125 },
      timestamp: new Date(),
      duration: 1120,
    },
  },
];

/*
 * mudaData KALDIRILDI — 2026-08-31 (Isil onayi).
 * 7 israf kategorisi elle uydurulmustu. KPI tablolarinda yalnizca JPB
 * 'Waiting time' tanimli; o da POINT.TYPEALEA alani 272.078 satirin
 * hepsinde '0' oldugu icin olculemiyor.
 */

export const paretoFrontData = [
  { id: 'p1', cost: 85, leadTime: 14.5, sustainability: 125, selected: false },
  { id: 'p2', cost: 90, leadTime: 13.2, sustainability: 130, selected: false },
  { id: 'p3', cost: 95, leadTime: 12.0, sustainability: 138, selected: true },
  { id: 'p4', cost: 100, leadTime: 11.2, sustainability: 145, selected: false },
  { id: 'p5', cost: 108, leadTime: 10.5, sustainability: 155, selected: false },
  { id: 'p6', cost: 115, leadTime: 10.0, sustainability: 165, selected: false },
];

export const productionTrendData = [
  { date: 'Mon', actual: 1180, target: 1200 },
  { date: 'Tue', actual: 1220, target: 1200 },
  { date: 'Wed', actual: 1195, target: 1200 },
  { date: 'Thu', actual: 1248, target: 1200 },
  { date: 'Fri', actual: 1275, target: 1200 },
  { date: 'Sat', actual: 1150, target: 1200 },
  { date: 'Sun', actual: 1100, target: 1200 },
];

export const energyConsumptionData = [
  { time: '00:00', line1: 45, line2: 38, line3: 42 },
  { time: '04:00', line1: 48, line2: 40, line3: 45 },
  { time: '08:00', line1: 72, line2: 65, line3: 68 },
  { time: '12:00', line1: 85, line2: 78, line3: 82 },
  { time: '16:00', line1: 80, line2: 72, line3: 76 },
  { time: '20:00', line1: 55, line2: 48, line3: 52 },
];

export const hitlValidationTasks: HitlValidationTask[] = [
  {
    id: 'hitl-1',
    title: 'Confirm anomaly in Machine M-102 readings',
    description: 'Temperature readings show an unusual pattern. Is this a real anomaly or sensor drift?',
    type: 'anomaly' as const,
    source: 'Manufacturing DT',
    timestamp: new Date(Date.now() - 10 * 60000),
    status: 'pending' as const,
  },
  {
    id: 'hitl-2',
    title: 'Validate updated safety stock level',
    description: 'System recommends increasing Component C-445 safety stock from 1500 to 1800 units.',
    type: 'confirm' as const,
    source: 'Value Chain DT',
    timestamp: new Date(Date.now() - 25 * 60000),
    status: 'pending' as const,
  },
  {
    id: 'hitl-3',
    title: 'Approve production schedule override',
    description: 'Line 3 schedule change requested to prioritize Order #ORD-4521 due to urgent customer request.',
    type: 'override' as const,
    source: 'MO-DSS',
    timestamp: new Date(Date.now() - 45 * 60000),
    status: 'pending' as const,
  },
  {
    id: 'hitl-4',
    title: 'Confirm batch quality inspection result',
    description: 'Batch B-1250 passed automated QC with 99.1% score. Please confirm final approval.',
    type: 'confirm' as const,
    source: 'Product DT',
    timestamp: new Date(Date.now() - 90 * 60000),
    status: 'pending' as const,
  },
];
