import { useMemo, useState } from 'react';
import { Check, RotateCcw, CalendarClock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRole } from '../../contexts/RoleContext';
import { tx } from '../../i18n/tx';
import { MockDataBadge } from './MockDataBadge';
import {
  LIKERT_LABELS,
  SURVEY_INSTRUMENTS,
  SURVEY_MOCK_PROVENANCE,
  SurveyInstrumentId,
  computeSusScore,
  susTargetScore,
} from '../../data/mock/surveyMock';

/**
 * User Experience Survey — SO1.3 değerlendirme aracı.
 *
 * Işıl kararı (2026-09-23): geri çekilen HITL doğrulama görev listesinin yerine
 * bu kart gelir. MS8 §2.6 ve SO1.3 KPI'sı SUS/PSSUQ/CSAT/UEQ'yu birlikte anıyor;
 * burada SUS ve CSAT arayüz içinden uygulanabilir, PSSUQ ve UEQ protokolde
 * beyan edilir ve T5.2'ye işaretlidir.
 *
 * Cevaplar oturum durumunda kalır — hiçbir yere gönderilmez.
 */

interface ResponseLogEntry {
  id: number;
  instrument: SurveyInstrumentId;
  score: number | null;
  role: string;
  at: Date;
}

export default function UxSurvey() {
  const { t } = useLanguage();
  const { role } = useRole();

  const [activeId, setActiveId] = useState<SurveyInstrumentId>('sus');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [log, setLog] = useState<ResponseLogEntry[]>([]);
  const [submitted, setSubmitted] = useState<number | null>(null);

  const active = useMemo(
    () => SURVEY_INSTRUMENTS.find((i) => i.id === activeId) ?? SURVEY_INSTRUMENTS[0],
    [activeId],
  );

  const answered = active.items.filter((i) => typeof answers[i.id] === 'number').length;
  const complete = active.items.length > 0 && answered === active.items.length;

  const score = useMemo(() => {
    if (!complete) return null;
    if (active.id === 'sus') return computeSusScore(active.items, answers);
    if (active.id === 'csat') {
      const v = answers[active.items[0].id];
      return typeof v === 'number' ? v : null;
    }
    return null;
  }, [active, answers, complete]);

  const target = active.benchmark !== null ? susTargetScore(active.benchmark) : null;
  const meetsTarget = score !== null && target !== null && score >= target;

  const pick = (itemId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
    setSubmitted(null);
  };

  const submit = () => {
    if (!complete) return;
    const entry: ResponseLogEntry = {
      id: Date.now(),
      instrument: active.id,
      score,
      role,
      at: new Date(),
    };
    setLog((prev) => [entry, ...prev].slice(0, 5));
    setSubmitted(entry.id);
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(null);
  };

  const switchTo = (id: SurveyInstrumentId) => {
    setActiveId(id);
    setAnswers({});
    setSubmitted(null);
  };

  return (
    <section aria-label={tx(t, 'survey.title', 'User Experience Survey')} className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-end mb-3">
        <MockDataBadge />
      </div>

      <p className="text-xs text-surface-600 mb-3">
        {tx(
          t,
          'survey.intro',
          'Standardised usability instruments administered from within the platform, supporting the SO1.3 satisfaction KPI. Responses remain in this session.',
        )}
      </p>

      {/* Araç seçimi */}
      <div
        role="tablist"
        aria-label={tx(t, 'survey.instruments', 'Survey instruments')}
        className="flex flex-wrap gap-1.5 mb-3"
      >
        {SURVEY_INSTRUMENTS.map((inst) => {
          const isActive = inst.id === activeId;
          return (
            <button
              key={inst.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => switchTo(inst.id)}
              title={inst.name}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-surface-700 border-surface-200 hover:bg-surface-50'
              }`}
            >
              {inst.shortName}
              {!inst.implemented && (
                <span className="ml-1 opacity-70" aria-hidden="true">
                  ·
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 pr-1">
        {active.implemented ? (
          <>
            <fieldset className="border-0 p-0 m-0">
              <legend className="sr-only">{active.name}</legend>
              <ol className="space-y-3">
                {active.items.map((item, idx) => (
                  <li key={item.id}>
                    <p className="text-xs text-surface-800 mb-1.5">
                      <span className="text-surface-400 mr-1">{idx + 1}.</span>
                      {item.text}
                    </p>
                    <div
                      role="radiogroup"
                      aria-label={item.text}
                      className="flex gap-1"
                    >
                      {LIKERT_LABELS.map((label, i) => {
                        const value = i + 1;
                        const chosen = answers[item.id] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={chosen}
                            aria-label={`${value} — ${label}`}
                            title={label}
                            onClick={() => pick(item.id, value)}
                            className={`w-8 h-8 text-xs rounded-md border transition-colors ${
                              chosen
                                ? 'bg-primary-600 text-white border-primary-600 font-semibold'
                                : 'bg-white text-surface-600 border-surface-200 hover:border-primary-300'
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ol>
            </fieldset>

            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-surface-100">
              <span className="text-xs text-surface-500" aria-live="polite">
                {answered}/{active.items.length} {tx(t, 'survey.answered', 'answered')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  {tx(t, 'survey.reset', 'Reset')}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!complete}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-700 inline-flex items-center gap-1"
                >
                  <Check className="w-3 h-3" aria-hidden="true" />
                  {tx(t, 'survey.submit', 'Submit')}
                </button>
              </div>
            </div>

            {submitted !== null && score !== null && (
              <div
                role="status"
                className={`mt-3 rounded-lg border px-3 py-2.5 ${
                  meetsTarget
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <p className="text-sm font-semibold text-surface-900">
                  {active.shortName} {tx(t, 'survey.score', 'score')}: {score}
                  {active.id === 'sus' ? '/100' : ''}
                </p>
                {active.benchmark !== null && target !== null && (
                  <p className="text-xs text-surface-700 mt-0.5">
                    {tx(t, 'survey.benchmark', 'Benchmark')} {active.benchmark} ·{' '}
                    {tx(t, 'survey.target', 'SO1.3 target (+15%)')} {target} —{' '}
                    {meetsTarget
                      ? tx(t, 'survey.met', 'target met in this session')
                      : tx(t, 'survey.notMet', 'below target in this session')}
                  </p>
                )}
                <p className="text-xs text-surface-500 mt-1">
                  {tx(
                    t,
                    'survey.notCollected',
                    'Session result only — not collected. Field execution is scheduled under Task 5.2.',
                  )}
                </p>
              </div>
            )}

            {log.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-surface-700 mb-1.5">
                  {tx(t, 'survey.log', 'Responses this session')}
                </h4>
                <ul className="space-y-1">
                  {log.map((e) => (
                    <li key={e.id} className="text-xs text-surface-600 flex justify-between gap-2">
                      <span>
                        {e.instrument.toUpperCase()} · {e.role}
                      </span>
                      <span className="tabular-nums">
                        {e.score ?? '—'} ·{' '}
                        {e.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-3">
            <p className="text-sm font-medium text-surface-800 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-surface-500" aria-hidden="true" />
              {active.name}
            </p>
            <p className="text-xs text-surface-600 mt-1.5">{active.plannedNote}</p>
            <p className="text-xs text-surface-500 mt-1.5">{active.benchmarkNote}</p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-surface-400 mt-3 pt-2 border-t border-surface-100">
        {SURVEY_MOCK_PROVENANCE.note}
      </p>
    </section>
  );
}
