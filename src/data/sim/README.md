# Value-Chain Simulation Contract — `SimulationResultV1`

Single source of truth for wiring the smap UI to the KAM and JPB value-chain
digital-twin simulations. Phase-1 delivery: **contract + pre-generated demo
artifacts + adapter interface**. Chosen strategy: **B (pre-generated demo)** on
a **common binding layer (C)** so the switch to **A (live API)** later needs no
consumer rewrite.

## Files

| File | Role |
|------|------|
| `SimulationResultV1.schema.json` | JSON Schema (draft 2020-12) — normative shape |
| `simContract.ts` | TypeScript mirror of the schema + `isSimulationResultV1()` guard |
| `SimSource.ts` | `SimSource` adapter interface (source abstraction B↔A) |
| `../../../public/sim/kam.json` | Pre-generated KAM artifact (real twin run) |
| `../../../public/sim/jpb.json` | Pre-generated JPB artifact (real twin run) |

Artifacts sit in `public/sim/` so they are fetched at runtime
(`${import.meta.env.BASE_URL}sim/<company>.json`) and stay out of the JS bundle;
the same URL shape is what a live source would replace.

## Envelope

```jsonc
{
  "contract_version": "1.0.0",
  "schema": "SimulationResultV1",
  "generated_at": "<UTC ISO-8601>",
  "source": "pre-generated",        // 'pre-generated' (B) | 'live' (A)
  "company": "kam" | "jpb",         // role-based loading key
  "config": { /* OPTIONAL — carries KAM/JPB asymmetry */ },
  "result": {
    "kpis": { /* scalar summary */ },
    "timeseries": [ /* inventory snapshot per 0.25-day tick */ ],
    "events": {
      "demand": [], "production": [], "shipment": [],
      "level": [], "replenishment": []
    },
    "hierarchy": { /* BOM/value-chain tree summary */ }
  }
}
```

## Field mapping (raw twin payload → contract)

Both twins' `POST /api/demo/simulate` emit the **same** shape via
`backend/routes/demo_routes.py::_serialize_results`: separate top-level
`*_events` arrays plus `hierarchy_summary`. The adapter normalizes it:

| Raw twin key | Contract path |
|--------------|---------------|
| `kpis` | `result.kpis` |
| `timeseries` | `result.timeseries` |
| `demand_events` | `result.events.demand` |
| `production_events` | `result.events.production` |
| `shipment_events` | `result.events.shipment` |
| `level_events` | `result.events.level` |
| `replenishment_events` | `result.events.replenishment` |
| `hierarchy_summary` | `result.hierarchy` |
| *(run inputs)* | `config` (product_id, config_code, demand_mode, f04_share, planning, shocks, horizon, seed) |

The top level is **symmetric** across companies; this normalization is the
exact logic to reuse in the future live `LiveApiSimSource.normalizeTwinPayload()`.

## KAM ↔ JPB asymmetry (carried in `config` + open shapes)

Evidence from the actual runs in these artifacts:

- **Products**: KAM is single-product (`021XBXXXXXXF04`, `config_code: null`,
  `supports_configurations: false`). JPB is a catalog
  (`supports_configurations: true`); the pilot `ST5253-06` is `config_code: null`,
  other products selected via `config.config_code`.
- **Demand defaults**: KAM `family_scaled` / `f04_share 0.1`; JPB `family_proxy`
  / `f04_share 1.0`.
- **`config.planning`**: JPB adds `max_batch_qty`, `ship_complete`,
  `reorder_on_position`, `leaf_coverage_factor`, `sa_coverage_factor`.
- **`config.shocks`**: JPB adds `Subcontract_Lead_Time_pct`, `Rework_pct`,
  `Quality_Hold_pct`.
- **`kpis`**: JPB adds `company`.
- **Event rows**: JPB `shipment` adds `order_qty`, `is_partial`; JPB
  `replenishment` adds `trigger`, `quality_hold_days`; KAM assembly-phase
  `level` rows add `total_shortage`, `eff_plt_days`, `eff_completion_rate`,
  `blocked_*`, etc.
- **`timeseries`**: each row carries one dynamic `inv_<subAssemblyId>` column per
  sub-assembly (product-specific), so `additionalProperties: true` on rows.

Consumers rely only on the documented **core** keys; extra keys are additive.

## Pre-generated scenario (what these artifacts contain)

One default run per twin, produced by calling `run_demo_simulation` through the
same code path as an **empty-body** `POST /api/demo/simulate` (baseline: no
shocks, `horizon_days 120`, `seed 42`). KAM = single default product; JPB = pilot
`ST5253-06`. This is the single default scenario for phase B (not interactive).

## Consuming it (phase 2)

```ts
import { PreGeneratedSimSource } from './SimSource'; // implement in phase 2
import { useCompany } from '../../contexts/CompanyContext';

const source = new PreGeneratedSimSource();          // kind: 'pre-generated'
const { company } = useCompany();                    // 'kam' | 'jpb'
const result = await source.getResult(company);      // SimulationResultV1
// result.result.kpis / .timeseries / .events / .hierarchy
```

Swapping to live later: construct a `LiveApiSimSource` instead — same
`SimSource` interface, same `SimulationResultV1` return type, zero consumer
changes.

## Versioning

`contract_version` is SemVer. Breaking changes bump the major and MUST also
change `schema` (e.g. `SimulationResultV2`). `isSimulationResultV1()` enforces
major-version compatibility at load time.
