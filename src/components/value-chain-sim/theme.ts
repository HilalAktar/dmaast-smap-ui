/**
 * Design tokens for JS-side styling (Recharts series, React Flow nodes/edges).
 * Port of the twin's `frontend/src/theme.js`. These MIRROR the CSS custom
 * properties declared in `styles/vcdt.css` (`.vcdt` / `.vcdt[data-theme="dark"]`).
 *
 * Design language: sober, corporate, EU-project. Light OR dark-grey surfaces,
 * a single restrained blue accent, slate neutrals. No neon, no rainbow.
 */
import type { CSSProperties } from 'react';

export type ThemeName = 'light' | 'dark';

export interface PaletteTokens {
  bg: string;
  surface: string;
  card: string;
  border: string;
  borderStrong: string;
  text: string;
  text2: string;
  text3: string;
  textFaint: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentBorder: string;
  success: string;
  successSoft: string;
  successBorder: string;
  warning: string;
  warningSoft: string;
  warningBorder: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
}

export const palette: PaletteTokens = {
  bg: '#F6F8FA', surface: '#F1F5F9', card: '#FFFFFF',
  border: '#E2E8F0', borderStrong: '#CBD5E1',
  text: '#0F172A', text2: '#475569', text3: '#64748B', textFaint: '#94A3B8',
  accent: '#1D4ED8', accentStrong: '#1E3A8A', accentSoft: '#EFF6FF', accentBorder: '#BFDBFE',
  success: '#15803D', successSoft: '#F0FDF4', successBorder: '#BBF7D0',
  warning: '#B45309', warningSoft: '#FFFBEB', warningBorder: '#FDE68A',
  danger: '#B91C1C', dangerSoft: '#FEF2F2', dangerBorder: '#FECACA',
};

export const paletteDark: PaletteTokens = {
  bg: '#0F1216', surface: '#171B21', card: '#1C2128',
  border: '#2A313B', borderStrong: '#3A434F',
  text: '#E6EAF0', text2: '#B2BCC8', text3: '#8C97A5', textFaint: '#5E6975',
  accent: '#5187C7', accentStrong: '#86AAD6', accentSoft: '#18222F', accentBorder: '#33495F',
  success: '#62A98A', successSoft: '#16271E', successBorder: '#2C4636',
  warning: '#C6A45D', warningSoft: '#26200F', warningBorder: '#473C1E',
  danger: '#F08079', dangerSoft: '#2A1718', dangerBorder: '#4A2A2A',
};

export interface EntityColorTokens {
  finishedGood: string;
  subAssembly: string;
  component: string;
  expense: string;
  neutral: string;
}

// Categorical hues for BOM entity types / supply-chain stages.
const entityLight: EntityColorTokens = {
  finishedGood: '#2563EB', subAssembly: '#0E7490', component: '#16A34A',
  expense: '#B45309', neutral: '#475569',
};
const entityDark: EntityColorTokens = {
  finishedGood: '#60A5FA', subAssembly: '#22D3EE', component: '#34D399',
  expense: '#FBBF24', neutral: '#94A3B8',
};

export interface ChartTokens {
  grid: string;
  axis: string;
  axisLabel: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipShadow: string;
  text: string;
  demand: string;
  production: string;
  delivery: string;
  series: string[];
}

// Restrained Recharts palettes. Demand=red, Produced=green, Delivered=blue.
const chartLight: ChartTokens = {
  grid: '#E2E8F0', axis: '#64748B', axisLabel: '#475569',
  tooltipBg: '#FFFFFF', tooltipBorder: '#E2E8F0', tooltipShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
  text: '#0F172A',
  demand: '#DC2626', production: '#16A34A', delivery: '#2563EB',
  series: ['#2563EB', '#DC2626', '#16A34A', '#CA8A04', '#7C3AED', '#0891B2'],
};
const chartDark: ChartTokens = {
  grid: '#2A313B', axis: '#8C97A5', axisLabel: '#B2BCC8',
  tooltipBg: '#1C2128', tooltipBorder: '#2A313B', tooltipShadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
  text: '#E6EAF0',
  demand: '#E07A73', production: '#62A98A', delivery: '#86AAD6',
  series: ['#86AAD6', '#E07A73', '#62A98A', '#C7A24E', '#9889C0', '#5FAAB0'],
};

function isDark(theme?: ThemeName): boolean {
  return theme === 'dark';
}

// Theme-aware getters — call these inside render so charts recolour on toggle.
export function getPalette(theme?: ThemeName): PaletteTokens {
  return isDark(theme) ? paletteDark : palette;
}
export function getEntityColors(theme?: ThemeName): EntityColorTokens {
  return isDark(theme) ? entityDark : entityLight;
}
export function getChart(theme?: ThemeName): ChartTokens {
  return isDark(theme) ? chartDark : chartLight;
}
export function getTooltipContentStyle(theme?: ThemeName): CSSProperties {
  const c = getChart(theme);
  return {
    backgroundColor: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: 6,
    boxShadow: c.tooltipShadow,
    color: c.text,
    fontSize: 12,
  };
}
