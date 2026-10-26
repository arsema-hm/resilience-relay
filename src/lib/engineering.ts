import type { Facility, OutageWindow, Report, Ticket } from './model'

export type Reliability = { interruptions: number; outageHours: number; avgRestoreHours: number | null; availabilityPercent: number | null; reportedDays: number; confidence: 'low' | 'preliminary' }
const finiteNonnegative = (n: number) => Number.isFinite(n) && n >= 0

/** Facility-level report analogue; not SAIDI/SAIFI and not a utility performance measure. */
export function reliabilityIndices(reports: Report[]): Reliability {
  const rows = reports.filter(r => Number.isFinite(r.outageHours) && r.outageHours >= 0)
  const outageHours = rows.reduce((sum, r) => sum + r.outageHours, 0)
  const interruptions = rows.reduce((sum, r) => sum + (r.outageCount ?? (r.outageHours > 0 ? 1 : 0)), 0)
  const reportedDays = new Set(rows.map(r => r.createdAt.slice(0, 10))).size
  const observedFacilityDays = new Set(rows.map(r => `${r.facilityId}:${r.createdAt.slice(0, 10)}`)).size
  const observedHours = observedFacilityDays * 24
  return { interruptions, outageHours, avgRestoreHours: interruptions ? outageHours / interruptions : null,
    availabilityPercent: observedHours ? Math.max(0, 1 - outageHours / observedHours) * 100 : null,
    reportedDays, confidence: reportedDays < 30 ? 'low' : 'preliminary' }
}

export function batteryAutonomyHours(input: { batteryKwh?: number; usableFraction?: number; inverterEfficiency?: number; criticalLoadKw?: number; status?: Report['battery'] }): number | null {
  const { batteryKwh, usableFraction = .8, inverterEfficiency = .9, criticalLoadKw } = input
  if (![batteryKwh, usableFraction, inverterEfficiency, criticalLoadKw].every(n => typeof n === 'number' && Number.isFinite(n)) || batteryKwh! < 0 || criticalLoadKw! <= 0 || usableFraction < 0 || usableFraction > 1 || inverterEfficiency < 0 || inverterEfficiency > 1) return null
  const derate = input.status === 'failed' ? 0 : input.status === 'low' ? .5 : 1
  return batteryKwh! * usableFraction * inverterEfficiency * derate / criticalLoadKw!
}

export function storageCoverage(facility: Facility, reports: Report[]) {
  const valid = reports.filter(r => r.outageHours > 0)
  const latestStatus = reports.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.battery
  const autonomyHours = batteryAutonomyHours({ ...facility, status: latestStatus })
  if (autonomyHours === null) return { autonomyHours: null, lossOfLoadHours: null, energyNotServedKwh: null, coveredOutages: 0, outageCount: valid.length, coveragePercent: null }
  let lossOfLoadHours = 0; let coveredOutages = 0
  for (const r of valid) {
    const events = Math.max(1, r.outageCount ?? 1)
    const perEvent = r.outageHours / events
    const generatorPerEvent = (r.generatorHours ?? 0) / events
    const eventAutonomy = batteryAutonomyHours({ ...facility, status: r.battery }) ?? autonomyHours
    let remaining = 0
    for (let i = 0; i < events; i++) remaining += Math.max(0, perEvent - eventAutonomy - generatorPerEvent)
    lossOfLoadHours += remaining
    if (remaining === 0) coveredOutages++
  }
  return { autonomyHours, lossOfLoadHours, energyNotServedKwh: lossOfLoadHours * (facility.criticalLoadKw ?? 0), coveredOutages, outageCount: valid.length, coveragePercent: valid.length ? coveredOutages / valid.length * 100 : 100 }
}

/** Screening flag only; holdover must be entered from the exact unit's approved data sheet. */
export function holdoverScreen(facility: Facility, report: Report) {
  if (!facility.hasFridge || !finiteNonnegative(facility.fridgeHoldoverHours ?? NaN)) return null
  const autonomy = batteryAutonomyHours({ ...facility, status: report.battery })
  if (autonomy === null) return null
  const events = Math.max(1, report.outageCount ?? 1)
  const perEvent = report.outageHours / events
  const backupPerEvent = autonomy + (report.generatorHours ?? 0) / events
  return { marginHours: facility.fridgeHoldoverHours! + backupPerEvent - perEvent, screenExceeded: perEvent > facility.fridgeHoldoverHours! + backupPerEvent }
}

export function outageWindowCounts(reports: Report[]) {
  const windows: Exclude<OutageWindow, 'unknown'>[] = ['morning', 'afternoon', 'evening', 'night']
  const counts = Object.fromEntries(windows.map(w => [w, reports.filter(r => r.outageHours > 0 && r.outageWindow === w).length])) as Record<Exclude<OutageWindow, 'unknown'>, number>
  const observed = windows.filter(w => counts[w] > 0)
  return { counts, leastReportedWindow: observed.length >= 2 ? observed.sort((a, b) => counts[a] - counts[b])[0] : null }
}

export function maintenanceMetrics(tickets: Ticket[]) {
  const verified = tickets.filter(t => t.status === 'verified' && t.verifiedAt)
  const cycleHours = verified.map(t => Math.max(0, (Date.parse(t.verifiedAt!) - Date.parse(t.createdAt)) / 3600000))
  const sameEquipmentGroups = new Map<string, number[]>()
  for (const t of tickets) if (t.equipmentId && t.verifiedAt) sameEquipmentGroups.set(t.equipmentId, [...(sameEquipmentGroups.get(t.equipmentId) ?? []), Date.parse(t.createdAt)])
  const intervals = [...sameEquipmentGroups.values()].flatMap(times => {
    const ordered = times.sort((a, b) => a - b)
    return ordered.slice(1).map((at, index) => (at - ordered[index]) / 3600000)
  })
  return { verifiedCount: verified.length, mttrHours: cycleHours.length ? cycleHours.reduce((a, b) => a + b, 0) / cycleHours.length : null,
    eventIntervalHours: intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null, intervalCount: intervals.length }
}

export function robustPriority(score: number, parts: Record<string, number>, repeatPercent = 20) {
  const nominal = score
  const scenarios = Object.keys(parts).flatMap(key => [-1, 1].map(direction => Math.max(0, Math.min(100, score + parts[key] * repeatPercent / 100 * direction))))
  return { nominal, min: Math.min(nominal, ...scenarios), max: Math.max(nominal, ...scenarios), spread: Math.max(nominal, ...scenarios) - Math.min(nominal, ...scenarios) }
}

export type UpgradeProposal = { facility: Facility; reports: Report[]; extraBatteryKwh: number; cost: number; lifeYears: number; annualBudget: number }
export function evaluateUpgrade(proposal: UpgradeProposal) {
  const base = storageCoverage(proposal.facility, proposal.reports)
  const upgrade: Facility = { ...proposal.facility, batteryKwh: (proposal.facility.batteryKwh ?? 0) + proposal.extraBatteryKwh }
  const after = storageCoverage(upgrade, proposal.reports)
  const validInputs = finiteNonnegative(proposal.extraBatteryKwh) && finiteNonnegative(proposal.cost) && finiteNonnegative(proposal.annualBudget) && Number.isFinite(proposal.lifeYears) && proposal.lifeYears > 0
  const avoided = !validInputs || base.energyNotServedKwh === null || after.energyNotServedKwh === null ? null : Math.max(0, base.energyNotServedKwh - after.energyNotServedKwh)
  const annualizedCost = validInputs ? proposal.cost / proposal.lifeYears : null
  return { avoidedKwh: avoided, annualizedCost, costPerAvoidedKwh: avoided && avoided > 0 && annualizedCost !== null ? annualizedCost / avoided : null, withinBudget: annualizedCost !== null && annualizedCost <= proposal.annualBudget, base, after }
}

export function monthlyReliability(reports: Report[]) {
  const groups = new Map<string, Report[]>()
  for (const report of reports) { const month = report.createdAt.slice(0, 7); groups.set(month, [...(groups.get(month) ?? []), report]) }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, rows]) => ({ month, ...reliabilityIndices(rows) }))
}

/** Seasonal labels are manually assigned using a facility's own local calendar. */
export function seasonalComparison(reports: Report[]) {
  const groups = { rainy: reports.filter(r => r.localSeason === 'rainy'), dry: reports.filter(r => r.localSeason === 'dry') }
  return { rainy: groups.rainy.length ? reliabilityIndices(groups.rainy) : null, dry: groups.dry.length ? reliabilityIndices(groups.dry) : null,
    comparable: groups.rainy.length > 0 && groups.dry.length > 0,
    outageHourDifference: groups.rainy.length && groups.dry.length ? groups.rainy.reduce((s,r)=>s+r.outageHours,0) - groups.dry.reduce((s,r)=>s+r.outageHours,0) : null }
}

export function reportByPeriods(reports: Report[], now = Date.now()) {
  const since = (days: number) => reports.filter(r => Date.parse(r.createdAt) >= now - days * 86400000)
  return { daily: reliabilityIndices(since(1)), weekly: reliabilityIndices(since(7)), monthly: reliabilityIndices(since(30)) }
}
