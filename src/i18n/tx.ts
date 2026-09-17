/**
 * t() eksik anahtarda HAM ANAHTARI döndürür. Bu sarmalayıcı, anahtar sözlükte
 * yoksa kullanıcıya ham key sızdırmak yerine İngilizce literal'e düşer
 * (ValueChainSim / SimControls / dataLabels `resolve` ile aynı desen, tek yerde).
 */
export type Translate = (key: string) => string;

export function tx(t: Translate, key: string, fallback: string): string {
  const out = t(key);
  return out === key ? fallback : out;
}
