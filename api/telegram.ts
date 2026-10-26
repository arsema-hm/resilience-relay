import { admin, isHealthy, isSevere, newId, send } from './_lib/db'

type TgButton = { text: string; callback_data: string }
const keyboard = (rows: TgButton[][]) => ({ inline_keyboard: rows })
async function telegram(method: string, payload: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('Telegram bot is not configured.')
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error(`Telegram API ${method} failed (${response.status}).`)
  return response.json()
}
async function sendText(chatId: number, text: string, reply_markup?: object) {
  return telegram('sendMessage', { chat_id: chatId, text, ...(reply_markup ? { reply_markup } : {}) })
}
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return send(res, 200, { status: 'Resilience Relay Telegram webhook' })
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || req.headers['x-telegram-bot-api-secret-token'] !== secret) return send(res, 401, { error: 'Unauthorized webhook.' })
  try {
    const update = req.body ?? {}
    if (update.message?.chat?.id && typeof update.message.text === 'string') await onText(update.message)
    else if (update.callback_query?.message?.chat?.id) await onButton(update.callback_query)
    return send(res, 200, { ok: true })
  } catch (error) { console.error('telegram update failed', error); return send(res, 200, { ok: true }) }
}

async function onText(message: any) {
  const chat = message.chat.id as number
  const text = String(message.text).trim()
  if (text.startsWith('/')) {
    await sendText(chat, 'Resilience Relay demo · የሙከራ ቦት። Send a fictional facility code such as DEMO-01 to record an observed grid and backup check-in. ለምሳሌ DEMO-01 ይላኩ። Do not send patient details · የታካሚ መረጃ አይላኩ።')
    return
  }
  const code = text.toUpperCase()
  if (!/^DEMO-\d{2}$/.test(code)) { await sendText(chat, 'Use a demo facility code such as DEMO-01 · የሙከራ ቦታ ኮድ ይጠቀሙ። No patient information · የታካሚ መረጃ አይላኩ።'); return }
  const { data: facility, error } = await admin().from('facilities').select('id,name,code').eq('code', code).maybeSingle()
  if (error) throw error
  if (!facility) { await sendText(chat, 'That demo code was not found. Try DEMO-01 through DEMO-06.'); return }
  await sendText(chat, `${facility.name} (${facility.code})\n1 of 5 · 1 ከ 5\nHow many hours was grid power off today? · ዛሬ የኤሌክትሪክ መቋረጥ ስንት ሰዓት ነበር?`, keyboard([
    [{ text: '0 h', callback_data: `h|${facility.id}|0` }, { text: '2 h', callback_data: `h|${facility.id}|2` }, { text: '6 h', callback_data: `h|${facility.id}|6` }],
    [{ text: '12 h', callback_data: `h|${facility.id}|12` }, { text: '18 h+', callback_data: `h|${facility.id}|18` }],
  ]))
}

async function onButton(query: any) {
  const chat = query.message.chat.id as number
  await telegram('answerCallbackQuery', { callback_query_id: query.id })
  const parts = String(query.data ?? '').split('|')
  const [step, facilityId, hours, window, battery, backup, fridge] = parts
  const facility = await admin().from('facilities').select('id,name').eq('id', facilityId).maybeSingle()
  if (facility.error) throw facility.error
  if (!facility.data) { await sendText(chat, 'That demo facility is no longer available. Start again with its DEMO code.'); return }
  if (step === 'h' && parts.length === 3 && ['0', '2', '6', '12', '18'].includes(hours)) {
    await sendText(chat, '2 of 5 · 2 ከ 5\nWhen did the outage start? · መቋረጡ መቼ ጀመረ?', keyboard([[{ text: 'Morning · ጠዋት', callback_data: `w|${facilityId}|${hours}|morning` }, { text: 'Afternoon · ከሰዓት', callback_data: `w|${facilityId}|${hours}|afternoon` }], [{ text: 'Evening · ምሽት', callback_data: `w|${facilityId}|${hours}|evening` }, { text: 'Night · ሌሊት', callback_data: `w|${facilityId}|${hours}|night` }], [{ text: 'Unknown · አላውቅም', callback_data: `w|${facilityId}|${hours}|unknown` }]])); return
  }
  if (step === 'w' && parts.length === 4 && ['0','2','6','12','18'].includes(hours) && ['morning','afternoon','evening','night','unknown'].includes(window)) {
    await sendText(chat, '3 of 5 · 3 ከ 5\nObserved battery status? · የባትሪው ሁኔታ?', keyboard([[{ text: 'Healthy · ጥሩ', callback_data: `b|${facilityId}|${hours}|${window}|healthy` }, { text: 'Low · ዝቅተኛ', callback_data: `b|${facilityId}|${hours}|${window}|low` }, { text: 'Failed · ተበላሽቷል', callback_data: `b|${facilityId}|${hours}|${window}|failed` }]])); return
  }
  if (step === 'b' && parts.length === 5 && ['healthy','low','failed'].includes(battery)) {
    await sendText(chat, '4 of 5 · 4 ከ 5\nBackup supply status? · የመጠባበቂያ ኃይል ሁኔታ?', keyboard([[{ text: 'Available · አለ', callback_data: `u|${facilityId}|${hours}|${window}|${battery}|available` }, { text: 'Limited · ውስን', callback_data: `u|${facilityId}|${hours}|${window}|${battery}|limited` }, { text: 'Unavailable · የለም', callback_data: `u|${facilityId}|${hours}|${window}|${battery}|unavailable` }]])); return
  }
  if (step === 'u' && parts.length === 6 && ['healthy','low','failed'].includes(battery) && ['available','limited','unavailable'].includes(backup)) {
    await sendText(chat, '5 of 5 · 5 ከ 5\nVaccine refrigerator observation? · የክትባት ማቀዝቀዣ ሁኔታ?', keyboard([[{ text: 'Healthy · ጥሩ', callback_data: `r|${facilityId}|${hours}|${window}|${battery}|${backup}|healthy` }, { text: 'At risk · አደጋ ላይ', callback_data: `r|${facilityId}|${hours}|${window}|${battery}|${backup}|at_risk` }, { text: 'Failed · ተበላሽቷል', callback_data: `r|${facilityId}|${hours}|${window}|${battery}|${backup}|failed` }]])); return
  }
  if (step === 'r' && parts.length === 7 && ['healthy','low','failed'].includes(battery) && ['available','limited','unavailable'].includes(backup) && ['healthy','at_risk','failed'].includes(fridge)) {
    const hoursNumber = Number(hours)
    if (!Number.isFinite(hoursNumber) || hoursNumber < 0 || hoursNumber > 24) return
    await saveReport(chat, facility.data, hoursNumber, window, battery, backup, fridge); return
  }
  await sendText(chat, 'That button has expired. Start again by sending the demo facility code.')
}

async function saveReport(chat: number, facility: { id: string; name: string }, outageHours: number, outageWindow: string, battery: string, backup: string, fridge: string) {
  const db = admin()
  const inserted = await db.from('reports').insert({ id: newId('r'), facility_id: facility.id, reporter_id: 'user-telegram', outage_hours: outageHours, outage_count: outageHours > 0 ? 1 : 0, longest_outage_hours: outageHours, outage_window: outageWindow, generator_hours: 0, battery, backup, fridge, channel: 'telegram', note: 'Telegram check-in · observation' }).select('*').single()
  if (inserted.error) throw inserted.error
  const { data: tickets, error } = await db.from('tickets').select('*').eq('facility_id', facility.id).neq('status', 'verified')
  if (error) throw error
  for (const ticket of tickets ?? []) {
    if (ticket.status !== 'fixed_reported' || !ticket.fixed_at || Date.parse(inserted.data.created_at) <= Date.parse(ticket.fixed_at)) continue
    const count = isHealthy(inserted.data) ? ticket.healthy_after_fix + 1 : 0
    const update = count >= 2 ? { status: 'verified', healthy_after_fix: count, verified_at: inserted.data.created_at } : { status: 'fixed_reported', healthy_after_fix: count }
    const saved = await db.from('tickets').update(update).eq('id', ticket.id)
    if (saved.error) throw saved.error
  }
  if (isSevere(inserted.data) && !(tickets ?? []).length) {
    const issue = fridge === 'failed' ? 'Vaccine refrigerator failure reported' : battery === 'failed' ? 'Battery failure reported' : backup === 'unavailable' ? 'Backup supply unavailable' : 'Prolonged grid interruption reported'
    const created = await db.from('tickets').insert({ id: newId('t'), facility_id: facility.id, issue, owner: 'District energy officer', status: 'open', healthy_after_fix: 0 })
    if (created.error && created.error.code !== '23505') throw created.error
  }
  await sendText(chat, `Check-in recorded for ${facility.name}.\nGrid off: ${outageHours} hours · Battery: ${battery} · Backup: ${backup} · Refrigerator: ${fridge}.\nThe demo dashboard priority queue is updated. This is an observation-only prototype.`)
}
