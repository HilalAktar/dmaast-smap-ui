/**
 * MOCK DATA — Sustainability Digital Twin (`/sustainability`).
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "Planned" yer tutucu sayfa,
 * adına uygun MOCK skor kartıyla dolduruldu. Önceki karar (Işıl, 2026-08-30)
 * geçerliliğini korur: enerji/karbon/su/atık göstergeleri KAM ve JPB ERP
 * ihracında YOKTUR; MES/SCADA/IoT kaynağı ister. Buradaki rakamlar bu kaynağın
 * arayüzdeki karşılığını göstermek için sentetiktir — ölçülmüş değildir.
 */
import type { Company } from '../../contexts/CompanyContext';

export const SUSTAINABILITY_MOCK_PROVENANCE = {
  kind: 'mock' as const,
  module: 'sustainability',
  note: 'Synthetic scorecard — environmental indicators need MES/SCADA/IoT sources that are outside the current ERP integration scope.',
  createdAt: '2026-09-17',
};

export type SustDirection = 'min' | 'max';

export interface SustKpi {
  id: string;
  label: string;
  value: number;
  unit: string;
  target?: number;
  /** Önceki pencereye göre % değişim */
  trendPct: number;
  window: string;
  direction: SustDirection;
  definition: string;
  /** Beklenen (henüz bağlı olmayan) kaynak */
  expectedSource: string;
}

export interface SustTrendPoint {
  month: string;
  energyKwhPerUnit: number;
  carbonKgPerUnit: number;
  energyTarget: number;
}

export interface SustProcessRow {
  process: string;
  energyKwh: number;
  carbonKg: number;
}

export type SustActionStatus = 'planned' | 'in-progress' | 'done';

export interface SustAction {
  id: string;
  title: string;
  status: SustActionStatus;
  owner: string;
  expectedCo2ReductionT: number;
  due: string;
}

export interface SustModel {
  company: Company;
  siteLabel: string;
  scorecard: SustKpi[];
  trend: SustTrendPoint[];
  processBreakdown: SustProcessRow[];
  actions: SustAction[];
}

const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

function trend(energy: number[], carbon: number[], energyTarget: number): SustTrendPoint[] {
  return MONTHS.map((month, i) => ({
    month,
    energyKwhPerUnit: energy[i],
    carbonKgPerUnit: carbon[i],
    energyTarget,
  }));
}

export const SUSTAINABILITY_MOCK: Record<Company, SustModel> = {
  kam: {
    company: 'kam',
    siteLabel: 'PCB & meter assembly (electronics)',
    scorecard: [
      { id: 'energy-per-unit', label: 'Energy per Unit', value: 0.86, unit: 'kWh/unit', target: 0.80, trendPct: -3.4, window: 'last 30 days', direction: 'min', definition: 'Site electricity consumption divided by finished units.', expectedSource: 'Energy meters (IoT) + IFS shop-order completions' },
      { id: 'carbon-per-unit', label: 'Carbon Footprint', value: 0.19, unit: 'kg CO2e/unit', target: 0.15, trendPct: -5.1, window: 'last 30 days', direction: 'min', definition: 'Scope 1+2 emissions per finished unit using the site grid factor.', expectedSource: 'Energy meters + grid emission factor' },
      { id: 'water-per-unit', label: 'Water Intensity', value: 1.8, unit: 'L/unit', target: 1.6, trendPct: 1.2, window: 'last 30 days', direction: 'min', definition: 'Process and sanitary water per finished unit.', expectedSource: 'Water meters (SCADA)' },
      { id: 'scrap-rate', label: 'Scrap Rate', value: 2.1, unit: '%', target: 1.5, trendPct: -0.8, window: 'last 30 days', direction: 'min', definition: 'Scrapped PCBs / panels over produced.', expectedSource: 'MES quality records' },
      { id: 'recycled-share', label: 'Recycled Material Share', value: 34, unit: '%', target: 40, trendPct: 2.0, window: 'last quarter', direction: 'max', definition: 'Recycled content in housings and packaging.', expectedSource: 'Supplier declarations (IFS purchase)' },
      { id: 'renewable-share', label: 'Renewable Electricity', value: 62, unit: '%', target: 75, trendPct: 4.5, window: 'last quarter', direction: 'max', definition: 'Share of electricity from renewable contracts.', expectedSource: 'Utility invoices' },
    ],
    trend: trend(
      [0.95, 0.94, 0.96, 0.93, 0.91, 0.90, 0.89, 0.88, 0.89, 0.87, 0.87, 0.86],
      [0.24, 0.24, 0.25, 0.23, 0.22, 0.21, 0.21, 0.20, 0.20, 0.20, 0.19, 0.19],
      0.80,
    ),
    processBreakdown: [
      { process: 'SMT reflow ovens', energyKwh: 18400, carbonKg: 4050 },
      { process: 'Calibration & test', energyKwh: 9200, carbonKg: 2020 },
      { process: 'HVAC & cleanroom', energyKwh: 7600, carbonKg: 1670 },
      { process: 'Compressed air', energyKwh: 4100, carbonKg: 900 },
      { process: 'Lighting & offices', energyKwh: 2900, carbonKg: 640 },
    ],
    actions: [
      { id: 'kam-a1', title: 'Reflow oven idle-mode scheduling', status: 'in-progress', owner: 'Production engineering', expectedCo2ReductionT: 12, due: '2026-11' },
      { id: 'kam-a2', title: 'Recycled-content housing qualification', status: 'planned', owner: 'Purchasing', expectedCo2ReductionT: 8, due: '2027-03' },
      { id: 'kam-a3', title: 'Compressed-air leak audit', status: 'done', owner: 'Maintenance', expectedCo2ReductionT: 4, due: '2026-06' },
      { id: 'kam-a4', title: 'Renewable PPA extension', status: 'planned', owner: 'Site management', expectedCo2ReductionT: 35, due: '2027-01' },
    ],
  },
  jpb: {
    company: 'jpb',
    siteLabel: 'Lock-nut machining (metal cutting)',
    scorecard: [
      { id: 'energy-per-unit', label: 'Energy per Unit', value: 0.14, unit: 'kWh/unit', target: 0.12, trendPct: -2.2, window: 'last 30 days', direction: 'min', definition: 'Machining-hall electricity divided by produced nuts.', expectedSource: 'Machine power meters (IoT) + Clipper production counts' },
      { id: 'carbon-per-unit', label: 'Carbon Footprint', value: 0.012, unit: 'kg CO2e/unit', target: 0.010, trendPct: -1.5, window: 'last 30 days', direction: 'min', definition: 'Scope 1+2 emissions per produced unit (low-carbon grid).', expectedSource: 'Power meters + grid emission factor' },
      { id: 'cutting-fluid', label: 'Cutting Fluid Consumption', value: 3.6, unit: 'L/1000 units', target: 3.0, trendPct: 0.9, window: 'last 30 days', direction: 'min', definition: 'Coolant / cutting-fluid top-up per 1,000 machined parts.', expectedSource: 'Fluid dispensing logs (SCADA)' },
      { id: 'scrap-rate', label: 'Scrap Factor', value: 0.9, unit: '%', target: 0.6, trendPct: -0.3, window: 'last 90 days', direction: 'min', definition: 'Damaged parts over produced parts.', expectedSource: 'Shop-floor quality records (MES)' },
      { id: 'chip-recycling', label: 'Metal Chip Recycling', value: 92, unit: '%', target: 95, trendPct: 0.5, window: 'last quarter', direction: 'max', definition: 'Share of machining chips returned to the steel recycler.', expectedSource: 'Waste-contractor weighbridge tickets' },
      { id: 'renewable-share', label: 'Renewable Electricity', value: 28, unit: '%', target: 40, trendPct: 3.0, window: 'last quarter', direction: 'max', definition: 'Share of electricity from renewable contracts.', expectedSource: 'Utility invoices' },
    ],
    trend: trend(
      [0.16, 0.16, 0.17, 0.16, 0.15, 0.15, 0.15, 0.14, 0.14, 0.15, 0.14, 0.14],
      [0.014, 0.014, 0.015, 0.014, 0.013, 0.013, 0.013, 0.012, 0.012, 0.013, 0.012, 0.012],
      0.12,
    ),
    processBreakdown: [
      { process: 'USI10 machining centres', energyKwh: 31200, carbonKg: 1870 },
      { process: 'CARRE / EBAVM finishing', energyKwh: 8400, carbonKg: 500 },
      { process: 'Compressed air & coolant pumps', energyKwh: 6100, carbonKg: 370 },
      { process: 'Heat treatment (subcontracted)', energyKwh: 5200, carbonKg: 310 },
      { process: 'Lighting & offices', energyKwh: 2300, carbonKg: 140 },
    ],
    actions: [
      { id: 'jpb-a1', title: 'Spindle idle shutdown on USI10', status: 'in-progress', owner: 'Methods', expectedCo2ReductionT: 6, due: '2026-12' },
      { id: 'jpb-a2', title: 'Minimum-quantity lubrication trial', status: 'planned', owner: 'Methods', expectedCo2ReductionT: 2, due: '2027-04' },
      { id: 'jpb-a3', title: 'Chip briquetting press', status: 'done', owner: 'Maintenance', expectedCo2ReductionT: 3, due: '2026-05' },
      { id: 'jpb-a4', title: 'Rooftop PV feasibility', status: 'planned', owner: 'Site management', expectedCo2ReductionT: 18, due: '2027-06' },
    ],
  },
};
