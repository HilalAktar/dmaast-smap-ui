import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRole, type UserRole } from '../contexts/RoleContext';
import { useCompany, type Company } from '../contexts/CompanyContext';
import {
  getStorageKey,
  buildLayoutItems,
  getCompanyItems,
  PAGE_LAYOUTS,
} from '../data/pageLayouts';
import { loadAdminConfig } from '../data/adminConfig';
import type { LayoutItem, PageId } from '../types/pageLayout';

/**
 * Varsayilan duzen artik ADMIN PANELINDEN gelir (Işıl karari 2026-08-30).
 * Admin bir karti kapattiysa o rol icin varsayilan duzende gorunmez.
 * Admin kaydi yoksa pageLayouts'taki rol varsayilanina duser.
 */
function adminDefaultLayout(pageId: PageId, role: UserRole, company: Company): LayoutItem[] {
  const config = PAGE_LAYOUTS[pageId];
  const items = getCompanyItems(pageId, company);
  const admin = loadAdminConfig(company);
  const allowed = admin.cards[role]?.[pageId] ?? config.roleDefaults[role] ?? config.roleDefaults.engineer;
  return buildLayoutItems(items, allowed);
}

function loadLayout(pageId: PageId, role: UserRole, company: Company): LayoutItem[] {
  // Duzen anahtari firma bazli — KAM ve JPB birbirinin duzenini ezmez
  const storageKey = `${getStorageKey(pageId, role)}-${company}`;
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as LayoutItem[];
      const definitions = getCompanyItems(pageId, company);
      const definitionIds = new Set(definitions.map((d) => d.id));

      const validItems = parsed.filter((item) => definitionIds.has(item.id));
      const savedIds = new Set(validItems.map((item) => item.id));
      const missing = definitions
        .filter((d) => !savedIds.has(d.id))
        .map((d, i) => ({
          ...d,
          visible: false,
          order: validItems.length + i,
        }));

      return [...validItems, ...missing].sort((a, b) => a.order - b.order);
    } catch {
      return adminDefaultLayout(pageId, role, company);
    }
  }
  return adminDefaultLayout(pageId, role, company);
}

export function usePageLayout(pageId: PageId) {
  const { role } = useRole();
  const { company } = useCompany();
  const [items, setItems] = useState<LayoutItem[]>(() => loadLayout(pageId, role, company));

  useEffect(() => {
    setItems(loadLayout(pageId, role, company));
  }, [pageId, role, company]);

  const saveLayout = useCallback(
    (newItems: LayoutItem[]) => {
      const normalized = newItems.map((item, index) => ({ ...item, order: index }));
      setItems(normalized);
      localStorage.setItem(
        `${getStorageKey(pageId, role)}-${company}`,
        JSON.stringify(normalized),
      );
    },
    [pageId, role, company],
  );

  const resetToRoleDefault = useCallback((): LayoutItem[] => {
    const defaults = adminDefaultLayout(pageId, role, company);
    saveLayout(defaults);
    return defaults;
  }, [pageId, role, company, saveLayout]);

  const isVisible = useCallback(
    (id: string) => items.find((item) => item.id === id)?.visible ?? false,
    [items],
  );

  const visibleItems = useMemo(
    () => items.filter((item) => item.visible).sort((a, b) => a.order - b.order),
    [items],
  );

  const visibleKpiItems = useMemo(
    () => visibleItems.filter((item) => item.type === 'kpi'),
    [visibleItems],
  );

  const visibleCardItems = useMemo(
    () => visibleItems.filter((item) => item.type === 'card'),
    [visibleItems],
  );

  const visibleWidgetItems = useMemo(
    () => visibleItems.filter((item) => item.type === 'widget'),
    [visibleItems],
  );

  return {
    items,
    visibleItems,
    visibleKpiItems,
    visibleCardItems,
    visibleWidgetItems,
    isVisible,
    saveLayout,
    resetToRoleDefault,
    pageLabel: PAGE_LAYOUTS[pageId].label,
  };
}
