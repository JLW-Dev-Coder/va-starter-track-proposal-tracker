import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));

/**
 * In-memory store (v1 testing)
 * Key: clientUID (SuiteDash payload client.uid)
 * Value: { avatarUrl: string, lastEvent: string, lastUpdatedAt: string, raw: object }
 */
const store = new Map();

/**
 * SuiteDash CF ID:
 * "SD Account Profile Nationality Est [SOP-10105]"
 */
const CF_AVATAR_ID = "8b2f855a-6e87-4a1b-8623-dd28eced4373";

function getClientUID(payload) {
  return payload?.client?.uid || payload?.client_uid || payload?.clientUID || null;
}

function getAvatarValue(payload) {
  const v = payload?.project_custom_fields?.[CF_AVATAR_ID];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function handleWebhook(req, res) {
  const payload = req.body || {};
  const clientUID = getClientUID(payload);

  if (!clientUID) {
    res.status(400).json({
      ok: false,
      error: "Missing client.uid in payload",
      receivedKeys: Object.keys(payload || {}),
    });
    return;
  }

  const avatarUrl = getAvatarValue(payload);
  const lastEvent = payload?.event ? String(payload.event) : "Project Updated";
  const lastUpdatedAt = new Date().toISOString();

  store.set(clientUID, {
    avatarUrl,
    lastEvent,
    lastUpdatedAt,
    raw: payload,
  });

  res.status(200).json({
    ok: true,
    clientUID,
    stored: {
      avatarUrlPresent: Boolean(avatarUrl),
      lastEvent,
      lastUpdatedAt,
    },
  });
}

/* =========================
   Core endpoints
========================= */

app.get("/va-starter-track/health", (req, res) => {
  res.json({ ok: true, service: "va-starter-track-proposal-tracker" });
});

/**
 * Serve embed.js (if you're using it anywhere)
 * File path: /src/embed.js
 */
app.get("/va-starter-track/embed.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(__dirname, "embed.js"));
});

/**
 * SuiteDash webhook receiver (canonical)
 * SuiteDash can be pointed here.
 */
app.post("/va-starter-track/webhook", handleWebhook);

/**
 * SuiteDash webhook receiver (alias)
 * Your screenshot shows SuiteDash posting to /va-starter-track/payload
 * so this MUST exist for the live test.
 */
app.post("/va-starter-track/payload", handleWebhook);

/* =========================
   Client-facing rendered page
   (proposal links here)
========================= */

app.get("/va-starter-track/c/:clientUID/overview", (req, res) => {
  const { clientUID } = req.params;
  const record = store.get(clientUID);

  const avatarUrl = record?.avatarUrl ? String(record.avatarUrl) : "";
  const lastEvent = record?.lastEvent ? String(record.lastEvent) : "N/A";
  const lastUpdatedAt = record?.lastUpdatedAt ? String(record.lastUpdatedAt) : "N/A";

  res.status(200).type("text/html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VA Starter Track • Profile</title>
</head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; padding: 24px; background: #0b1020; color: rgba(255,255,255,0.92);">
  <div style="max-width: 900px; margin: 0 auto;">
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">VA Starter Track • Profile Overview</h1>
    <p style="margin: 0 0 18px 0; color: rgba(255,255,255,0.75);">
      Client UID: <strong style="color: rgba(255,255,255,0.92);">${clientUID}</strong>
    </p>

    <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 14px; padding: 18px;">
      <h2 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 800;">Avatar (from SuiteDash CF)</h2>

      ${
        avatarUrl
          ? `<img src="${avatarUrl}" alt="Avatar" style="display:block; max-width: 240px; width: 100%; height: auto; border-radius: 14px; border: 1px solid rgba(255,255,255,0.18);" />`
          : `<div style="padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.22); color: rgba(255,255,255,0.75);">
               No avatar value received yet for CF ${CF_AVATAR_ID}.
             </div>`
      }

      <div style="margin-top: 14px; color: rgba(255,255,255,0.75); font-size: 13px; line-height: 1.6;">
        <div><strong style="color: rgba(255,255,255,0.92);">Last event:</strong> ${lastEvent}</div>
        <div><strong style="color: rgba(255,255,255,0.92);">Last updated:</strong> ${lastUpdatedAt}</div>
      </div>
    </div>

    <div style="margin-top: 14px; font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.6;">
      <div>Note: This v1 uses in-memory storage. A Railway redeploy clears stored records.</div>
    </div>
  </div>
</body>
</html>`);
});

/* =========================
   Optional tracking (no-op)
========================= */

app.post("/va-starter-track/e/:event", (req, res) => {
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
