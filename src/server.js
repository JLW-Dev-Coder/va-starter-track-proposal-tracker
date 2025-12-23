import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

const CF_NATIONALITY_EST = "8b2f855a-6e87-4a1b-8623-dd28eced4373";
const store = new Map();

function pickAvatarUrl(customFieldValue) {
  if (!customFieldValue) return "";
  if (typeof customFieldValue === "string") return customFieldValue;
  return "";
}

function esc(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** SuiteDash webhook: Project Updated */
app.post("/va-starter-track/webhook", (req, res) => {
  const body = req.body || {};
  const clientUID = body?.client?.uid;

  if (!clientUID) return res.status(400).json({ ok: false, error: "client.uid required" });

  const cfValue = body?.project_custom_fields?.[CF_NATIONALITY_EST];
  const avatarUrl = pickAvatarUrl(cfValue);

  const prev = store.get(clientUID) || {};
  store.set(clientUID, {
    ...prev,
    avatarUrl: avatarUrl || prev.avatarUrl || "",
    lastPayload: body,
    updatedAt: Date.now()
  });

  return res.json({ ok: true });
});

/** Client page */
app.get("/va-starter-track/c/:clientUID/overview", (req, res) => {
  const { clientUID } = req.params;
  const record = store.get(clientUID);

  const avatarUrl = record?.avatarUrl || "";
  const updatedAt = record?.updatedAt ? new Date(record.updatedAt).toISOString() : "";

  res.type("text/html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>VA Starter Track</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;padding:32px;background:#020818;color:rgba(255,255,255,.92)}
    .card{max-width:920px;margin:0 auto;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:22px}
    .muted{color:rgba(255,255,255,.72)}
    img{max-width:240px;border-radius:16px;border:1px solid rgba(255,255,255,.12)}
  </style>
</head>
<body>
  <div class="card">
    <h1 style="margin:0 0 10px 0">Your VA Starter Track Profile</h1>
    <div class="muted" style="margin:0 0 18px 0">Client UID: ${esc(clientUID)}${updatedAt ? ` • Updated: ${esc(updatedAt)}` : ""}</div>

    ${avatarUrl
      ? `<img src="${esc(avatarUrl)}" alt="Profile avatar" />`
      : `<div class="muted">No avatar on file yet. Update the project custom field and re-send the webhook.</div>`
    }
  </div>
</body>
</html>`);
});

/** Health */
app.get("/va-starter-track/health", (req, res) => {
  res.json({ ok: true, service: "va-starter-track-proposal-tracker" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
