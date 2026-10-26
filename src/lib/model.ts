export type BatteryStatus = 'healthy' | 'low' | 'failed'
export type BackupStatus = 'available' | 'limited' | 'unavailable'
export type FridgeStatus = 'healthy' | 'at_risk' | 'failed'
export type Report = {
  id: string; facilityId: string; createdAt: string; outageHours: number
  battery: BatteryStatus; backup: BackupStatus; fridge: FridgeStatus
  channel: 'web' | 'telegram'; note?: string; reporterId?: string
}
export type DemoUser = { id: string; displayName: string; role: string }
export type Ticket = {
  id: string; facilityId: string; issue: string; owner: string; createdAt: string
  dueAt: string; status: 'open' | 'fixed_reported' | 'verified'; fixedAt?: string
  verifiedAt?: string; healthyAfterFix: number
}
export type FlexAction = {
  id: string; facilityId: string; createdAt: string; activity: string
  protectedLoad: string; completed: boolean; note?: string
}
export type Facility = {
  id: string; code: string; name: string; region: string; level: string
  peopleServed: number; hasFridge: boolean; hasMaternity: boolean
}
export type AppData = { facilities: Facility[]; reports: Report[]; tickets: Ticket[]; flex: FlexAction[]; users: DemoUser[] }

export const demoUsers: DemoUser[] = [
  { id: 'user-01', displayName: 'Sample Reporter 01', role: 'Facility energy focal point' },
  { id: 'user-02', displayName: 'Sample Reporter 02', role: 'Facility energy focal point' },
  { id: 'user-03', displayName: 'Sample Coordinator', role: 'District energy coordinator' },
  { id: 'user-telegram', displayName: 'Telegram demo bot', role: 'Automated demo channel' },
]

export const facilities: Facility[] = [
  { id: 'f-01', code: 'DEMO-01', name: 'Highland Health Centre', region: 'Amhara', level: 'Health centre', peopleServed: 8200, hasFridge: true, hasMaternity: true },
  { id: 'f-02', code: 'DEMO-02', name: 'Riverbend Health Post', region: 'Oromia', level: 'Health post', peopleServed: 3100, hasFridge: true, hasMaternity: false },
  { id: 'f-03', code: 'DEMO-03', name: 'Lakeview Health Centre', region: 'Sidama', level: 'Health centre', peopleServed: 6400, hasFridge: true, hasMaternity: true },
  { id: 'f-04', code: 'DEMO-04', name: 'Sunrise Primary Clinic', region: 'Oromia', level: 'Health post', peopleServed: 2700, hasFridge: false, hasMaternity: false },
  { id: 'f-05', code: 'DEMO-05', name: 'Mountain Gate Hospital', region: 'Amhara', level: 'Hospital', peopleServed: 14600, hasFridge: true, hasMaternity: true },
  { id: 'f-06', code: 'DEMO-06', name: 'Green Valley Health Centre', region: 'Sidama', level: 'Health centre', peopleServed: 5100, hasFridge: true, hasMaternity: false },
]

const ago = (days: number, hour = 9) => {
  const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, 0, 0, 0); return d.toISOString()
}
export const initialData: AppData = {
  facilities,
  users: demoUsers,
  reports: [
    { id: 'r-01', facilityId: 'f-01', createdAt: ago(0, 7), outageHours: 10, battery: 'low', backup: 'limited', fridge: 'at_risk', channel: 'telegram', note: 'Synthetic demo report', reporterId: 'user-telegram' },
    { id: 'r-02', facilityId: 'f-01', createdAt: ago(1), outageHours: 8, battery: 'low', backup: 'available', fridge: 'healthy', channel: 'web', note: 'Synthetic demo report', reporterId: 'user-01' },
    { id: 'r-03', facilityId: 'f-02', createdAt: ago(0, 8), outageHours: 2, battery: 'healthy', backup: 'available', fridge: 'healthy', channel: 'web', note: 'Synthetic demo report', reporterId: 'user-02' },
    { id: 'r-04', facilityId: 'f-03', createdAt: ago(0, 8), outageHours: 15, battery: 'failed', backup: 'unavailable', fridge: 'failed', channel: 'telegram', note: 'Synthetic demo report', reporterId: 'user-telegram' },
    { id: 'r-05', facilityId: 'f-03', createdAt: ago(1), outageHours: 11, battery: 'low', backup: 'limited', fridge: 'at_risk', channel: 'web', note: 'Synthetic demo report', reporterId: 'user-03' },
    { id: 'r-06', facilityId: 'f-04', createdAt: ago(0, 8), outageHours: 0, battery: 'healthy', backup: 'available', fridge: 'healthy', channel: 'web', note: 'Synthetic demo report', reporterId: 'user-01' },
    { id: 'r-07', facilityId: 'f-05', createdAt: ago(0, 8), outageHours: 5, battery: 'healthy', backup: 'available', fridge: 'healthy', channel: 'web', note: 'Synthetic demo report', reporterId: 'user-02' },
    { id: 'r-08', facilityId: 'f-06', createdAt: ago(0, 8), outageHours: 7, battery: 'low', backup: 'available', fridge: 'healthy', channel: 'telegram', note: 'Synthetic demo report', reporterId: 'user-telegram' },
    { id: 'r-09', facilityId: 'f-03', createdAt: ago(2, 8), outageHours: 14, battery: 'low', backup: 'limited', fridge: 'at_risk', channel: 'web', note: 'Synthetic demo report', reporterId: 'user-03' },
    { id: 'r-10', facilityId: 'f-06', createdAt: ago(2, 8), outageHours: 1, battery: 'healthy', backup: 'available', fridge: 'healthy', channel: 'web', note: 'Synthetic report after reported repair', reporterId: 'user-02' },
    { id: 'r-11', facilityId: 'f-06', createdAt: ago(1, 8), outageHours: 1, battery: 'healthy', backup: 'available', fridge: 'healthy', channel: 'web', note: 'Synthetic report after reported repair', reporterId: 'user-01' },
  ],
  tickets: [
    { id: 't-01', facilityId: 'f-03', issue: 'Battery failed; vaccine fridge at risk', owner: 'District energy officer', createdAt: ago(1), dueAt: ago(-2), status: 'open', healthyAfterFix: 0 },
    { id: 't-02', facilityId: 'f-01', issue: 'Repeated long grid interruptions; battery low', owner: 'District energy officer', createdAt: ago(1), dueAt: ago(-2), status: 'open', healthyAfterFix: 0 },
    { id: 't-03', facilityId: 'f-06', issue: 'Battery service check completed', owner: 'District energy officer', createdAt: ago(4), dueAt: ago(1), status: 'verified', fixedAt: ago(3), verifiedAt: ago(1), healthyAfterFix: 2 },
  ],
  flex: [
    { id: 'x-01', facilityId: 'f-02', createdAt: ago(1), activity: 'Water pumping', protectedLoad: 'Vaccine refrigerator', completed: true, note: 'Demo entry, staff-confirmed action' },
    { id: 'x-02', facilityId: 'f-06', createdAt: ago(0, 7), activity: 'Laundry', protectedLoad: 'Essential lighting', completed: true, note: 'Demo entry, staff-confirmed action' },
  ],
}

export function severity(report: Report) {
  return report.battery === 'failed' || report.fridge === 'failed' || report.outageHours >= 12 || report.backup === 'unavailable'
}
export function isHealthy(report: Report) {
  return report.outageHours <= 2 && report.battery === 'healthy' && report.backup === 'available' && report.fridge === 'healthy'
}
export function riskScore(facility: Facility, reports: Report[], tickets: Ticket[], now = Date.now()) {
  const recent = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7)
  const avgOutage = recent.length ? recent.reduce((sum, r) => sum + r.outageHours, 0) / recent.length : 0
  const outage = Math.min(avgOutage / 18, 1) * 30
  const criticalCount = recent.filter(r => facility.hasFridge && r.fridge !== 'healthy').length
  const critical = recent.length ? (criticalCount / recent.length) * 25 : 0
  const latest = recent[0]
  const battery = latest?.battery === 'failed' ? 1 : latest?.battery === 'low' ? 0.45 : 0
  const backup = latest?.backup === 'unavailable' ? 1 : latest?.backup === 'limited' ? 0.45 : 0
  const storage = Math.max(battery, backup) * 20
  const open = tickets.filter(t => t.status !== 'verified')
  const oldestDays = open.length ? Math.max(...open.map(t => Math.max(0, (now - Date.parse(t.createdAt)) / 86400000))) : 0
  const ticketAge = Math.min(oldestDays / 7, 1) * 15
  const failureCount = reports.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30).filter(severity).length
  const repeat = Math.min(failureCount / 5, 1) * 10
  return { total: Math.round(outage + critical + storage + ticketAge + repeat), parts: { outage: Math.round(outage), critical: Math.round(critical), storage: Math.round(storage), ticketAge: Math.round(ticketAge), repeat: Math.round(repeat) }, avgOutage: Math.round(avgOutage * 10) / 10 }
}

export function nextTicketStatus(ticket: Ticket, report: Report): Pick<Ticket, 'status' | 'healthyAfterFix' | 'verifiedAt'> {
  if (ticket.status !== 'fixed_reported' || !ticket.fixedAt || Date.parse(report.createdAt) <= Date.parse(ticket.fixedAt)) return { status: ticket.status, healthyAfterFix: ticket.healthyAfterFix }
  if (!isHealthy(report)) return { status: 'fixed_reported', healthyAfterFix: 0 }
  const count = ticket.healthyAfterFix + 1
  return count >= 2
    ? { status: 'verified', healthyAfterFix: count, verifiedAt: report.createdAt }
    : { status: 'fixed_reported', healthyAfterFix: count }
}

export function markTicketRepaired(data: AppData, ticketId: string, now = new Date().toISOString()): AppData {
  return { ...data, tickets: data.tickets.map(t => t.id === ticketId && t.status === 'open' ? { ...t, status: 'fixed_reported', fixedAt: now, healthyAfterFix: 0 } : t) }
}

export function recordReport(data: AppData, report: Report): AppData {
  let tickets = data.tickets.map(ticket => ({ ...ticket, ...nextTicketStatus(ticket, report) }))
  const facility = data.facilities.find(f => f.id === report.facilityId)
  if (facility && severity(report) && !tickets.some(t => t.facilityId === facility.id && t.status !== 'verified')) {
    const issue = report.fridge === 'failed' ? 'Vaccine refrigerator failure reported' : report.battery === 'failed' ? 'Battery failure reported' : report.backup === 'unavailable' ? 'Backup supply unavailable' : 'Prolonged grid interruption reported'
    tickets = [{ id: createId('t'), facilityId: facility.id, issue, owner: 'District energy officer', createdAt: report.createdAt, dueAt: new Date(Date.parse(report.createdAt) + 3 * 86400000).toISOString(), status: 'open' as const, healthyAfterFix: 0 }, ...tickets]
  }
  return { ...data, reports: [report, ...data.reports], tickets }
}

export function createId(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }
