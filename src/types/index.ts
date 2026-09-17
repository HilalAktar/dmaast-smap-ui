export type KpiCluster = 'delivery' | 'cost' | 'stock' | 'resource' | 'energy';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface KpiData {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend?: number;
  target?: number;
  cluster: KpiCluster;
  sparklineData?: number[];
  definition?: string;
  dataSource?: string;
  helpUrl?: string;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  source: string;
  acknowledged: boolean;
  /**
   * Kartlardaki CardScope ile ayni kural: belirtilmemis olan iki
   * arayuzde de gecerlidir. Isıl karari 2026-08-31.
   */
  scope?: 'kam' | 'jpb' | 'both';
  /**
   * Alarmin ARKASINDAKI gercek tablo/kolon ve olculen deger.
   * KpiData.dataSource ile ayni sozlesme — rakam yer tutucu olabilir,
   * dayanak olamaz.
   */
  dataSource?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: NavigationItem[];
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  target?: number;
}

export interface ParetoSolution {
  id: string;
  objectives: Record<string, number>;
  selected?: boolean;
}

export interface DigitalTwinNode {
  id: string;
  name: string;
  type: 'supplier' | 'manufacturer' | 'logistics' | 'customer';
  status: 'active' | 'warning' | 'critical';
  metrics: KpiData[];
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number>;
  results?: SimulationResult;
}

export interface SimulationResult {
  objectives: Record<string, number>;
  timestamp: Date;
  duration: number;
}

export interface HitlValidationTask {
  id: string;
  title: string;
  description: string;
  type: 'anomaly' | 'confirm' | 'override';
  source: string;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
}
