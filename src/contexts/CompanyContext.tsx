import { createContext, useContext, useMemo, ReactNode } from 'react';

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
