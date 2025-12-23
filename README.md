# VA Starter Track Proposal Tracker (Railway)

A small Express service that receives SuiteDash webhook payloads, stores a per-client record (in memory), and renders a client “overview” page by UID.

## Repo layout

- `.gitignore`
- `package.json`
- `railway.toml`
- `README.md`
- `src/embed.js`
- `src/server.js`

## What it does

- **Receives** a SuiteDash automation webhook payload (JSON)
- **Stores** the most recent payload fields for a given `uid` (in-memory `Map`)
- **Renders** an HTML page at `/va-starter-track/c/:uid/overview`

## Current storage behavior

- In-memory only (records are cleared on redeploy/restart)

## Routes

- `GET /va-starter-track/debug/:uid`
  - Returns the stored record (and raw payload) for a UID

- `GET /va-starter-track/health`
  - Basic health response

- `GET /va-starter-track/c/:uid/overview`
  - Client-facing HTML page

- `POST /va-starter-track/payload`
  - Alias of `/va-starter-track/webhook`

- `POST /va-starter-track/webhook`
  - Main webhook receiver
  - Requires: `uid` in the JSON body

## Payload fields currently used

The server reads these fields from the webhook JSON:

- `backgroundInfo` (string)
- `displayName` (string, falls back to `firstName` + `lastName`)
- `email` (string)
- `event` (string, defaults to `"Project Updated"`)
- `uid` (string, required)

### Avatar selection (backgroundInfo token)

If `backgroundInfo` contains one of these tokens, the page shows a corresponding avatar image:

- `FAF`
- `FEU`
- `FPH`
- `MAF`
- `MEU`
- `MPH`

If no token is found (or the UID has no stored record yet), the page shows a “no avatar / no webhook yet” message.

## SuiteDash configuration

### Webhook destination

Point your SuiteDash automation webhook to:

- `https://<YOUR-RAILWAY-DOMAIN>/va-starter-track/webhook`

### Proposal link

Use this in the proposal:

- `https://<YOUR-RAILWAY-DOMAIN>/va-starter-track/c/{{clientUID}}/overview`

Important: `{{clientUID}}` must match the `uid` value SuiteDash sends in the webhook payload.

## Local development

### Install

```bash
npm install
