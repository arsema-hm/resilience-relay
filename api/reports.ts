import { admin, allowed, facilityById, isHealthy, isSevere, newId, send, validText } from './_lib/db'

const choices = { battery: ['healthy', 'low', 'failed'], backup: ['available', 'limited', 'unavailable'], fridge: ['healthy', 'at_risk', 'failed'] }
export default async function handler(req: any, res: any) {
  if (!allowed(req, res)) return
  const b = req.body ?? {}
  const hours = Number(b.outageHours)
  if (typeof b.reporterId !== 'string' || !/^user-0[1-3]$/.test(b.reporterId) || !Number.isFinite(hours) || hours < 0 || hours > 24 || !choices.battery.includes(b.battery) || !choices.backup.includes(b.backup) || !choices.fridge.includes(b.fridge) || (b.note && !validText(b.note, 180))) return send(res, 400, { error: 'Check the report fields and try again.' })
  try {
    const db = admin(); const f = await facilityById(db, b.facilityId)
    if (!f) return send(res, 400, { error: 'Unknown demo facility.' })
    const reporter = await db.from('demo_users').select('id').eq('id', b.reporterId).maybeSingle()
    if (reporter.error) throw reporter.error
    if (!reporter.data || reporter.data.id === 'user-telegram') return send(res, 400, { error: 'Choose a valid sample reporter.' })
    const report = { id: newId('r'), facility_id: f.id, reporter_id: reporter.data.id, outage_hours: hours, battery: b.battery, backup: b.backup, fridge: b.fridge, channel: 'web', note: typeof b.note === 'string' ? b.note.trim() || null : null }
    const inserted = await db.from('reports').insert(report).select('*').single()
    if (inserted.error) throw inserted.error
    const { data: candidates, error: ticketErr } = await db.from('tickets').select('*').eq('facility_id', f.id).neq('status', 'verified')
    if (ticketErr) throw ticketErr
    for (const t of candidates ?? []) {
      if (t.status !== 'fixed_reported' || !t.fixed_at || Date.parse(inserted.data.created_at) <= Date.parse(t.fixed_at)) continue
      const healthy = isHealthy(inserted.data)
      const count = healthy ? t.healthy_after_fix + 1 : 0
      const update = count >= 2 ? { status: 'verified', healthy_after_fix: count, verified_at: inserted.data.created_at } : { status: 'fixed_reported', healthy_after_fix: count }
      const result = await db.from('tickets').update(update).eq('id', t.id)
      if (result.error) throw result.error
    }
    if (isSevere(inserted.data) && !(candidates ?? []).length) {
      const issue = b.fridge === 'failed' ? 'Vaccine refrigerator failure reported' : b.battery === 'failed' ? 'Battery failure reported' : b.backup === 'unavailable' ? 'Backup supply unavailable' : 'Prolonged grid interruption reported'
      const created = await db.from('tickets').insert({ id: newId('t'), facility_id: f.id, issue, owner: 'District energy officer', status: 'open', healthy_after_fix: 0 })
      if (created.error && created.error.code !== '23505') throw created.error
    }
    return send(res, 201, { ok: true })
  } catch (error) { console.error('report save failed', error); return send(res, 500, { error: 'Could not save the report.' }) }
}
