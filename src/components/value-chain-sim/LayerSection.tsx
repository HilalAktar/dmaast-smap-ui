import { SHOCK_FIELDS, type LayerDef } from './constants/layers';
import type { PlanningMethod, ShockKey, ShockValues } from '../../data/mock/valueChainSimMock';
import type { PlanningChangeHandler, PlanningState } from './types';

interface LayerSectionProps {
  layer: LayerDef;
  shocks: ShockValues;
  onShockChange: (key: ShockKey, val: number) => void;
  planning: PlanningState;
  onPlanningChange: PlanningChangeHandler;
  collapsed: boolean;
  onToggle: () => void;
}

export default function LayerSection({
  layer,
  shocks,
  onShockChange,
  planning,
  onPlanningChange,
  collapsed,
  onToggle,
}: LayerSectionProps) {
  const fields = SHOCK_FIELDS[layer.key];
  const isL3 = layer.key === 'L3';
  const LayerIcon = layer.Icon;

  return (
    <div className="layer-section">
      <div className="layer-header" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <span className={`layer-icon layer-icon--${layer.key}`}>
          <LayerIcon size={16} />
        </span>
        <span className="layer-name">{layer.name}</span>
        <span className="layer-toggle">{collapsed ? '▸' : '▾'}</span>
      </div>
      {!collapsed && (
        <div className="layer-body">
          {isL3 && (
            <div className="policy-group">
              <label>
                Safety Stock multiplier
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.05"
                  value={planning.safety_stock_mult}
                  onChange={(e) => onPlanningChange('safety_stock_mult', parseFloat(e.target.value))}
                />
                <span className="slider-val">{planning.safety_stock_mult.toFixed(2)}x</span>
              </label>
              <label>
                Min Lot Size multiplier
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.05"
                  value={planning.min_lot_mult}
                  onChange={(e) => onPlanningChange('min_lot_mult', parseFloat(e.target.value))}
                />
                <span className="slider-val">{planning.min_lot_mult.toFixed(2)}x</span>
              </label>
              <label>
                Planning Method
                <select
                  value={planning.planning_method}
                  onChange={(e) => onPlanningChange('planning_method', e.target.value as PlanningMethod)}
                >
                  <option value="base_stock">Base Stock</option>
                  <option value="lot_for_lot">Lot for Lot</option>
                  <option value="period_order_qty">Period Order Qty</option>
                </select>
              </label>
              <label>
                Review Interval (days)
                <input
                  type="number"
                  min="0.5"
                  max="30"
                  step="0.5"
                  value={planning.review_interval_days}
                  onChange={(e) => onPlanningChange('review_interval_days', parseFloat(e.target.value) || 1)}
                />
              </label>
            </div>
          )}
          {fields.map((f) => {
            const min = f.min ?? -80;
            const max = f.max ?? 200;
            const step = f.step ?? 5;
            const val = shocks[f.key] || 0;
            return (
              <label key={f.key} className="shock-slider">
                <span>{f.label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={val}
                  onChange={(e) => onShockChange(f.key, parseFloat(e.target.value))}
                />
                <span
                  className="slider-val"
                  style={{ color: val > 0 ? 'var(--warning)' : val < 0 ? 'var(--success)' : 'var(--text-faint)' }}
                >
                  {val > 0 ? '+' : ''}
                  {val}%
                </span>
                {f.hint && <span className="shock-hint">{f.hint}</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
