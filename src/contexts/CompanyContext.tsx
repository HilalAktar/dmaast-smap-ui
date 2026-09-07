import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

/**
 * Use-case (firma) katmani — Işıl karari 2026-08-30.
 *
 * Tek kod tabani, iki SMAP arayuzu. Altyapi/tasarim/temeller ayni;
 * kart, KPI ve icerik firma bazinda ayrisir.
 */
export type Company = 'kam' | 'jpb';

export interface CompanyConfig {
  id: Company;
  /** Kisa ad — basliklarda ve rozetlerde */
  label: string;
  /** Tam ad */
  fullName: string;
  /** Kaynak ERP — envanterdeki ayrimin sebebi */
  erp: string;
  /** Rozet rengi (tailwind sinif eki) */
  accent: string;
}

export const COMPANIES: Record<Company, CompanyConfig> = {
  kam: {
    id: 'kam',
    label: 'KAM',
    fullName: 'KAM Use Case',
    erp: 'IFS',
    accent: 'bg-primary-100 text-primary-700 border-primary-200',
  },
  jpb: {
    id: 'jpb',
    label: 'JPB',
    fullName: 'JPB Use Case',
    erp: 'Clipper',
    accent: 'bg-amber-100 text-amber-700 border-amber-200',
  },
};

export const ALL_COMPANIES: Company[] = ['kam', 'jpb'];

interface CompanyContextType {
  company: Company;
  config: CompanyConfig;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({
  company,
  children,
}: {
  company: Company;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ company, config: COMPANIES[company] }),
    [company],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return ctx;
}

/* ------------------------------------------------------------------ *
 * Aktif firma katmani — Isıl karari 2026-09-07 (WO-003 I2)
 *
 * `CompanyProvider` firmayi SABIT alir; degistirmek icin yeniden kurulmasi
 * gerekir. Bu yuzden "hangi firmadayiz" durumu onun USTUNDE yasar.
 * Yalnizca `scope: 'global'` hesap icin degistirilebilir; digerlerinde
 * secici hic gorunmez ve deger kendi firmasina sabitlenir.
 * ------------------------------------------------------------------ */

const ACTIVE_COMPANY_KEY = 'smap-active-company';

interface ActiveCompanyContextType {
  activeCompany: Company;
  setActiveCompany: (company: Company) => void;
  /** Ust barda firma secici gosterilsin mi */
  canSwitchCompany: boolean;
}

const ActiveCompanyContext = createContext<ActiveCompanyContextType | undefined>(undefined);

export function ActiveCompanyProvider({
  username,
  initialCompany,
  canSwitch,
  children,
}: {
  username: string;
  /** Hesabin kendi firmasi — super admin icin BASLANGIC firmasi */
  initialCompany: Company;
  canSwitch: boolean;
  children: ReactNode;
}) {
  // Secim hesap basina hatirlanir; yoksa her F5'te baslangic firmasina doner.
  const storageKey = `${ACTIVE_COMPANY_KEY}-${username}`;

  const [activeCompany, setCompany] = useState<Company>(() => {
    if (!canSwitch) return initialCompany;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'kam' || saved === 'jpb') return saved;
    } catch {
      /* localStorage okunamadi — baslangic firmasiyla devam */
    }
    return initialCompany;
  });

  const setActiveCompany = useCallback(
    (company: Company) => {
      if (!canSwitch) return;
      setCompany(company);
      try {
        localStorage.setItem(storageKey, company);
      } catch {
        /* yazilamadi — secim yalnizca bu oturumda gecerli olur */
      }
    },
    [canSwitch, storageKey],
  );

  const value = useMemo(
    () => ({ activeCompany, setActiveCompany, canSwitchCompany: canSwitch }),
    [activeCompany, setActiveCompany, canSwitch],
  );

  return <ActiveCompanyContext.Provider value={value}>{children}</ActiveCompanyContext.Provider>;
}

export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext);
  if (!ctx) {
    throw new Error('useActiveCompany must be used within an ActiveCompanyProvider');
  }
  return ctx;
}
