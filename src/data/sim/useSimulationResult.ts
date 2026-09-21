/**
 * useSimulationResult — role-based loader for a pre-generated SimulationResultV1.
 *
 * Given the active company (from `useCompany()`), it fetches that company's
 * pre-generated artifact through a `SimSource` (phase B: PreGeneratedSimSource)
 * and exposes an explicit loading / error / ready state machine. The concrete
 * source is hidden behind the `SimSource` seam, so swapping to a live API later
 * needs no change here or in the page.
 *
 * The fetch is aborted on unmount / company change to avoid setting state on a
 * stale request. Invalid or contract-incompatible artifacts surface as `error`
 * (the source rejects via `isSimulationResultV1`), never as a partial payload.
 */
import { useEffect, useState } from 'react';
import type { Company, ShockConfig, SimulationResultV1 } from './simContract';
import { PreGeneratedSimSource, SimSource, SimSourceError } from './SimSource';

export type SimLoadState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: SimulationResultV1 };

/** Shared default source (phase B). Stateless, safe to reuse across renders. */
const defaultSource: SimSource = new PreGeneratedSimSource();

export function useSimulationResult(
  company: Company,
  opts?: {
    configCode?: string | null;
    /** Applied what-if shocks; forwarded to the SimSource. Phase B ignores them. */
    shocks?: Partial<ShockConfig>;
    source?: SimSource;
    reloadKey?: number;
  },
): SimLoadState {
  const source = opts?.source ?? defaultSource;
  const configCode = opts?.configCode ?? null;
  const shocks = opts?.shocks;
  const reloadKey = opts?.reloadKey ?? 0;
  const [state, setState] = useState<SimLoadState>({ status: 'loading' });

  useEffect(() => {
    const ac = new AbortController();
    setState({ status: 'loading' });

    source
      .getResult(company, { configCode, shocks, signal: ac.signal })
      .then((data) => {
        if (!ac.signal.aborted) setState({ status: 'ready', data });
      })
      .catch((e) => {
        if (ac.signal.aborted) return; // unmounted / superseded — ignore
        const message = e instanceof SimSourceError ? e.message : String(e);
        setState({ status: 'error', error: message });
      });

    return () => ac.abort();
    // `source` is a stable module singleton by default; company/configCode/reloadKey drive reloads.
    // `shocks` is read from the latest render's closure and applied when the caller
    // bumps `reloadKey` (the "Run" action), so dragging a slider does not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, configCode, reloadKey]);

  return state;
}
