const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const appUrl = process.env.APP_URL?.replace(/\/$/, '')
if (!token || !secret || !appUrl) {
  console.error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, and APP_URL in your private environment first.')
  process.exit(1)
}
if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
  console.error('TELEGRAM_WEBHOOK_SECRET must use 1-256 letters, numbers, underscores, or hyphens.')
  process.exit(1)
}
const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: `${appUrl}/api/telegram`, secret_token: secret, drop_pending_updates: false }),
})
const result = await response.json()
if (!response.ok || !result.ok) {
  console.error('Telegram did not accept the webhook configuration. Check the deployment URL and bot settings.')
  process.exit(1)
}
console.log('Telegram webhook connected to the deployed Resilience Relay function.')
