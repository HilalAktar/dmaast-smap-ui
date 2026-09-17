import type { UserRole } from '../contexts/RoleContext';
import type { Company } from '../contexts/CompanyContext';
import type { PageId } from '../types/pageLayout';
import { PAGE_LAYOUTS, getCompanyItems, getCompanyRoleDefaults } from './pageLayouts';

/**
 * Admin paneli yapilandirmasi — Işıl karari 2026-08-30.
 *
 * Admin paneli hangi rolun hangi SAYFAYI ve hangi KARTI gordugunu belirler.
 * Firma bazlidir: KAM admini JPB yapilandirmasini goremez/degistiremez.
 *
 * TASARIM KURALI: admin yapilandirmasi yalnizca DARALTIR, genisletmez.
 * Rol izinleri (RoleContext / ProtectedRoute) her zaman ustte gecerlidir —
 * admin bir sayfayi acsa bile izin yoksa sayfa acilmaz.
 */

export const ALL_ROLES: UserRole[] = [
  'manager',
  'engineer',
  'operator',
  'admin',
  'developer',
  'superuser',
];

export interface AppPage {
  /** Yapilandirma anahtari — rota yolundan bagimsiz, sabit */
  key: string;
  /** Gezinme yolu */
  path: string;
  /** Panelde gorunen ad */
  label: string;
  /** Gruplama basligi */
  group: string;
  /** pageLayouts kaydi varsa kart duzenlemesi acilir */
  layoutId?: PageId;
  /** Icerigi kasitli bos birakilan modul — kart yapilandirmasi yok */
  planned?: boolean;
}

export const APP_PAGES: AppPage[] = [
  { key: 'dashboard', path: '/', label: 'Dashboard', group: 'Overview', layoutId: 'dashboard' },

  { key: 'value-chain', path: '/digital-twin/value-chain', label: 'Value Chain DT', group: 'Digital Twins', layoutId: 'value-chain' },
  { key: 'manufacturing', path: '/digital-twin/manufacturing', label: 'Manufacturing DT', group: 'Digital Twins', layoutId: 'manufacturing' },
  { key: 'logistics', path: '/digital-twin/logistics', label: 'Logistics DT', group: 'Digital Twins', layoutId: 'logistics' },
  { key: 'product', path: '/digital-twin/product', label: 'Product DT', group: 'Digital Twins', layoutId: 'product' },
  // 2026-09-17 (kullanıcı kararı, Asrınalp Şahin): "planned" işaretleri kaldırıldı — bu sayfalar artık
  // mock içerik taşır (src/data/mock/*). value-chain-sim zaten pre-generated artifact ile doluydu.
  // Mock sayfalarin kart duzeni pageLayouts kaydina baglandi (layoutId) — admin paneli kartlari acip kapatabilir.
  { key: 'value-chain-sim', path: '/digital-twin/value-chain-sim', label: 'Value Chain Simulation', group: 'Digital Twins' },
  { key: 'manufacturing-sim', path: '/digital-twin/manufacturing-sim', label: 'Manufacturing Simulation', group: 'Digital Twins', layoutId: 'manufacturing-sim' },

  { key: 'mo-dss', path: '/decision-support/mo-dss', label: 'MO-DSS', group: 'Decision Support', layoutId: 'mo-dss' },
  { key: 'sustainability', path: '/sustainability', label: 'Sustainability', group: 'Decision Support', layoutId: 'sustainability' },
  { key: 'knowledge-graph', path: '/knowledge-graph', label: 'Decision Knowledge Graph', group: 'Decision Support' },

  { key: 'alerts', path: '/alerts', label: 'Alert Center', group: 'Support' },
  { key: 'terminology', path: '/terminology', label: 'Terminology Dictionary', group: 'Support' },
  { key: 'help', path: '/help', label: 'Help & Training', group: 'Support' },
];

export interface AdminConfig {
  /** rol -> gorunur sayfa anahtarlari */
  pages: Record<UserRole, string[]>;
  /** rol -> sayfa -> gorunur kart id'leri */
  cards: Record<UserRole, Partial<Record<PageId, string[]>>>;
}

function storageKey(company: Company) {
  return `smap-admin-config-${company}`;
}

export function getDefaultAdminConfig(company: Company): AdminConfig {
  const pages = {} as Record<UserRole, string[]>;
  const cards = {} as Record<UserRole, Partial<Record<PageId, string[]>>>;

  for (const role of ALL_ROLES) {
    pages[role] = APP_PAGES.map((p) => p.key);
    cards[role] = {};
    for (const page of APP_PAGES) {
      if (!page.layoutId) continue;
      if (!PAGE_LAYOUTS[page.layoutId]) continue;
      // Yalnizca bu use case'e ait kartlar — Işıl karari 2026-08-30
      cards[role][page.layoutId] = getCompanyRoleDefaults(page.layoutId, role, company);
    }
  }

  return { pages, cards };
}

export function loadAdminConfig(company: Company): AdminConfig {
  const fallback = getDefaultAdminConfig(company);
  try {
    const raw = localStorage.getItem(storageKey(company));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AdminConfig>;
    if (!parsed || typeof parsed !== 'object') return fallback;

    // Eksik rol/sayfa alanlarini varsayilanla tamamla — bozuk kayit uygulamayi dusurmesin
    const merged: AdminConfig = { pages: { ...fallback.pages }, cards: { ...fallback.cards } };
    for (const role of ALL_ROLES) {
      if (Array.isArray(parsed.pages?.[role])) {
        merged.pages[role] = parsed.pages![role]!.filter((k) =>
          APP_PAGES.some((p) => p.key === k),
        );
      }
      if (parsed.cards?.[role]) {
        // Kayitli listeyi bu use case'in katalogu ile suz: baska firmaya ait
        // veya artik var olmayan kart id'leri sessizce dusurulur
        const cleaned: Partial<Record<PageId, string[]>> = {};
        for (const [pid, ids] of Object.entries(parsed.cards[role]!)) {
          const pageId = pid as PageId;
          if (!PAGE_LAYOUTS[pageId] || !Array.isArray(ids)) continue;
          const allowed = new Set(getCompanyItems(pageId, company).map((i) => i.id));
          cleaned[pageId] = ids.filter((id) => allowed.has(id));
        }
        merged.cards[role] = { ...fallback.cards[role], ...cleaned };
      }
    }
    return merged;
  } catch {
    return fallback;
  }
}

export function saveAdminConfig(company: Company, config: AdminConfig) {
  localStorage.setItem(storageKey(company), JSON.stringify(config));
}

export function resetAdminConfig(company: Company) {
  localStorage.removeItem(storageKey(company));
}

export function isPageVisible(config: AdminConfig, role: UserRole, pageKey: string): boolean {
  return config.pages[role]?.includes(pageKey) ?? true;
}
