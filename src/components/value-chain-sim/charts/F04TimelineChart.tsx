import { useMemo } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getChart, getTooltipContentStyle, type ThemeName } from '../theme';
import type { SimResults } from '../../../data/mock/valueChainSimMock';

interface TimelineRow {
  day: number;
  demand_qty: number;
  production_qty: number;
  delivery_qty: number;
  cum_demand: number;
  cum_production: number;
  cum_delivery: number;
}

const fmtInt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

interface F04TimelineChartProps {
  results: SimResults | null;
  productId?: string;
  theme: ThemeName;
}

/**
 * F04 finished-good order-to-delivery timeline.
 *
 * Three series share the same time axis (day):
 *   - Demand              → daily incoming order qty (bars, red)
 *   - Production          → daily completed F04 production qty (line, green)
 *   - Delivery / Shipment → daily F04 shipped qty (line, blue)
 *
 * The chart only depicts the finished good (F04). Component- and
 * sub-assembly-level activity is intentionally excluded.
 */
export default function F04TimelineChart({ results, productId = '021XBXXXXXXF04', theme }: F04TimelineChartProps) {
  const data = useMemo<TimelineRow[]>(() => {
    const demand = results?.demand_events || [];
    const production = results?.production_events || [];
    const shipments = results?.shipment_events || [];
    const horizon = Math.max(0, Math.floor(results?.kpis?.horizon_days || 0));

    if (!horizon || (demand.length === 0 && production.length === 0 && shipments.length === 0)) {
      return [];
    }

    // One row per integer day across the simulated horizon so the x-axis is
    // continuous (idle days are kept instead of collapsing the timeline).
    const days = new Map<number, TimelineRow>();
    const ensure = (d: number): TimelineRow => {
      const key = Math.max(0, Math.floor(d));
      let row = days.get(key);
      if (!row) {
        row = {
          day: key,
          demand_qty: 0,
          production_qty: 0,
          delivery_qty: 0,
          cum_demand: 0,
          cum_production: 0,
          cum_delivery: 0,
        };
        days.set(key, row);
      }
      return row;
    };

    for (let d = 0; d <= horizon; d += 1) ensure(d);

    for (const ev of demand) {
      ensure(ev.t).demand_qty += Number(ev.sales_qty) || 0;
    }
    for (const ev of production) {
      ensure(ev.t_output).production_qty += Number(ev.finished_output_qty) || 0;
    }
    for (const ev of shipments) {
      ensure(ev.delivery_time).delivery_qty += Number(ev.alloc_qty) || 0;
    }

    const sorted = [...days.values()].sort((a, b) => a.day - b.day);
    let cD = 0;
    let cP = 0;
    let cS = 0;
    for (const r of sorted) {
      cD += r.demand_qty;
      cP += r.production_qty;
      cS += r.delivery_qty;
      r.cum_demand = cD;
      r.cum_production = cP;
      r.cum_delivery = cS;
    }
    return sorted;
  }, [results]);

  if (!data.length) return null;

  const totalDemand = data[data.length - 1]?.cum_demand ?? 0;
  const totalProduction = data[data.length - 1]?.cum_production ?? 0;
  const totalDelivery = data[data.length - 1]?.cum_delivery ?? 0;

  const chart = getChart(theme);
  const tooltipContentStyle = getTooltipContentStyle(theme);

  return (
    <section className="f04-timeline">
      <header className="f04-timeline__header">
        <h3 className="f04-timeline__title">{productId} — Order ▸ Production ▸ Delivery Timeline</h3>
        <div className="f04-timeline__legend-strip">
          <span className="f04-timeline__chip f04-timeline__chip--demand">Demand: {fmtInt(totalDemand)}</span>
          <span className="f04-timeline__chip f04-timeline__chip--production">Produced: {fmtInt(totalProduction)}</span>
          <span className="f04-timeline__chip f04-timeline__chip--delivery">Delivered: {fmtInt(totalDelivery)}</span>
        </div>
      </header>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 24, left: 40, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
          <XAxis
            dataKey="day"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: chart.axis }}
            stroke={chart.grid}
            label={{ value: 'Day', position: 'insideBottom', offset: -5, fill: chart.axisLabel }}
          />
          <YAxis
            tick={{ fill: chart.axis }}
            stroke={chart.grid}
            label={{ value: 'Quantity', angle: -90, position: 'insideLeft', fill: chart.axisLabel }}
            tickFormatter={(v) => (Number.isFinite(+v) ? fmtInt(+v) : '0')}
          />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelFormatter={(d) => `Day ${d}`}
            formatter={(value, name) => [fmtInt(Number(value) || 0), name]}
          />
          <Legend wrapperStyle={{ paddingTop: 6, fontSize: 12 }} />
          <Bar dataKey="demand_qty" name="Demand (orders)" fill={chart.demand} fillOpacity={1} barSize={6} isAnimationActive={false} />
          <Line
            type="stepAfter"
            dataKey="production_qty"
            name="F04 Produced"
            stroke={chart.production}
            strokeWidth={2}
            isAnimationActive={false}
            dot={{ r: 2.5, fill: chart.production }}
          />
          <Line
            type="stepAfter"
            dataKey="delivery_qty"
            name="F04 Delivered"
            stroke={chart.delivery}
            strokeWidth={2}
            isAnimationActive={false}
            dot={{ r: 2.5, fill: chart.delivery }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <h4 className="f04-timeline__subtitle">Cumulative</h4>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 24, left: 40, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
          <XAxis
            dataKey="day"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: chart.axis }}
            stroke={chart.grid}
            label={{ value: 'Day', position: 'insideBottom', offset: -5, fill: chart.axisLabel }}
          />
          <YAxis tick={{ fill: chart.axis }} stroke={chart.grid} tickFormatter={(v) => (Number.isFinite(+v) ? fmtInt(+v) : '0')} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelFormatter={(d) => `Day ${d}`}
            formatter={(value, name) => [fmtInt(Number(value) || 0), name]}
          />
          <Legend wrapperStyle={{ paddingTop: 6, fontSize: 12 }} />
          <Line type="stepAfter" dataKey="cum_demand" name="Cumulative Demand" stroke={chart.demand} strokeWidth={2} isAnimationActive={false} dot={false} />
          <Line type="stepAfter" dataKey="cum_production" name="Cumulative Production" stroke={chart.production} strokeWidth={2} isAnimationActive={false} dot={false} />
          <Line type="stepAfter" dataKey="cum_delivery" name="Cumulative Delivery" stroke={chart.delivery} strokeWidth={2} isAnimationActive={false} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}
