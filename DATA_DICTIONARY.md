# Data dictionary

All bundled facility names, users, tickets, reports and measurements are fictional. Do not enter identifiable staff/patient details.

| Field | Meaning | Unit / allowed values | Source and limitations |
|---|---|---|---|
| `facility.code`, `region`, `level` | Demo facility identifier and grouping | Text | Synthetic sample, not a real clinic registry |
| `remote` | Locally designated remote facility | Boolean | Equity flag; scoring effect is a prototype choice |
| `has_maternity`, `has_fridge` | Service/equipment presence | Boolean | Demo attributes; no clinical impact inferred |
| `battery_kwh` | Battery nameplate energy | kWh | Operator-entered technical record; blank/zero requires review |
| `usable_fraction` | Fraction of nameplate energy assumed usable | 0–1 | User-entered; not measured state of charge |
| `inverter_efficiency` | Assumed DC-to-AC efficiency fraction | 0–1 | User-entered assumption |
| `critical_load_kw` | Assumed aggregate critical electrical load | kW | User-entered estimate; no individual device load control |
| `fridge_holdover_hours` | Holdover/autonomy from the exact fridge model's documentation | Hours or blank | Do not infer from fridge status or another appliance model |
| `outage_hours` | Staff-reported total grid outage duration for a check-in | Hours, 0–24 | Not meter telemetry; daily aggregate may obscure event details |
| `outage_count` | Staff-reported event count in the reporting interval | Integer, 0–50 | Used to estimate mean event duration; event timestamps not captured |
| `longest_outage_hours` | Staff-reported longest event duration | Hours, 0–24 | Must not exceed total reported outage hours |
| `outage_window` | Approximate time of outage onset | Morning, afternoon, evening, night, unknown | Coarse user category; no exact timestamps |
| `generator_hours` | Reported generator support during the period | Hours, 0–24 | Allocated evenly across events by the demo model |
| `local_season` | Locally assigned season category at report time | Rainy, dry, other, unknown | Do not infer from month across diverse local calendars; seeded reports are unknown |
| `battery`, `backup`, `fridge` | Observed status categories | Healthy/low/failed; available/limited/unavailable; healthy/at-risk/failed | Human observation, not a sensor or cold-chain safety determination |
| `created_at` | Report or ticket timestamp | ISO timestamp | Needed for reporting windows and maintenance cycle |
| `equipmentId` | Optional same-equipment identifier for recurring events | Text | Not currently collected in UI; event interval/MTBF unavailable by default |
| `activity`, `completed`, `protected_load` | Staff-confirmed flexible task and load reportedly protected | Enumerated text, Boolean | Log only; no automatic dispatch and no clinical equipment advice |
| `cost`, `lifeYears`, `annualBudget` | Proposed upgrade inputs | User-entered currency, years | No market-cost claims; finance screen is indicative |

## WHO alignment note

WHO's indicator short name `HCF_UNREL_ELECTRICITY` concerns the percentage of facilities with unreliable electricity under its survey definition and supports hospital/non-hospital and urban/rural disaggregation. Resilience Relay does not calculate that indicator. The export should not be used as a WHO submission without a validated mapping, sampling frame and aligned survey period.
