import { admin, allowed, newId, send } from './_lib/db'
export default async function handler(req: any, res: any) {
  if (!allowed(req, res)) return
  const id = req.body?.ticketId
  if (typeof id !== 'string' || id.length > 120) return send(res, 400, { error: 'Invalid ticket.' })
  try {
    const result = await admin().from('tickets').update({ status: 'fixed_reported', fixed_at: new Date().toISOString(), healthy_after_fix: 0 }).eq('id', id).eq('status', 'open').select('id').maybeSingle()
    if (result.error) throw result.error
    if (!result.data) return send(res, 409, { error: 'Ticket is no longer open.' })
    return send(res, 200, { ok: true, eventId: newId('evt') })
  } catch (error) { console.error('repair update failed', error); return send(res, 500, { error: 'Could not update ticket.' }) }
}
