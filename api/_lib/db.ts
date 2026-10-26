import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

export function admin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server database is not configured.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
export function send(res: any, status: number, body: object) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body)
}
export function allowed(req: any, res: any) {
  if (req.method !== 'POST') { send(res, 405, { error: 'Method not allowed.' }); return false }
  const origin = req.headers.origin
  const host = req.headers.host
  if (origin && host) {
    try { if (new URL(origin).host !== host) { send(res, 403, { error: 'Cross-origin request denied.' }); return false } } catch { send(res, 403, { error: 'Invalid origin.' }); return false }
  }
  return true
}
export function newId(prefix: string) { return `${prefix}-${crypto.randomUUID()}` }
export async function rateLimited(req: any, res: any) {
  const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',').map((x: string) => x.trim()).filter(Boolean).at(-1)
  const ip = String(req.headers['x-real-ip'] ?? forwarded ?? 'unknown').slice(0, 120)
  const clientHash = createHash('sha256').update(ip).digest('hex')
  try {
    const { data, error } = await admin().rpc('consume_demo_write_limit', { p_client_hash: clientHash, p_limit: 20, p_window_seconds: 3600 })
    if (error) throw error
    if (!data) { send(res, 429, { error: 'Demo write limit reached. Try again later.' }); return false }
    return true
  } catch (error) {
    console.error('write rate limit unavailable', error)
    send(res, 503, { error: 'Write protection is unavailable. Ask the demo administrator to apply the latest database schema.' })
    return false
  }
}
export function validText(value: unknown, max = 180): value is string { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max }
export function isHealthy(r: any) { return Number(r.outage_hours) <= 2 && r.battery === 'healthy' && r.backup === 'available' && r.fridge === 'healthy' }
export function isSevere(r: any) { return r.battery === 'failed' || r.fridge === 'failed' || r.backup === 'unavailable' || Number(r.outage_hours) >= 12 }
export async function facilityById(db: any, id: unknown) {
  if (typeof id !== 'string' || id.length > 80) return null
  const { data, error } = await db.from('facilities').select('id,code,name').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
