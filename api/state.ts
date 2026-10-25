import { admin, send } from './_lib/db'

const facility = (x: any) => ({ id: x.id, code: x.code, name: x.name, region: x.region, level: x.level, peopleServed: x.people_served, hasFridge: x.has_fridge, hasMaternity: x.has_maternity })
const report = (x: any) => ({ id: x.id, facilityId: x.facility_id, createdAt: x.created_at, outageHours: Number(x.outage_hours), battery: x.battery, backup: x.backup, fridge: x.fridge, channel: x.channel, note: x.note ?? undefined })
const ticket = (x: any) => ({ id: x.id, facilityId: x.facility_id, issue: x.issue, owner: x.owner, createdAt: x.created_at, dueAt: x.due_at, status: x.status, fixedAt: x.fixed_at ?? undefined, verifiedAt: x.verified_at ?? undefined, healthyAfterFix: x.healthy_after_fix })
const flex = (x: any) => ({ id: x.id, facilityId: x.facility_id, createdAt: x.created_at, activity: x.activity, protectedLoad: x.protected_load, completed: x.completed, note: x.note ?? undefined })
export default async function handler(_req: any, res: any) {
  try {
    const db = admin()
    const [f, r, t, x] = await Promise.all([
      db.from('facilities').select('*').order('code'),
      db.from('reports').select('*').order('created_at', { ascending: false }).limit(1000),
      db.from('tickets').select('*').order('created_at', { ascending: false }),
      db.from('flex_actions').select('*').order('created_at', { ascending: false }),
    ])
    const failed = [f, r, t, x].find(v => v.error)
    if (failed?.error) throw failed.error
    return send(res, 200, { facilities: (f.data ?? []).map(facility), reports: (r.data ?? []).map(report), tickets: (t.data ?? []).map(ticket), flex: (x.data ?? []).map(flex) })
  } catch (error) { console.error('state load failed', error); return send(res, 500, { error: 'Could not load prototype data.' }) }
}
