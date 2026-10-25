import { admin, allowed, facilityById, newId, send } from './_lib/db'
export default async function handler(req: any, res: any) {
  if (!allowed(req, res)) return
  const b = req.body ?? {}
  const allowedActivities = ['Water pumping','Laundry','Device charging','Other staff-confirmed task']
  const allowedLoads = ['Vaccine refrigerator','Essential lighting','Communications equipment','Other essential load']
  if (!allowedActivities.includes(b.activity) || !allowedLoads.includes(b.protectedLoad) || typeof b.completed !== 'boolean') return send(res, 400, { error: 'Choose an available activity, protected load, and completion state.' })
  try {
    const db = admin(); const f = await facilityById(db, b.facilityId)
    if (!f) return send(res, 400, { error: 'Unknown demo facility.' })
    const result = await db.from('flex_actions').insert({ id: newId('x'), facility_id: f.id, activity: b.activity, protected_load: b.protectedLoad, completed: b.completed, note: 'Staff-confirmed entry' })
    if (result.error) throw result.error
    return send(res, 201, { ok: true })
  } catch (error) { console.error('flex action save failed', error); return send(res, 500, { error: 'Could not save this entry.' }) }
}
