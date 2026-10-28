# Resilience Relay methods and assumptions

## Scope

This is a demonstration tool for exploring how staff-reported service interruptions, backup resources, maintenance follow-up and non-clinical flexible demand might fit together. It is not a monitoring system, grid model, clinical decision aid, or validated investment tool. The bundled facilities and observations are synthetic.

Resilience Relay groups submitted observations into daily, weekly and monthly reporting windows to expose the available data; it does not calculate system-wide flexibility requirements or model the grid.

## Reliability indicators

- **Reported interruption count** is the sum of staff-entered events. If count is missing on an older record, the app treats any positive-outage report as one event.
- **Total outage hours** is the sum of reported facility hours in the selected rows.
- **Average restoration duration** is reported outage hours divided by the reported interruption count. It is a facility report analogue, not measured utility restoration time.
- **Availability analogue** is `max(0, 1 − reported outage hours / (24 × distinct facility-days with a check-in)) × 100`. Multiple check-ins at one facility on one date share one 24-hour denominator. Reporting gaps are not treated as powered hours.
- The app does **not** call these SAIDI, SAIFI, CAIDI, or IEEE 1366 utility indices. Those require utility/customer population definitions, sustained interruption rules, complete event records, and compatible reporting periods. The indicators are not comparable to a WHO survey indicator without aligning its survey window and interruption definition.
- Data sufficiency is **low** below 30 distinct calendar dates and **preliminary** at or above 30. This simple threshold is a prompt to inspect coverage, not a statistical confidence interval.

WHO's health-care-facility unreliable-electricity indicator (short name `HCF_UNREL_ELECTRICITY`) is based on interruptions lasting longer than two hours during regular service hours in a past-week or two-week survey window, with hospital/non-hospital and urban/rural disaggregation. This app currently reports raw facility observations and does not calculate that country indicator. See the [WHO indicator definition](https://www.who.int/data/gho/data/indicators/indicator-details/GHO/electrification-of-health-care-facilities--percentage-of-health-care-facilities-with-unreliable-electricity%28-%29).

## Storage and loss-of-load screen

- **Nominal autonomy hours** = `battery nameplate kWh × usable fraction × inverter efficiency ÷ critical load kW`.
- Demonstration battery-status derating: healthy = 1.0, low = 0.5, failed = 0.0. The low-status 0.5 multiplier is illustrative and must be replaced with battery-specific evidence before operational use.
- For each outage report, reported outage hours and generator hours are divided evenly across its event count. For each event, screened unserved hours = `max(0, event duration − autonomy − generator hours)`. Events are assumed not to overlap and storage is assumed to recharge between events. These assumptions can materially overstate coverage when events cluster or charging is constrained.
- **Energy not served (EENS analogue)** = screened loss-of-load hours × facility critical-load kW. It is a screening estimate from manually entered assumptions, not a measured energy quantity.
- **Outage coverage** = share of positive-outage report rows with no screened loss-of-load. It is not a probability of future coverage.
- The investment screen compares baseline with extra entered battery capacity on the same recorded rows. Avoided EENS cannot exceed baseline EENS. Annualized cost is entered capex divided by entered life. Cost per avoided kWh is only shown if avoided EENS is positive. It excludes discounting, finance, replacement, degradation, O&M, fuel, changing loads, and residual value. A budget check compares annualized cost with the user's annual budget; no proposal is procurement advice.

## Cold-chain screening

Fridge holdover is blank unless entered from the exact appliance's manufacturer sheet or applicable WHO PQS product record. The WHO [PQS product catalogue](https://extranet.who.int/prequal/immunization-devices/imd-listing-products-e003) lists model-level autonomy/holdover information; values differ by device and test conditions. The app subtracts the longest reported outage event from entered holdover plus screened backup autonomy and labels a negative margin for review. This is a **screening flag**, not a temperature reading, vaccine-safety determination, or confirmed excursion. Temperature monitoring and local cold-chain procedures govern.

## Flexibility and outage windows

- Time windows are staff-reported morning, afternoon, evening, night, or unknown categories. A bar with fewer reports only describes this sample; it is not a forecast of when power will be available.
- Rainy/dry comparisons use a manually assigned local-season category per facility. The app does not map Ethiopian months to seasons because calendars and local conditions vary; comparisons require reports in both groups and are descriptive only.
- Illustrative flexible-load inventory shows `kW × hours/day` for water pumping, laundry, and staff-device charging. Users must verify that a task is actually deferrable locally.
- The product never recommends disconnecting or shifting medical equipment. Staff remain responsible for operating decisions and care.

## Maintenance and priority

- Maintenance cycle time is ticket creation to two later healthy reports and verification. It includes detection, assignment, repair, reporting, and validation delay; it is not pure repair labor time.
- Event interval / MTBF is blank unless at least two events share an entered equipment identifier. The current prototype does not collect identifiers in the interface, so MTBF is not estimable from the bundled data.
- Priority score weights are illustrative. The 15-point ticket component assigns up to 11 points to ticket age and up to 4 to the remote-site flag as an equity-oriented demo choice, not a validated urgency policy.
- Sensitivity display varies one component by ±20% and reranks all demo facilities for each of ten scenarios plus nominal. “Top five in all scenarios” means ranking stability under this limited perturbation only, not validation.

## References

- IEEE SA, [IEEE 1366-2022 Guide for Electric Power Distribution Reliability Indices](https://standards.ieee.org/ieee/1366/7243/); the current project page for P1366 identifies distribution systems, substations, circuits and defined regions as intended applications.
- WHO, [Electricity in health-care facilities: unreliable electricity supply indicator](https://www.who.int/data/gho/data/indicators/indicator-details/GHO/electrification-of-health-care-facilities--percentage-of-health-care-facilities-with-unreliable-electricity%28-%29).
- WHO PQS, [E003 refrigerators and freezers product catalogue](https://extranet.who.int/prequal/immunization-devices/imd-listing-products-e003).
