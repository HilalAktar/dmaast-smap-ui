import { Play, RotateCcw, FlaskConical } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ShockConfig } from '../../data/sim/simContract';

/**
 * SimControls — phase-B "what-if" control SHELL for the value-chain simulation.
 *
 * Renders one slider per shock knob present in the loaded result's
 * `config.shocks` (role-based: KAM ~10 knobs, JPB adds 3) plus a "Run" action.
 *
 * PHASE-B BOUNDARY (honest, no fabrication): the pre-generated artifact carries
 * a single baseline scenario, so dragging a slider does NOT recompute anything —
 * "Run" reloads the same role-based artifact through the SimSource seam. The demo
 * badge/note states this plainly. The knob values are forwarded through the
 * SimSource (`opts.shocks`), which phase B ignores and phase A will send to the
 * live twin — so these controls bind to the live source later with NO rewrite.
 */

type Translate = (key: string) => string;
function tx(t: Translate, key: string, fallback: string): string {
  const out = t(key);
  return out === key ? fallback : out;
}

// Canonical display order (matches ShockConfig); only keys present in the loaded
// scenario are shown, so KAM/JPB asymmetry falls out of the data.
const SHOCK_ORDER: (keyof ShockConfig)[] = [
  'Sales_Qty_pct',
  'Interarrival_Time_pct',
  'Order_Quantity_pct',
  'Supplier_Lead_Time_pct',
  'Fill_Rate_pct',
  'Arrival_Delay_Days_pct',
  'Defect_Rate_pct',
  'Production_Duration_Days_pct',
  'Completion_Rate_pct',
  'Ship_Delay_Days_pct',
  'Subcontract_Lead_Time_pct',
  'Rework_pct',
  'Quality_Hold_pct',
];

const SHOCK_MIN = -50;
const SHOCK_MAX = 50;
const SHOCK_STEP = 5;

function prettify(key: string): string {
  return key.replace(/_pct$/, '').replace(/_/g, ' ');
}

export interface SimControlsProps {
  /** Baseline knobs from the loaded result's `config.shocks` (role-based). */
  baselineShocks: Partial<ShockConfig>;
  /** Current per-knob user overrides (absent key = baseline). */
  overrides: Record<string, number>;
  onChange: (key: string, value: number) => void;
  onRun: () => void;
  onReset: () => void;
  /** True while a run is loading. */
  busy?: boolean;
}

export default function SimControls({
  baselineShocks,
  overrides,
  onChange,
  onRun,
  onReset,
  busy = false,
}: SimControlsProps) {
  const { t } = useLanguage();

  const keys = SHOCK_ORDER.filter((k) => k in baselineShocks).map(String);
  const hasOverride = keys.some((k) => (overrides[k] ?? 0) !== 0);

  const valueOf = (k: string): number => {
    const base = typeof baselineShocks[k as keyof ShockConfig] === 'number' ? (baselineShocks[k as keyof ShockConfig] as number) : 0;
    return overrides[k] ?? base;
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h3 className="font-semibold text-surface-900 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary-500" />
          {tx(t, 'vcsim.controls.title', 'Simulation Controls')}
        </h3>
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
          {tx(t, 'vcsim.controls.demoBadge', 'Demo')}
        </span>
      </div>

      {/* Honest phase-B disclosure: fixed scenario, live recompute is phase A. */}
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
        {tx(
          t,
          'vcsim.controls.demoNote',
          'Demo: fixed scenario — live/interactive recompute coming soon (phase A). The knobs below are wired through the SimSource seam but do not change this pre-generated result yet.',
        )}
      </p>

      {keys.length === 0 ? (
        <p className="text-sm text-surface-500">
          {tx(t, 'vcsim.controls.noShocks', 'No adjustable parameters in this scenario.')}
        </p>
      ) : (
        <>
          <p className="text-xs text-surface-500 mb-3">
            {tx(t, 'vcsim.controls.shocksHint', 'What-if shock knobs (% deviation from baseline), mapped to the run configuration.')}
          </p>
          <div className="grid gap-x-6 gap-y-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {keys.map((k) => {
              const v = valueOf(k);
              return (
                <label key={k} className="flex flex-col gap-1">
                  <span className="flex items-center justify-between text-sm text-surface-700">
                    <span className="truncate pr-2">{tx(t, `vcsim.shock.${k}`, prettify(k))}</span>
                    <span className={`tabular-nums text-xs font-medium ${v === 0 ? 'text-surface-400' : 'text-primary-600'}`}>
                      {v > 0 ? '+' : ''}{v}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min={SHOCK_MIN}
                    max={SHOCK_MAX}
                    step={SHOCK_STEP}
                    value={v}
                    onChange={(e) => onChange(k, Number(e.target.value))}
                    className="w-full accent-primary-500"
                    aria-label={tx(t, `vcsim.shock.${k}`, prettify(k))}
                  />
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              type="button"
              onClick={onRun}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
            >
              <Play className="w-4 h-4" />
              {busy ? tx(t, 'common.loading', 'Loading...') : tx(t, 'vcsim.controls.run', 'Run Simulation')}
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={!hasOverride || busy}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-lg border border-surface-200 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {tx(t, 'vcsim.controls.reset', 'Reset')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
