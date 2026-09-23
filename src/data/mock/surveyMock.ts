/**
 * User Experience Survey — SO1.3 değerlendirme aracı (`/dashboard` widget).
 *
 * Kullanıcı kararı (Işıl, 2026-09-23): Dashboard'daki HITL doğrulama görev
 * listesi 2026-08-31'de geri çekilmişti (4 görev elle uydurulmuştu, ikisi
 * olmayan veriye dayanıyordu). Işıl'ın tarifi: o kart "survey" olarak yeniden
 * kurulacak. Bu dosya o anketin içeriğidir.
 *
 * NEDEN SUS TAM KURULU, DİĞERLERİ DEĞİL:
 * MS8 §2.6 ve SO1.3 KPI'sı dört aracı birlikte anıyor — SUS, PSSUQ, CSAT, UEQ.
 * SUS 10 maddedir ve yayımlanmış bir sektör ortalaması (68/100) vardır, yani
 * arayüz içinden uygulanıp anında puanlanabilir. PSSUQ (16 madde) ve UEQ
 * (26 madde, anlamsal farklılık ölçeği) T5.2 gösterim oturumlarında uygulanmak
 * üzere protokolde durur; burada yapıları BEYAN edilir, madde setleri
 * doldurulmaz. Uydurulmuş madde yazmaktansa eksik olduğunu söylemek yeğdir.
 *
 * MADDE METİNLERİ DEĞİŞTİRİLMEZ: SUS puanının 68 ortalamasıyla kıyaslanabilmesi
 * ancak standart ifadelerle geçerlidir (Brooke 1996). "system" kelimesi
 * "SMAP" ile değiştirilmemiştir — değiştirilseydi kıyas dayanağı düşerdi.
 *
 * Toplanan cevaplar OTURUM DURUMUNDA kalır; hiçbir yere gönderilmez.
 * Gerçek veri toplama T5.2 kapsamındadır.
 */

export const SURVEY_MOCK_PROVENANCE = {
  kind: 'mock' as const,
  module: 'ux-survey',
  note:
    'Survey instrument implemented in the interface for design validation. Responses stay in session state and are not collected — field execution is scheduled under Task 5.2.',
  createdAt: '2026-09-23',
};

export type SurveyInstrumentId = 'sus' | 'pssuq' | 'csat' | 'ueq';

export interface SurveyItem {
  id: string;
  /** Standart SUS ifadesi — değiştirilmez. */
  text: string;
  /** Ters puanlanan madde (SUS'ta çift numaralılar). */
  reverse: boolean;
}

export interface SurveyInstrument {
  id: SurveyInstrumentId;
  name: string;
  shortName: string;
  /** Yayımlanmış sektör ortalaması; yoksa null. */
  benchmark: number | null;
  benchmarkNote: string;
  scaleMin: number;
  scaleMax: number;
  /** Madde seti bu sürümde uygulanmış mı? */
  implemented: boolean;
  items: SurveyItem[];
  /** Uygulanmamışsa neyi beklediği. */
  plannedNote?: string;
}

/** SUS — Brooke (1996), 10 madde, 5'li Likert. Sıra ve metin standarttır. */
const SUS_ITEMS: SurveyItem[] = [
  { id: 'sus-1', text: 'I think that I would like to use this system frequently.', reverse: false },
  { id: 'sus-2', text: 'I found the system unnecessarily complex.', reverse: true },
  { id: 'sus-3', text: 'I thought the system was easy to use.', reverse: false },
  { id: 'sus-4', text: 'I think that I would need the support of a technical person to be able to use this system.', reverse: true },
  { id: 'sus-5', text: 'I found the various functions in this system were well integrated.', reverse: false },
  { id: 'sus-6', text: 'I thought there was too much inconsistency in this system.', reverse: true },
  { id: 'sus-7', text: 'I would imagine that most people would learn to use this system very quickly.', reverse: false },
  { id: 'sus-8', text: 'I found the system very cumbersome to use.', reverse: true },
  { id: 'sus-9', text: 'I felt very confident using the system.', reverse: false },
  { id: 'sus-10', text: 'I needed to learn a lot of things before I could get going with this system.', reverse: true },
];

const CSAT_ITEMS: SurveyItem[] = [
  { id: 'csat-1', text: 'Overall, how satisfied are you with the SMAP interface?', reverse: false },
];

export const SURVEY_INSTRUMENTS: SurveyInstrument[] = [
  {
    id: 'sus',
    name: 'System Usability Scale',
    shortName: 'SUS',
    benchmark: 68,
    benchmarkNote: 'Industry average 68/100, from a meta-analysis of more than 500 studies.',
    scaleMin: 1,
    scaleMax: 5,
    implemented: true,
    items: SUS_ITEMS,
  },
  {
    id: 'csat',
    name: 'Customer Satisfaction Score',
    shortName: 'CSAT',
    benchmark: null,
    benchmarkNote: 'Reported as the share of respondents answering 4 or 5.',
    scaleMin: 1,
    scaleMax: 5,
    implemented: true,
    items: CSAT_ITEMS,
  },
  {
    id: 'pssuq',
    name: 'Post-Study System Usability Questionnaire',
    shortName: 'PSSUQ',
    benchmark: null,
    benchmarkNote: 'Decomposes satisfaction into system usefulness, information quality and interface quality.',
    scaleMin: 1,
    scaleMax: 7,
    implemented: false,
    items: [],
    plannedNote: '16 items across three sub-scales; administered in the Task 5.2 demonstration sessions.',
  },
  {
    id: 'ueq',
    name: 'User Experience Questionnaire',
    shortName: 'UEQ',
    benchmark: null,
    benchmarkNote: 'Measures attractiveness, perspicuity, efficiency, dependability, stimulation and novelty.',
    scaleMin: 1,
    scaleMax: 7,
    implemented: false,
    items: [],
    plannedNote: '26 semantic-differential item pairs across six scales; administered in the Task 5.2 demonstration sessions.',
  },
];

/** SO1.3 KPI: yayımlanmış ortalamanın en az %15 üzeri. */
export const SO13_UPLIFT = 1.15;

export function susTargetScore(benchmark: number): number {
  return Math.round(benchmark * SO13_UPLIFT * 10) / 10;
}

/**
 * SUS puanı (0-100). Tek numaralı maddeler (cevap-1), çift numaralılar (5-cevap),
 * toplam 2,5 ile çarpılır. Eksik cevap varsa null döner — kısmi puan üretilmez.
 */
export function computeSusScore(items: SurveyItem[], answers: Record<string, number>): number | null {
  let toplam = 0;
  for (const item of items) {
    const cevap = answers[item.id];
    if (typeof cevap !== 'number') return null;
    toplam += item.reverse ? 5 - cevap : cevap - 1;
  }
  return Math.round(toplam * 2.5 * 10) / 10;
}

export const LIKERT_LABELS = [
  'Strongly disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly agree',
];
