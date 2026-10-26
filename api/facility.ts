import { admin, allowed, rateLimited, send } from './_lib/db'

export default async function handler(req: any, res: any) {
  if (!allowed(req, res)) return
  if (!await rateLimited(req, res)) return
  const b = req.body ?? {}
  const bounded = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
  if (typeof b.facilityId !== 'string' || b.facilityId.length > 80 || typeof b.remote !== 'boolean' ||
      !bounded(b.batteryKwh, 0, 100000) || !bounded(b.usableFraction, 0, 1) || !bounded(b.inverterEfficiency, 0, 1) ||
      !bounded(b.criticalLoadKw, .001, 100000) || !(b.fridgeHoldoverHours === null || bounded(b.fridgeHoldoverHours, 0, 10000))) {
    return send(res, 400, { error: 'Enter valid facility storage assumptions. Holdover may be left blank.' })
  }
  try {
    const result = await admin().from('facilities').update({ remote: b.remote, battery_kwh: b.batteryKwh, usable_fraction: b.usableFraction,
      inverter_efficiency: b.inverterEfficiency, critical_load_kw: b.criticalLoadKw, fridge_holdover_hours: b.fridgeHoldoverHours })
      .eq('id', b.facilityId).select('id').maybeSingle()
    if (result.error) throw result.error
    if (!result.data) return send(res, 404, { error: 'Facility was not found.' })
    return send(res, 200, { ok: true })
  } catch (error) { console.error('facility configuration save failed', error); return send(res, 500, { error: 'Could not save facility configuration.' }) }
}
