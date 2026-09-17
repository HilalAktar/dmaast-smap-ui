/**
 * SimSource — the source abstraction for value-chain simulation results.
 *
 * A SimSource yields a `SimulationResultV1` for a given company ('kam'|'jpb'),
 * hiding WHERE the data comes from. This is the seam that lets phase B ship a
 * pre-generated static artifact today and phase A swap in a live twin API
 * later WITHOUT rewriting any consumer (ValueChainSim page, hooks, charts).
 *
 * Contract for implementations:
 *   - `kind` declares provenance ('pre-generated' | 'live').
 *   - `getResult(company, opts?)` resolves to a validated SimulationResultV1
 *     whose `.company` equals the requested company. Implementations SHOULD
 *     run `isSimulationResultV1()` before returning and reject otherwise.
 *   - `opts.configCode` selects a JPB catalog product (ignored by KAM /
 *     single-product sources). `opts.signal` supports fetch cancellation.
 *   - Errors are thrown (or rejected) as `SimSourceError`; callers render a
 *     failure state rather than binding a partial payload.
 *
 * Phase 2 (pilot-frontend) implements the concrete classes below; only the
 * PreGeneratedSimSource is needed for B. LiveApiSimSource is specified here so
 * the same interface is provably swappable.
 */

import type { Company, ShockConfig, SimulationResultV1 } from './simContract';
import { isSimulationResultV1 } from './simContract';

export type SimSourceKind = 'pre-generated' | 'live';

export interface GetResultOptions {
  /** JPB catalog product code. Null/undefined = pilot/default product. Ignored by KAM. */
  configCode?: string | null;
  /**
   * What-if shock knobs (contract `config.shocks`, % deviation from baseline).
   * Phase A forwards these to the live twin API; the phase-B pre-generated
   * source IGNORES them (interface parity only, like `configCode`) — the static
   * artifact carries a single baseline scenario. Kept here so the UI controls
   * bind to the SimSource seam now and need no rewrite when A lands.
   */
  shocks?: Partial<ShockConfig>;
  /** Abort signal for live fetches. */
  signal?: AbortSignal;
}

export interface SimSource {
  readonly kind: SimSourceKind;
  /**
   * Resolve the simulation result for a company.
   * MUST return a payload whose `.company === company` and that passes
   * `isSimulationResultV1`.
   */
  getResult(company: Company, opts?: GetResultOptions): Promise<SimulationResultV1>;
}

/** Error thrown by any SimSource on load/validation failure. */
export class SimSourceError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SimSourceError';
  }
}

/**
 * ── Phase B target (implement in phase 2) ────────────────────────────────────
 *
 * PreGeneratedSimSource: loads the static artifact exported from a one-shot
 * twin run. Artifacts live at `public/sim/<company>.json` and are fetched at
 * runtime from the app base URL, e.g. `${import.meta.env.BASE_URL}sim/kam.json`.
 *
 *   export class PreGeneratedSimSource implements SimSource {
 *     readonly kind = 'pre-generated' as const;
 *     async getResult(company: Company): Promise<SimulationResultV1> {
 *       const url = `${import.meta.env.BASE_URL}sim/${company}.json`;
 *       let json: unknown;
 *       try {
 *         const res = await fetch(url);
 *         if (!res.ok) throw new SimSourceError(`HTTP ${res.status} for ${url}`);
 *         json = await res.json();
 *       } catch (e) {
 *         throw new SimSourceError(`Failed to load pre-generated sim for ${company}`, e);
 *       }
 *       if (!isSimulationResultV1(json) || json.company !== company) {
 *         throw new SimSourceError(`Artifact for ${company} is not a valid SimulationResultV1`);
 *       }
 *       return json;
 *     }
 *   }
 *
 * ── Phase A target (future, same interface) ──────────────────────────────────
 *
 * LiveApiSimSource: POSTs to the twin's `/api/demo/simulate` and normalizes the
 * raw response (separate *_events arrays + hierarchy_summary) into
 * SimulationResultV1 via a shared `normalizeTwinPayload()` helper — the exact
 * mapping used to produce the B artifacts (see README "Field mapping"). The KAM
 * and JPB base URLs differ; a per-company endpoint map is injected at
 * construction. Consumers stay unchanged because both classes implement
 * SimSource and return the identical contract type.
 */

/** Factory contract phase-2 wiring should expose (kept as a type here). */
export type SimSourceFactory = (kind?: SimSourceKind) => SimSource;

/**
 * ── Phase B concrete implementation (phase 2) ────────────────────────────────
 *
 * PreGeneratedSimSource loads the static artifact exported from a one-shot twin
 * run. Artifacts live at `public/sim/<company>.json` and are fetched at runtime
 * from the app base URL (`${import.meta.env.BASE_URL}sim/<company>.json`), so
 * they stay out of the JS bundle. Role-based selection is driven purely by the
 * `company` argument (from `useCompany()` at the call site) — this source adds
 * no auth of its own. `configCode` is accepted for interface parity but the
 * pre-generated artifacts each carry a single default scenario, so it is not
 * used to pick a file here (a live source would forward it to the API).
 *
 * The returned payload is validated with `isSimulationResultV1` AND cross-checked
 * so `.company === company`; anything else is rejected as a `SimSourceError`,
 * letting the UI render a failure state instead of binding a partial payload.
 */
export class PreGeneratedSimSource implements SimSource {
  readonly kind = 'pre-generated' as const;

  /** `baseUrl` defaults to the Vite app base; override only in tests. */
  constructor(private readonly baseUrl: string = import.meta.env.BASE_URL) {}

  async getResult(company: Company, opts?: GetResultOptions): Promise<SimulationResultV1> {
    const url = `${this.baseUrl}sim/${company}.json`;
    let json: unknown;
    try {
      const res = await fetch(url, { signal: opts?.signal });
      if (!res.ok) throw new SimSourceError(`HTTP ${res.status} for ${url}`);
      json = await res.json();
    } catch (e) {
      if (e instanceof SimSourceError) throw e;
      throw new SimSourceError(`Failed to load pre-generated sim for ${company}`, e);
    }
    if (!isSimulationResultV1(json) || json.company !== company) {
      throw new SimSourceError(
        `Artifact for ${company} is not a valid SimulationResultV1 (schema/company mismatch)`,
      );
    }
    return json;
  }
}

/** Default factory: phase B ships the pre-generated source. */
export const createSimSource: SimSourceFactory = (kind = 'pre-generated') => {
  if (kind === 'pre-generated') return new PreGeneratedSimSource();
  // Phase A (LiveApiSimSource) is not wired in phase B; fail loudly if requested.
  throw new SimSourceError(`SimSource kind '${kind}' is not available in this build`);
};
