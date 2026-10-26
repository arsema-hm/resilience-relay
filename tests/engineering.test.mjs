import test from 'node:test'
import assert from 'node:assert/strict'
import { batteryAutonomyHours, evaluateUpgrade, holdoverScreen, maintenanceMetrics, monthlyReliability, outageWindowCounts, reliabilityIndices, robustPriority, seasonalComparison, storageCoverage } from '../src/lib/engineering.ts'
import { initialData } from '../src/lib/model.ts'

const report = (hours, extra = {}) => ({ id: 'r', facilityId: 'f-x', createdAt: '2026-10-01T10:00:00Z', outageHours: hours, outageCount: hours > 0 ? 1 : 0, longestOutageHours: hours, outageWindow: 'morning', generatorHours: 0, battery: 'healthy', backup: 'available', fridge: 'healthy', channel: 'web', ...extra })
const facility = { ...initialData.facilities[0], batteryKwh: 10, usableFraction: .8, inverterEfficiency: .9, criticalLoadKw: 1.2 }

test('storage autonomy matches the transparent energy equation', () => assert.equal(batteryAutonomyHours(facility), 6))
test('invalid or incomplete battery configuration returns unknown', () => {
  for (const input of [{}, { batteryKwh: 10, criticalLoadKw: 0 }, { batteryKwh: -1, criticalLoadKw: 1 }, { batteryKwh: 10, criticalLoadKw: 1, usableFraction: 1.1 }, { batteryKwh: 10, criticalLoadKw: 1, inverterEfficiency: -1 }]) assert.equal(batteryAutonomyHours(input), null)
})
test('low and failed status derate the usable storage estimate', () => {
  assert.equal(batteryAutonomyHours({ ...facility, status: 'low' }), 3)
  assert.equal(batteryAutonomyHours({ ...facility, status: 'failed' }), 0)
})
test('reliability analogue aggregates interruption rows and availability', () => {
  const result = reliabilityIndices([report(4), report(2, { id: 'r2', createdAt: '2026-10-02T11:00:00Z', outageCount: 2 })])
  assert.equal(result.interruptions, 3); assert.equal(result.outageHours, 6); assert.equal(result.avgRestoreHours, 2); assert.equal(result.availabilityPercent, 87.5)
})
test('empty reliability has null rates rather than a fabricated perfect score', () => {
  const result = reliabilityIndices([]); assert.equal(result.avgRestoreHours, null); assert.equal(result.availabilityPercent, null); assert.equal(result.confidence, 'low')
})
test('report data sufficiency remains low below thirty distinct dates', () => {
  const result = reliabilityIndices(Array.from({ length: 29 }, (_, i) => report(0, { id: String(i), createdAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString() })))
  assert.equal(result.confidence, 'low')
})
test('thirty distinct report dates is preliminary rather than high confidence', () => {
  const result = reliabilityIndices(Array.from({ length: 30 }, (_, i) => report(0, { id: String(i), createdAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString() })))
  assert.equal(result.confidence, 'preliminary')
})
test('availability denominator handles multiple facilities on the same date', () => {
  const result = reliabilityIndices([report(12, { facilityId: 'a' }), report(12, { id: 'b', facilityId: 'b' })])
  assert.equal(result.availabilityPercent, 50)
})
test('zero-outage rows contribute reporting coverage but no interruptions', () => {
  const result = reliabilityIndices([report(0)]); assert.equal(result.interruptions, 0); assert.equal(result.availabilityPercent, 100)
})
test('outage coverage and EENS reflect autonomy, critical load and generator support', () => {
  const result = storageCoverage(facility, [report(4), report(8, { id: 'r2' })])
  assert.equal(result.lossOfLoadHours, 2); assert.equal(result.energyNotServedKwh, 2.4); assert.equal(result.coveredOutages, 1); assert.equal(result.coveragePercent, 50)
  const generator = storageCoverage(facility, [report(8, { generatorHours: 2 })]); assert.equal(generator.lossOfLoadHours, 0)
})
test('storage coverage remains unknown when battery assumptions are absent', () => {
  const result = storageCoverage({ id: 'x', hasFridge: false }, [report(4)]); assert.equal(result.lossOfLoadHours, null); assert.equal(result.coveragePercent, null)
})
test('holdover estimate is never guessed when the facility has no unit data', () => assert.equal(holdoverScreen({ ...facility, fridgeHoldoverHours: undefined }, report(20)), null))
test('holdover screening exposes margin without claiming a measured temperature excursion', () => {
  const result = holdoverScreen({ ...facility, fridgeHoldoverHours: 12 }, report(20))
  assert.equal(result.marginHours, -2); assert.equal(result.screenExceeded, true)
})
test('outage window counts ignore unknown times and no-outage check-ins', () => {
  const result = outageWindowCounts([report(2), report(0, { id: 'z', outageWindow: 'night' }), report(3, { id: 'u', outageWindow: 'unknown' }), report(4, { id: 'e', outageWindow: 'evening' })])
  assert.equal(result.counts.morning, 1); assert.equal(result.counts.night, 0); assert.equal(result.leastReportedWindow, 'morning')
})
test('outage window comparison stays blank without two observed outage categories', () => assert.equal(outageWindowCounts([report(3, { outageWindow: 'unknown' })]).leastReportedWindow, null))
test('maintenance cycle uses opened-to-verified timestamps and does not call it repair time', () => {
  const result = maintenanceMetrics([{ id: 't', facilityId: 'f', issue: 'x', owner: 'x', createdAt: '2026-01-01T00:00:00Z', dueAt: '', status: 'verified', verifiedAt: '2026-01-02T00:00:00Z', healthyAfterFix: 2 }])
  assert.equal(result.mttrHours, 24); assert.equal(result.eventIntervalHours, null)
})
test('same-equipment event interval is not estimated without equipment identifiers', () => assert.equal(maintenanceMetrics([]).eventIntervalHours, null))
test('equipment event interval is calculated only across matching equipment identifiers', () => {
  const base = { facilityId: 'f', issue: 'x', owner: 'x', dueAt: '', status: 'verified', healthyAfterFix: 2, equipmentId: 'battery-serial-a', verifiedAt: '2026-01-03T00:00:00Z' }
  assert.equal(maintenanceMetrics([{ ...base, id: 'a', createdAt: '2026-01-01T00:00:00Z' }, { ...base, id: 'b', createdAt: '2026-01-03T00:00:00Z' }]).eventIntervalHours, 48)
})
test('priority sensitivity range contains the nominal score', () => {
  const result = robustPriority(40, { outage: 20, storage: 10 }); assert.ok(result.min <= result.nominal); assert.ok(result.max >= result.nominal)
})
test('investment what-if avoids no more energy than the baseline scenario', () => {
  const result = evaluateUpgrade({ facility, reports: [report(10)], extraBatteryKwh: 5, cost: 1000, lifeYears: 5, annualBudget: 300 })
  assert.ok(result.after.energyNotServedKwh <= result.base.energyNotServedKwh); assert.equal(result.withinBudget, true)
})
test('non-positive equipment life keeps finance metric unavailable', () => {
  const result = evaluateUpgrade({ facility, reports: [report(10)], extraBatteryKwh: 1, cost: 100, lifeYears: 0, annualBudget: 500 })
  assert.equal(result.annualizedCost, null)
})
test('monthly reliability groups report rows by calendar month', () => {
  const result = monthlyReliability([report(2), report(4, { id: 'r2', createdAt: '2026-11-01T00:00:00Z' })])
  assert.equal(result.length, 2); assert.equal(result[0].month, '2026-10'); assert.equal(result[1].month, '2026-11')
})
test('rainy and dry comparison needs both user-assigned local categories', () => {
  assert.equal(seasonalComparison([report(2, { localSeason: 'rainy' })]).outageHourDifference, null)
  const both = seasonalComparison([report(5, { localSeason: 'rainy' }), report(2, { id: 'dry', localSeason: 'dry' })])
  assert.equal(both.outageHourDifference, 3); assert.equal(both.comparable, true)
})

// Property-style cases: more storage must never increase the estimated loss of load.
for (let extra = 0; extra <= 20; extra += .5) test(`adding ${extra} kWh never increases loss-of-load`, () => {
  const low = storageCoverage({ ...facility, batteryKwh: 2 }, [report(8), report(14, { id: 'r2' })]).lossOfLoadHours
  const high = storageCoverage({ ...facility, batteryKwh: 2 + extra }, [report(8), report(14, { id: 'r2' })]).lossOfLoadHours
  assert.ok(high <= low)
})

for (let hours = 0; hours <= 24; hours += 1) test(`loss-of-load is nonnegative for a ${hours}-hour event`, () => {
  const result = storageCoverage(facility, [report(hours)])
  assert.ok(result.lossOfLoadHours >= 0)
})

for (const status of ['healthy','low','failed']) test(`outage screening returns a bounded coverage rate for ${status} storage`, () => {
  const result = storageCoverage(facility, [report(6, { battery: status })])
  assert.ok(result.coveragePercent >= 0 && result.coveragePercent <= 100)
})
