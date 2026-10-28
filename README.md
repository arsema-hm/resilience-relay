<div align="center">

<img src="public/resilience-relay-mark.svg" alt="Resilience Relay symbol" width="84" height="84" />

# Resilience Relay

### Community observations for more resilient clean-energy services

**IRENA Youth Forum 2027 · Youth Energising the Future: Grids, Storage and Flexibility**

[![Build](https://img.shields.io/badge/build-Vite%20%2B%20TypeScript-477b57)](#run-checks)
[![Tests](https://img.shields.io/badge/tests-98%20passing-477b57)](#run-checks)
[![Mode](https://img.shields.io/badge/mode-synthetic%20demo-f0b74b)](#scope-and-safety)

</div>

---

Resilience Relay is an early-stage prototype for collecting facility-reported electricity interruptions, backup and storage observations, maintenance follow-up, and staff-confirmed flexibility actions. It brings the Forum’s grids, storage, and flexibility themes into a single demonstration workflow.

> **Demo only.** Sample facilities, users, and reports are fictional. The prototype has not been piloted in a health facility. It records observations; it does not use sensors, control electrical loads, predict equipment failure, or provide clinical or engineering instructions.

## Contents

- [What the prototype demonstrates](#what-the-prototype-demonstrates)
- [Run locally in VS Code](#run-locally-in-vs-code)
- [Explore the demo](#explore-the-demo)
- [Telegram bot](#telegram-bot)
- [Optional hosted demo](#optional-hosted-demo)
- [Scope and safety](#scope-and-safety)
- [Project notes](#project-notes)
- [Final review and GitHub](#final-review-and-github)

## What the prototype demonstrates

- **Grid reliability observations:** daily outage hours, interruption count, longest event, approximate start window, and generator-support hours.
- **Storage and backup screening:** reported battery and backup status plus editable assumptions for illustrative autonomy and loss-of-load estimates.
- **Maintenance follow-up:** repair tickets and a two-report healthy-evidence verification cycle.
- **Flexibility records:** staff-confirmed examples for non-clinical deferrable work, with essential loads explicitly protected.
- **System insights:** facility comparisons, report-derived indicators, monthly views, locally assigned season comparisons, sensitivity checks, and an exportable district brief.
- **Low-data reporting concept:** a Telegram check-in flow for fictional facilities, designed for a future hosted deployment.

All scores, thresholds, calculations, and sample values are prototypes. Their definitions and limits are documented in [METHODS.md](METHODS.md). The report-derived availability measure is not SAIDI, SAIFI, or a WHO indicator.

## Run locally in VS Code

### Requirements

- Node.js LTS (npm is included)
- Git (optional for running, needed for the commit workflow)
- Visual Studio Code

### Start the web app

1. In VS Code, choose **File → Open Folder…** and open the `resilience-relay` project folder.
2. Choose **Terminal → New Terminal**.
3. Install dependencies once:

   ```powershell
   npm install
   ```

4. Start the local frontend:

   ```powershell
   npm run dev
   ```

5. Open the URL printed in the terminal (usually `http://localhost:5173`). Keep the terminal running while using the app.

The standard Vite command runs **browser-local demo mode**. Check-ins, maintenance actions, flexibility logs, and facility assumptions are saved to that browser’s `localStorage`; they do not reach Supabase or Telegram. Use **Reset demo** to restore the fictional sample records in the current browser.

### Run checks

In a second VS Code terminal, from the project folder:

```powershell
npm test
npm run build
```

To preview the production build locally after it succeeds:

```powershell
npm run preview
```

## Explore the demo

1. Select a facility in the workspace menu or view all facilities.
2. Open **New check-in**, select a fictional reporter, and record sample conditions.
3. Submit a severe sample condition to see the maintenance queue create a ticket.
4. Open **Maintenance**, report the repair, then submit two later healthy check-ins to see the verification cycle.
5. Open **Flexibility log** and add a fictional, staff-confirmed action. The example protects a critical load; the system does not suggest switching medical equipment off.
6. Open **System insights** to review storage assumptions, report-derived indicators, facility comparisons, and the district brief export.
7. Try the time range, notification bell, account menu, CSV export, and **Reset demo** controls.

The sample reporters shown in the app are fictional demo identities. They are not authenticated accounts.

## Telegram bot

### What it does

The Telegram bot is a **hosted-demo integration**, not part of the ordinary local Vite server. A reporter sends `/start` (or `/help`), enters a fictional facility code such as `DEMO-01`, then selects outage duration, approximate outage start, battery status, backup status, and refrigerator observation. The submitted report is saved through the hosted API and appears in the dashboard. Prompts include draft English and Amharic text; a fluent local reviewer should approve translations before any public use.

Commands:

| Command | Purpose |
| --- | --- |
| `/start` | Explain the demo and ask for a fictional facility code. |
| `/help` | Show the same safe-use instructions. |
| `/cancel` | Send a reminder that the command itself saves no report and show how to start again. |

The bot accepts only the seeded `DEMO-01` through `DEMO-06` facility codes. The code is **not authentication**. Do not send real facility, staff, patient, or other confidential information.

### Connect a bot to a hosted demo

You need a deployed app with the Vercel API routes, a Supabase database initialized with the demo schema, and a Telegram bot token. The local-only `npm run dev` server cannot receive Telegram webhooks.

1. Deploy the app as described in [Optional hosted demo](#optional-hosted-demo), and verify the dashboard loads from its public deployment URL.
2. In Telegram, open **@BotFather**, use `/newbot`, follow its prompts, and copy the bot token. Treat it like a password.
3. Generate a webhook secret containing 1–256 letters, digits, underscores, or hyphens. Keep it private.
4. In your Vercel project’s **Settings → Environment Variables**, add these **server-side** variables:

   | Variable | Value |
   | --- | --- |
   | `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
   | `TELEGRAM_WEBHOOK_SECRET` | Your generated random secret |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |

   Keep `SUPABASE_SERVICE_ROLE_KEY` and both Telegram values server-side. Never add a `VITE_` prefix, commit them, or send them in a screenshot or chat.
5. Redeploy so the server functions receive the new environment variables.
6. On your computer, create a private `.env.local` in the project folder. Copy the variable names from `.env.example`, then fill in the bot token, the **same** webhook secret, and `APP_URL` with the deployed HTTPS URL. Do not include quotation marks unless they are part of the value. `.env.local` is ignored by Git.
7. In VS Code’s terminal, from the project directory, set the webhook using Node.js:

   ```powershell
   node --env-file=.env.local scripts/set-webhook.mjs
   ```

   The script sends the token directly from your terminal to Telegram’s `setWebhook` API and prints a success message. Never paste a tokenized Telegram API URL into a browser.
8. Open your bot in Telegram, send `/start`, enter `DEMO-01`, and complete all five selections. Confirm that the resulting Telegram report appears in the hosted dashboard.

If webhook setup fails, check that `APP_URL` is the deployed HTTPS origin, the API deployment is current, the two Telegram environment values match, and `/api/telegram` is reachable. If updates reach the bot but do not appear in the dashboard, check the Vercel function logs and Supabase schema setup. Do not share secrets when asking for help.

### Telegram limitations

- It requires internet connectivity; it is not an offline or SMS workflow.
- It uses a demo facility code, not verified identity or facility authorization.
- Telegram callback buttons are an interaction convenience, not an access-control mechanism. `/cancel` is a reminder; it does not revoke buttons already delivered in Telegram.
- The flow records a refrigerator observation; it never gives equipment-handling advice.
- The Amharic copy is a draft and needs fluent review.

## Optional hosted demo

The hosted setup is optional. Use synthetic data only.

### Supabase

1. Create a Supabase project.
2. In its SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). The schema creates row-level security policies and seeds fictional facilities, reports, and demo identities. Browser roles can read synthetic demo data; writes go through server functions.
3. Store the Supabase project URL and service-role key in the hosting provider’s server environment. Never place the service-role key in frontend variables.

To restore sample data in the demo database, run [`supabase/reset_demo_data.sql`](supabase/reset_demo_data.sql), then rerun `supabase/schema.sql`. **This deletes all report, ticket, and flexibility activity in that demo database.** Do not use these scripts on a real database.

### Vercel

1. Push the repository to your GitHub account only after your local review, then import that repository into Vercel.
2. Set `VITE_REMOTE_MODE=true` as a build environment variable.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server environment variables.
4. Deploy and open the deployed app. Confirm `/api/state` responds and the dashboard loads the synthetic records.
5. Follow [Connect a bot to a hosted demo](#connect-a-bot-to-a-hosted-demo) if you also want Telegram reporting.

For local testing of serverless routes, use Vercel CLI (`vercel dev`) and a private `.env.local`. The regular `npm run dev` command is intentionally frontend-only.

## Scope and safety

- No real facility, staff, or patient data; use synthetic information only.
- No sensors, utility-grid integration, clinical recommendations, load control, or maintenance dispatch.
- Storage autonomy and loss-of-load values are illustrative screening calculations, not equipment guarantees.
- Model-specific refrigerator holdover is unknown unless a verified value is entered for the exact equipment model.
- The priority score and thresholds are unvalidated prototype choices; they must not guide real care or maintenance decisions.
- Reported observations may be incomplete or inaccurate. Missing dates are not treated as powered time.
- Hosted write throttling is basic abuse reduction, not authentication or authorization.
- Any real-world pilot requires practitioner validation, user and facility authorization, privacy/security review, and locally reviewed translations.

See [METHODS.md](METHODS.md), [DATA_DICTIONARY.md](DATA_DICTIONARY.md), and [VALIDATION_PLAN.md](VALIDATION_PLAN.md) for definitions, formulas, data fields, and blank evaluation worksheets.

## Project notes

```text
src/                    React dashboard, local demo interactions, model and UI
src/lib/engineering.ts  Reliability, storage, maintenance and finance calculations
src/components/         Dashboard feature views
api/                    Vercel server functions, including Telegram webhook
supabase/                Demo schema, synthetic seed data and reset script
scripts/                 Telegram webhook setup helper
tests/                   Model, validation, storage and engineering test suites
METHODS.md                Methods, assumptions and limitations
DATA_DICTIONARY.md        Field definitions
VALIDATION_PLAN.md        Fictional scenarios and blank evaluation worksheets
```

## Final review and GitHub

Before the first push, open the `resilience-relay` folder in VS Code, run the app, inspect the navigation and workflows listed in [Explore the demo](#explore-the-demo), then run `npm test` and `npm run build`. Review **Source Control** and confirm `.env.local`, deployment credentials, and real personal data are not staged.

The local development history is organized into focused commits. When you decide the review is complete, publish the repository to your GitHub account. Do not push secrets or real user data. This prototype has not been independently security-reviewed or field-validated.
