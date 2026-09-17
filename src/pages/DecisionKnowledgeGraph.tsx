import { useMemo, useState } from 'react';
import { Share2, Search, ArrowRight, ArrowLeft } from 'lucide-react';
import Header from '../components/layout/Header';
import { MockDataBadge, MockDataNotice } from '../components/shared/MockDataBadge';
import { useCompany } from '../contexts/CompanyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { tx } from '../i18n/tx';
import {
  DKG_MOCK,
  DKG_MOCK_PROVENANCE,
  DKG_NODE_TYPES,
  getNeighbours,
  type DkgNodeType,
} from '../data/mock/knowledgeGraphMock';

/**
 * Decision Knowledge Graph — MOCK bilgi grafiği.
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-09-17): "Planned" yer tutucu yerine
 * tür filtresi + SVG düğüm-kenar görünümü + seçili düğüm ayrıntısı + düğüm
 * tablosu. Veri: src/data/mock/knowledgeGraphMock.ts (firma bazlı).
 * Sayfa tüm rollere açık (App.tsx rotası izin kapısı taşımaz).
 */

const TYPE_COLOR: Record<DkgNodeType, string> = {
  decision: '#0066b3',
  kpi: '#10b981',
  scenario: '#f59e0b',
  process: '#8b5cf6',
  datasource: '#737373',
  actor: '#2a9d8f',
};

const TYPE_BADGE: Record<DkgNodeType, string> = {
  decision: 'bg-primary-50 text-primary-700 border-primary-200',
  kpi: 'bg-stock-light text-stock-dark border-stock',
  scenario: 'bg-cost-light text-cost-dark border-cost',
  process: 'bg-resource-light text-resource-dark border-resource',
  datasource: 'bg-surface-100 text-surface-600 border-surface-300',
  actor: 'bg-secondary-50 text-secondary-700 border-secondary-200',
};

const VIEW_W = 1000;
const VIEW_H = 620;
const NODE_R = 16;

export default function DecisionKnowledgeGraph() {
  const { t } = useLanguage();
  const { company, config } = useCompany();
  const model = DKG_MOCK[company];

  const [activeTypes, setActiveTypes] = useState<Set<DkgNodeType>>(() => new Set(DKG_NODE_TYPES.map((x) => x.type)));
  const [selectedId, setSelectedId] = useState<string | null>(model.nodes[0]?.id ?? null);
  const [query, setQuery] = useState('');

  const nodeById = useMemo(() => new Map(model.nodes.map((n) => [n.id, n])), [model]);
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of model.edges) {
      d.set(e.from, (d.get(e.from) ?? 0) + 1);
      d.set(e.to, (d.get(e.to) ?? 0) + 1);
    }
    return d;
  }, [model]);

  const isVisible = (id: string) => {
    const n = nodeById.get(id);
    return !!n && activeTypes.has(n.type);
  };
  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;
  const neighbours = selected ? getNeighbours(model, selected.id) : [];
  const neighbourIds = new Set(neighbours.map((n) => n.other.id));

  const toggleType = (type: DkgNodeType) =>
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const q = query.trim().toLowerCase();
  const tableNodes = model.nodes.filter((n) => activeTypes.has(n.type) && (q === '' || n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)));

  const px = (x: number) => (x / 100) * (VIEW_W - 2 * 40) + 40;
  const py = (y: number) => (y / 100) * (VIEW_H - 2 * 40) + 40;

  return (
    <div className="min-h-screen">
      <Header
        title={tx(t, 'dkg.title', 'Decision Knowledge Graph')}
        subtitle={tx(t, 'dkg.subtitle', 'Mock graph of decisions, KPIs, scenarios, processes, data sources and actors')}
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <MockDataNotice text={DKG_MOCK_PROVENANCE.note} />

        <div className="bg-white rounded-xl shadow-card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${config.accent}`}>{config.label}</span>
          <span className="text-surface-600 inline-flex items-center gap-1">
            <Share2 className="w-4 h-4 text-primary-500" aria-hidden="true" />
            {model.nodes.length} {tx(t, 'dkg.nodes', 'nodes')} · {model.edges.length} {tx(t, 'dkg.edges', 'relations')}
          </span>
          <span className="text-surface-600">ERP: <span className="font-medium text-surface-900">{config.erp}</span></span>
          <MockDataBadge className="ml-auto" />
        </div>

        {/* Type filter */}
        <div className="bg-white rounded-xl shadow-card p-4 flex flex-wrap items-center gap-2" role="group" aria-label="Node type filter">
          <span className="text-xs text-surface-500 mr-2">{tx(t, 'dkg.filter', 'Show')}:</span>
          {DKG_NODE_TYPES.map((tp) => {
            const on = activeTypes.has(tp.type);
            return (
              <button
                key={tp.type}
                type="button"
                aria-pressed={on}
                onClick={() => toggleType(tp.type)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${on ? TYPE_BADGE[tp.type] : 'bg-white text-surface-400 border-surface-200 line-through'}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[tp.type] }} aria-hidden="true" />
                {tp.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:gap-6 grid-cols-1 xl:grid-cols-3">
          {/* Graph */}
          <div className="bg-white rounded-xl shadow-card p-4 xl:col-span-2">
            <h3 className="font-semibold text-surface-900 mb-1">{tx(t, 'dkg.graph', 'Graph View')}</h3>
            <p className="text-xs text-surface-500 mb-2">{tx(t, 'dkg.graphHint', 'Click or focus a node (Enter) to inspect its relations. Arrows point from source to target.')}</p>
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" role="img" aria-label="Decision knowledge graph">
              <defs>
                <marker id="dkg-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#a3a3a3" />
                </marker>
                <marker id="dkg-arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#0066b3" />
                </marker>
              </defs>
              {model.edges.map((e, i) => {
                if (!isVisible(e.from) || !isVisible(e.to)) return null;
                const a = nodeById.get(e.from)!;
                const b = nodeById.get(e.to)!;
                const x1 = px(a.x);
                const y1 = py(a.y);
                const x2 = px(b.x);
                const y2 = py(b.y);
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.hypot(dx, dy) || 1;
                const ex = x2 - (dx / len) * (NODE_R + 2);
                const ey = y2 - (dy / len) * (NODE_R + 2);
                const active = selected && (e.from === selected.id || e.to === selected.id);
                return (
                  <line
                    key={`${e.from}-${e.to}-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={ex}
                    y2={ey}
                    stroke={active ? '#0066b3' : '#d4d4d4'}
                    strokeWidth={active ? 2.5 : 1.5}
                    markerEnd={active ? 'url(#dkg-arrow-active)' : 'url(#dkg-arrow)'}
                    opacity={selected && !active ? 0.5 : 1}
                  />
                );
              })}
              {model.nodes.map((n) => {
                if (!activeTypes.has(n.type)) return null;
                const isSel = selected?.id === n.id;
                const isNb = neighbourIds.has(n.id);
                const dim = selected && !isSel && !isNb;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${px(n.x)}, ${py(n.y)})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${n.label} (${n.type})`}
                    aria-pressed={isSel}
                    onClick={() => setSelectedId(n.id)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        setSelectedId(n.id);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                    opacity={dim ? 0.35 : 1}
                  >
                    <circle r={NODE_R} fill={TYPE_COLOR[n.type]} stroke={isSel ? '#f59e0b' : '#ffffff'} strokeWidth={isSel ? 4 : 2} />
                    <text y={NODE_R + 14} textAnchor="middle" fontSize={12} fill="#404040" style={{ pointerEvents: 'none' }}>
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl shadow-card p-5">
            <h3 className="font-semibold text-surface-900 mb-3">{tx(t, 'dkg.details', 'Node Details')}</h3>
            {!selected ? (
              <p className="text-sm text-surface-500">{tx(t, 'dkg.noSelection', 'Select a node to see its details.')}</p>
            ) : (
              <>
                <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[selected.type]}`}>{selected.type}</span>
                <h4 className="mt-2 text-lg font-semibold text-surface-900">{selected.label}</h4>
                <p className="mt-1 text-sm text-surface-600">{selected.description}</p>
                <p className="mt-1 font-mono text-xs text-surface-400">{selected.id} · degree {degree.get(selected.id) ?? 0}</p>
                <h5 className="mt-4 text-xs font-medium uppercase tracking-wider text-surface-500">{tx(t, 'dkg.relations', 'Relations')}</h5>
                {neighbours.length === 0 ? (
                  <p className="mt-1 text-sm text-surface-500">{tx(t, 'dkg.noRelations', 'No relations.')}</p>
                ) : (
                  <ul className="mt-1 divide-y divide-surface-100">
                    {neighbours.map(({ edge, other, direction }) => (
                      <li key={`${edge.from}-${edge.to}-${edge.relation}`} className="py-2 text-sm">
                        <button type="button" onClick={() => setSelectedId(other.id)} className="flex w-full items-center gap-2 text-left hover:text-primary-700">
                          {direction === 'out' ? <ArrowRight className="w-3.5 h-3.5 text-surface-400" aria-hidden="true" /> : <ArrowLeft className="w-3.5 h-3.5 text-surface-400" aria-hidden="true" />}
                          <span className="text-xs text-surface-500 w-24 shrink-0">{edge.relation.replace('_', ' ')}</span>
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLOR[other.type] }} aria-hidden="true" />
                          <span className="font-medium text-surface-900 truncate">{other.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>

        {/* Node table */}
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="font-semibold text-surface-900">{tx(t, 'dkg.table', 'Nodes')}</h3>
            <label className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tx(t, 'dkg.search', 'Search nodes…')}
                className="rounded-lg border border-surface-200 pl-8 pr-3 py-1.5 text-sm w-64"
                aria-label="Search nodes"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-surface-500 border-b border-surface-200">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4 text-right">Degree</th>
                </tr>
              </thead>
              <tbody>
                {tableNodes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-surface-500">{tx(t, 'dkg.empty', 'No nodes match the filter.')}</td>
                  </tr>
                ) : (
                  tableNodes.map((n) => (
                    <tr
                      key={n.id}
                      onClick={() => setSelectedId(n.id)}
                      className={`cursor-pointer border-b border-surface-100 last:border-b-0 ${selectedId === n.id ? 'bg-primary-50' : 'hover:bg-surface-50'}`}
                    >
                      <td className="py-2 pr-4">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[n.type]}`}>{n.type}</span>
                      </td>
                      <td className="py-2 pr-4 font-medium text-surface-900">{n.label}</td>
                      <td className="py-2 pr-4 text-surface-600">{n.description}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{degree.get(n.id) ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
