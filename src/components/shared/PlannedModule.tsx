import type { LucideIcon } from 'lucide-react';
import { Clock } from 'lucide-react';
import Header from '../layout/Header';

interface PlannedModuleProps {
  /** Header title, e.g. "Sustainability Digital Twin" */
  title: string;
  /** Large heading inside the empty state */
  heading: string;
  /**
   * Optional. Işıl karari 2026-08-30: gerekce cumlesi eklenmez, yalnizca
   * "Planned" isareti kalir. Yalnizca acikca onaylanmis sayfalarda kullanilir.
   */
  reason?: string;
  icon?: LucideIcon;
}

/**
 * Shared empty state for modules that are deliberately not implemented.
 *
 * Işıl kararı (2026-08-30): karşılığı olmayan modül uydurma veriyle doldurulmaz,
 * "planned" işaretiyle ve gerekçesiyle boş bırakılır.
 */
export default function PlannedModule({
  title,
  heading,
  reason,
  icon: Icon = Clock,
}: PlannedModuleProps) {
  return (
    <div className="min-h-screen">
      <Header title={title} subtitle="Planned module" />

      <div className="flex items-center justify-center px-6 py-24">
        <div className="max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-100">
            <Icon className="h-8 w-8 text-surface-400" />
          </div>

          <span className="mt-6 inline-block rounded-full border border-surface-300 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-surface-500">
            Planned
          </span>

          <h2 className="mt-4 text-xl font-semibold text-surface-900">{heading}</h2>

          {reason && (
            <p className="mt-3 text-sm leading-relaxed text-surface-600">{reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}
