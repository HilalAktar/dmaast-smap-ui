// Per-node shock field catalogue.
//
// For each BOM subtype we expose the shock metrics that physically make sense
// at that node. Applying shocks on non-applicable metrics is technically OK
// (the composer just adds zero to the pct total), but the UI is cleaner when
// we hide the irrelevant sliders.
import type { NodeShockScope, ShockKey } from '../../../data/mock/valueChainSimMock';

export interface NodeShockFieldDef {
  key: ShockKey;
  label: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
}

interface NodeLike {
  subtype?: string | null;
  partType?: string | null;
}

const PROCUREMENT_FIELDS: NodeShockFieldDef[] = [
  {
    key: 'Supplier_Lead_Time_pct',
    label: 'Supplier Lead Time',
    min: -80, max: 200, step: 5,
    hint: '+% extends the supplier LT for this node.',
  },
  {
    key: 'Arrival_Delay_Days_pct',
    label: 'Arrival Delay',
    min: -100, max: 300, step: 5,
    hint: '+% stretches inbound logistics delay.',
  },
  {
    key: 'Fill_Rate_pct',
    label: 'Fill Rate (under / over-delivery)',
    min: -100, max: 50, step: 5,
    hint: '0 = full delivery. -10 = 10% short (triggers PO). +10 = 10% over-delivery.',
  },
  {
    key: 'Defect_Rate_pct',
    label: 'Defect Rate',
    min: -100, max: 300, step: 5,
    hint: '+% increases the fraction of scrapped arrivals.',
  },
  {
    key: 'Order_Quantity_pct',
    label: 'Order Quantity (warehouse capacity)',
    min: -50, max: 300, step: 5,
    hint: '+% inflates every supplier PO. Excess units stay in the warehouse.',
  },
];

const PRODUCTION_FIELDS: NodeShockFieldDef[] = [
  {
    key: 'Production_Duration_Days_pct',
    label: 'Production Duration',
    min: -80, max: 200, step: 5,
  },
  {
    key: 'Completion_Rate_pct',
    label: 'Completion Rate',
    min: -50, max: 50, step: 5,
  },
];

// Decide which family of fields is meaningful for a given BOM subtype / partType.
export function getNodeShockFields(node: NodeLike | null | undefined): NodeShockFieldDef[] {
  if (!node) return [];
  const subtype = node.subtype || '';
  const pt = (node.partType || '').toLowerCase();

  if (subtype === 'FinishedGood') {
    // FG: the whole assembly's procurement + production knobs matter. We expose
    // production here and let the Layer panel carry the global procurement knob.
    return PRODUCTION_FIELDS;
  }
  if (subtype === 'SubAssembly') {
    return PRODUCTION_FIELDS;
  }
  // Purchased / Expense leaves → procurement family.
  if (pt.includes('purchased') || pt.includes('expense') || subtype === 'Component' || subtype === 'Expense') {
    return PROCUREMENT_FIELDS;
  }
  return PROCUREMENT_FIELDS;
}

// Scopes that make sense for a given subtype.
//   - Leaves (Component / Expense): always `node` — there is no subtree below
//     a leaf, so cascading is meaningless.
//   - Parents (FG, SubAssembly): only `subtree`, so the node-shock is
//     semantically equivalent to a scoped global shock and stacks additively
//     with the L4 layer slider as users expect.
export function getNodeShockScopes(node: NodeLike | null | undefined): NodeShockScope[] {
  const subtype = node?.subtype || '';
  if (subtype === 'FinishedGood' || subtype === 'SubAssembly') {
    return ['subtree'];
  }
  return ['node'];
}

// Default scope mirrors the only available scope for each subtype.
export function getDefaultNodeShockScope(node: NodeLike | null | undefined): NodeShockScope {
  const subtype = node?.subtype || '';
  if (subtype === 'FinishedGood' || subtype === 'SubAssembly') return 'subtree';
  return 'node';
}
