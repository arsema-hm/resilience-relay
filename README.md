# Resilience Relay

Resilience Relay is a prototype for documenting electricity interruptions, observed backup-system status, maintenance follow-up, and staff-confirmed flexibility actions at health facilities. It connects the IRENA Youth Forum 2027 theme areas of grids, storage, and flexibility in one operational workflow.

**This repository starts in local demo mode.** Facility names and reports are fictional; browser changes are stored in that browser only. The system records human observations, not sensor measurements. It does not predict battery failure, control electrical loads, or give instructions about medical equipment. Priority weights are illustrative and unvalidated. The demo has not been piloted in a health facility.

## Local start

Install Node.js LTS and Git, then open the project folder in VS Code. In **Terminal → New Terminal**, run:

```powershell
cd path\to\resilience-relay
npm install
npm run dev
```

Open the local URL printed by Vite. In local demo mode, check-ins, repair actions, and flexibility logs are kept in `localStorage` on that browser. Use **Reset demo** in the left navigation, account menu, or footer to restore the sample records. The workspace menu lists the fictional sample users; the check-in form lets you select one as the reporter. These are demo identities, not authenticated user accounts.

Useful commands:

```powershell
npm test
npm run build
npm run preview
```

## Demo workflow

1. Open **New check-in** and submit a fictional facility report.
2. A report with a failed battery, failed refrigerator, unavailable backup, or 12+ hours without grid power opens one maintenance ticket for that facility.
3. In **Maintenance**, mark an open ticket repaired.
4. Two later reports must meet the prototype healthy rule (grid outage at most 2 hours, battery healthy, backup available, refrigerator healthy). The first increments the evidence count; the second verifies the repair. An unhealthy report resets the count.
5. In **Flexibility log**, add a staff-confirmed entry, such as rescheduling water pumping while protecting the vaccine refrigerator. This only records the reported action; it never recommends changing clinical equipment use.
6. Export the facility summary as CSV.
7. Use the workspace selector to return to all facilities, the notification bell to open the maintenance queue, and the account menu to review demo access or reset sample data. The time-range filter updates overview and report-history summaries.

The maintenance view also shows a synthetic verified-repair share, average time from ticket creation to verification, and count of facilities with repeat severe reports. These are prototype workflow indicators, not proof of improved power reliability.

The priority rule is an explainable prototype score: outage exposure (30 points), critical-load observations (25), storage/backup status (20), ticket age plus a remote-site equity adjustment (15), and repeat severe reports (10). The 15-point ticket component includes up to 11 points for ticket age and 4 for the remote flag. The displayed components show the inputs. These weights are not validated by practitioners and must not guide real maintenance or care decisions.

## Engineering insights and evaluation materials

The **System insights** page adds report-derived facility reliability analogues, battery autonomy and loss-of-load screening, model-specific optional fridge holdover, outage time windows, illustrative deferrable-load energy, monthly trend, maintenance verification cycle, weight sensitivity, a battery investment what-if, and a downloadable district Markdown brief. Facility assumptions can be edited from that page. Local mode stores those edits in this browser. See [METHODS.md](METHODS.md) for formulas and limitations, [DATA_DICTIONARY.md](DATA_DICTIONARY.md) for field definitions and [VALIDATION_PLAN.md](VALIDATION_PLAN.md) for the uncompleted practitioner and usability worksheets.

The report form captures total outage hours, interruption count, longest event, approximate start window, generator-support hours, and a locally assigned rainy/dry/other/unknown season. Season is never inferred from month. A coarse time window only describes the submitted sample and is not a safe operating window. Flexibility insights apply only to non-clinical deferrable tasks; staff decide whether any change is suitable. The Telegram flow includes draft Amharic prompts, which need fluent local review before operational use.

The availability measure uses 24 hours per distinct facility-date with a report. Missing dates are not treated as powered time. Results are facility-level report analogues, not SAIDI/SAIFI or WHO indicators. Sample fixtures remain synthetic and intentionally short; seasonal charts do not establish seasonal patterns.

## Optional hosted demo with Supabase and Telegram

The API routes in `api/` are for a synthetic-data demonstration. They are not a production health-facility service. Anyone who can reach the public demo may submit a report for a fictional facility; do not put confidential facility, staff, or patient information in it. Real deployments need authenticated users, facility-level permissions, audit controls, rate limits, and a privacy/security review.

### Supabase

1. Create a Supabase project.
2. In its SQL Editor, run `supabase/schema.sql`. It seeds fictional facilities, reports, and sample reporter identities, and gives anonymous browser roles read-only access; direct browser writes are revoked. Writes go through server functions using a server-only service-role key.
3. To clear the hosted prototype's synthetic activity, run `supabase/reset_demo_data.sql`, then rerun `supabase/schema.sql` to restore the sample rows. This deletes all reports, tickets, and flexibility actions in this demo database. Do not use this schema or reset script for a real deployment.
3. Copy the project URL and service-role key into the hosting provider's server environment variables. Never use a `VITE_` prefix for the service-role key.

### Vercel

1. Push this repository to your GitHub account and import it in Vercel.
2. Add `VITE_REMOTE_MODE=true` as a build environment variable.
3. Add server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy. Confirm that `/api/state` returns only the synthetic records and the dashboard loads. Public form writes are validated by `/api/reports`, `/api/repair`, and `/api/flex`.

For local serverless development, use Vercel CLI and a private `.env.local` copied from `.env.example`, then run `vercel dev`. Keep `.env.local` untracked. The ordinary `npm run dev` command is intentionally a frontend-only, browser-local demo.

### Telegram

1. Create the bot with Telegram's `@BotFather` and save the token only as a Vercel server environment variable named `TELEGRAM_BOT_TOKEN`.
2. Generate a long random webhook secret using letters, numbers, `_`, or `-`; save it as `TELEGRAM_WEBHOOK_SECRET` in Vercel.
3. Add both variables and redeploy so the function receives them.
4. In a private local `.env.local`, set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `APP_URL` to the deployed app URL. Run `node scripts/set-webhook.mjs`. The script sends the token to Telegram directly; do not paste a tokenized Bot API URL into a browser, chat, screenshot, or repository.
5. Open the bot and send `/start`, then `DEMO-01`. Complete the prompts and confirm the entry appears in the dashboard.

The bot endpoint rejects updates without Telegram's webhook secret header. Facility codes alone are not authentication; this bot accepts only fictional demo facilities and is not suitable for real reports without a user authorization and enrollment flow.

## Security and limitations

- Supabase tables enable row-level security. Anonymous and authenticated browser roles can select the synthetic demo rows but have no direct write grants. Server functions use the service-role key only after input validation.
- Hosted demo writes are throttled to 20 requests per client IP per hour after the latest SQL schema (client IP is stored only as a SHA-256 digest). This is basic abuse reduction, not authentication or access control; hosted instances must still use synthetic information only.
- Telegram check-ins require connectivity. The bot is low-data, not offline.
- Facility and staff observations may be incomplete or inaccurate; the prototype has no sensors or utility-grid integration.
- A facility code is not proof that a reporter is authorized. Add real authentication and facility assignment before any operational use.
- Health thresholds, urgency weights, and duplicate-ticket rules are prototype choices. Validate scenarios and thresholds with health and energy practitioners before proposing operational use.
- CSV and Markdown summaries can show what the demo recorded; they do not prove improved electricity reliability or health outcomes.

## Project structure

```text
src/                  React dashboard, local demo interactions, scoring and verification model
src/lib/engineering.ts Indicative reliability, storage, maintenance and finance calculations
src/components/       Dashboard feature views
api/                  Vercel server functions for demo database and Telegram writes
supabase/schema.sql   RLS-enabled synthetic schema, migration columns, seed rows and write throttling
scripts/              Secure Telegram webhook setup helper
METHODS.md             Formulae, standards context, assumptions and limitations
DATA_DICTIONARY.md     Field definitions and WHO alignment note
VALIDATION_PLAN.md     Eight fictional cases and blank evaluation worksheets
```
