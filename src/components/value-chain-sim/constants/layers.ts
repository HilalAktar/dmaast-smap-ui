import { Factory, PackageOpen, Warehouse, Cog, Truck, User, type LucideIcon } from 'lucide-react';
import type { ShockKey, ShockValues } from '../../../data/mock/valueChainSimMock';

export type LayerKey = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

export interface LayerDef {
  key: LayerKey;
  name: string;
  color: string;
  Icon: LucideIcon;
}

// Muted, low-saturation supply-chain stage accents. Aligned with the
// --l1..--l6 tokens in styles/vcdt.css.
export const LAYERS: LayerDef[] = [
  { key: 'L1', name: 'Supplier', color: '#1E40AF', Icon: Factory },
  { key: 'L2', name: 'Inbound', color: '#0E7490', Icon: PackageOpen },
  { key: 'L3', name: 'Warehouse', color: '#15803D', Icon: Warehouse },
  { key: 'L4', name: 'Production', color: '#B45309', Icon: Cog },
  { key: 'L5', name: 'Outbound', color: '#6D28D9', Icon: Truck },
  { key: 'L6', name: 'Customer', color: '#475569', Icon: User },
];

export interface ShockFieldDef {
  key: ShockKey;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

// Each shock field can optionally override the default slider range (-80..200)
// and carry a hint that explains its semantic to the user.
export const SHOCK_FIELDS: Record<LayerKey, ShockFieldDef[]> = {
  L1: [
    { key: 'Supplier_Lead_Time_pct', label: 'Supplier Lead Time' },
    {
      key: 'Fill_Rate_pct',
      label: 'Fill Rate (under / over-delivery)',
      min: -100,
      max: 50,
      step: 5,
    },
    { key: 'Defect_Rate_pct', label: 'Defect Rate' },
    {
      key: 'Order_Quantity_pct',
      label: 'Order Quantity (warehouse capacity)',
      min: -50,
      max: 300,
      step: 5,
    },
  ],
  L2: [{ key: 'Arrival_Delay_Days_pct', label: 'Arrival Delay Days' }],
  L3: [],
  L4: [
    { key: 'Production_Duration_Days_pct', label: 'Production Duration Days' },
    { key: 'Completion_Rate_pct', label: 'Completion Rate' },
  ],
  L5: [{ key: 'Ship_Delay_Days_pct', label: 'Ship Delay Days' }],
  L6: [
    { key: 'Sales_Qty_pct', label: 'Sales Qty' },
    { key: 'Interarrival_Time_pct', label: 'Interarrival Time' },
  ],
};

export const initShocks = (): ShockValues => {
  const s = {} as ShockValues;
  Object.values(SHOCK_FIELDS)
    .flat()
    .forEach((f) => {
      s[f.key] = 0;
    });
  return s;
};
