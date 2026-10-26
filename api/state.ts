import { admin, send } from './_lib/db'

const facility = (x: any) => ({ id: x.id, code: x.code, name: x.name, region: x.region, level: x.level, peopleServed: x.people_served, hasFridge: x.has_fridge, hasMaternity: x.has_maternity, remote: x.remote ?? false, batteryKwh: x.battery_kwh ?? undefined, usableFraction: x.usable_fraction ?? undefined, inverterEfficiency: x.inverter_efficiency ?? undefined, criticalLoadKw: x.critical_load_kw ?? undefined, fridgeHoldoverHours: x.fridge_holdover_hours ?? undefined })
const user = (x: any) => ({ id: x.id, displayName: x.display_name, role: x.role })
const report = (x: any) => ({ id: x.id, facilityId: x.facility_id, reporterId: x.reporter_id ?? undefined, createdAt: x.created_at, outageHours: Number(x.outage_hours), outageCount: x.outage_count ?? undefined, longestOutageHours: x.longest_outage_hours ?? undefined, outageWindow: x.outage_window ?? 'unknown', generatorHours: Number(x.generator_hours ?? 0), localSeason: x.local_season ?? 'unknown', battery: x.battery, backup: x.backup, fridge: x.fridge, channel: x.channel, note: x.note ?? undefined })
const ticket = (x: any) => ({ id: x.id, facilityId: x.facility_id, issue: x.issue, owner: x.owner, createdAt: x.created_at, dueAt: x.due_at, status: x.status, fixedAt: x.fixed_at ?? undefined, verifiedAt: x.verified_at ?? undefined, healthyAfterFix: x.healthy_after_fix })
const flex = (x: any) => ({ id: x.id, facilityId: x.facility_id, createdAt: x.created_at, activity: x.activity, protectedLoad: x.protected_load, completed: x.completed, note: x.note ?? undefined })
export default async function handler(_req: any, res: any) {
  try {
    const db = admin()
    const [f, u, r, t, x] = await Promise.all([
      db.from('facilities').select('*').order('code'),
      db.from('demo_users').select('*').order('display_name'),
      db.from('reports').select('*').order('created_at', { ascending: false }).limit(1000),
      db.from('tickets').select('*').order('created_at', { ascending: false }),
      db.from('flex_actions').select('*').order('created_at', { ascending: false }),
    ])
    const failed = [f, u, r, t, x].find(v => v.error)
    if (failed?.error) throw failed.error
    return send(res, 200, { facilities: (f.data ?? []).map(facility), users: (u.data ?? []).map(user), reports: (r.data ?? []).map(report), tickets: (t.data ?? []).map(ticket), flex: (x.data ?? []).map(flex) })
  } catch (error) { console.error('state load failed', error); return send(res, 500, { error: 'Could not load prototype data.' }) }
}
