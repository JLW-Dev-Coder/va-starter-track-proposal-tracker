import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

/**
 * In-memory store (v1)
 * Key: uid (SuiteDash webhook payload "uid")
 * Value: { avatarUrl, backgroundInfo, displayName, email, lastEvent, lastUpdatedAt, raw }
 */
const store = new Map();

/**
 * Avatar map
 * Keys: FAF, FEU, FPH, MAF, MEU, MPH
 */
const AVATAR_BY_CODE = {
  FAF: "https://secure.lentax.co/file/351b93beeb66c8a329211653468f0ae8/e3e2f5ff-e2ae-4241-88cd-a4a1c3a1cfa1/PNG_Avatar_Female_AF_ChatGPT+Image+Dec+14%2C+2025%2C+05_32_41+PM.png?original=1",
  FEU: "https://secure.lentax.co/file/aa3ab7fa7729005241c65ea63ae55564/f2a444b1-4af5-46d3-96d2-e7789686ec5f/ChatGPT+Image+Dec+19%2C+2025%2C+05_49_10+PM.png?original=1",
  FPH: "https://secure.lentax.co/file/d2472423733e561f6195d60637b586de/172081ee-8936-4e0d-a169-0c493ddfdc4a/PNG_Avatar_Female_PH_ChatGPT+Image+Dec+19%2C+2025%2C+05_11_10+PM.png?versionID=34098",
  MAF: "https://secure.lentax.co/file/cd70c77178c82438bc82583a9acc1da2/36921cc5-071a-49d4-b52c-14c04a06447e/PNG_Avatar_Male_AF_ChatGPT+Image+Dec+19%2C+2025%2C+05_11_00+PM.png?original=1",
  MEU: "https://secure.lentax.co/file/20c48498124298ee493e9498f93d6857/fa8ad839-d47b-41f5-b5be-b7b2625bb78b/PNG_Avatar_Male_EU_ChatGPT+Image+Dec+19%2C+2025%2C+05_18_30+PM.png?versionID=34095",
  MPH: "https://secure.lentax.co/file/23fa692e60bfa14eed53a565100008d0/1f2324b0-6e70-4965-9a3b-41bcad3c85b1/PNG_Avatar_Male+PH_ChatGPT+Image+Dec+18%2C+2025%2C+08_51_11+PM.png?versionID=34096",
};

function asString(v) {
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

function detectAvatarCode(backgroundInfo) {
  // Looks for tokens like: MEU, FEU, FPH, MPH, MAF, FAF (case-insensitive)
  const text = asString(backgroundInfo);
  const m = text.match(/\b(FAF|FEU|FPH|MAF|MEU|MPH)\b/i);
  return m ? m[1].toUpperCase() : "";
}

function computeAvatarUrl(payload) {
  const backgroundInfo = asString(payload?.backgroundInfo);
  const code = detectAvatarCode(backgroundInfo);
  return AVATAR_BY_CODE[code] || "";
}

function handleWebhook(req, res) {
  const payload = req.body || {};
  const uid = asString(payload?.uid);

  if (!uid) {
    res.status(400).json({
      ok: false,
      error: "Missing uid in payload",
    });
    return;
  }

  const backgroundInfo = asString(payload?.backgroundInfo);
  const displayName = asString(payload?.displayName) || `${asString(payload?.firstName)} ${asString(payload?.lastName)}`.trim();
  const email = asString(payload?.email);
  const lastEvent = asString(payload?.event) || "Project Updated";
  const lastUpdatedAt = new Date().toISOString();

  const avatarUrl = computeAvatarUrl(payload);

  store.set(uid, {
    avatarUrl,
    backgroundInfo,
    displayName,
    email,
    lastEvent,
    lastUpdatedAt,
    raw: payload,
  });

  res.status(200).json({
    ok: true,
    uid,
    stored: {
      avatarUrlPresent: Boolean(avatarUrl),
      lastEvent,
      lastUpdatedAt,
    },
  });
}

/* =========================
   Endpoints
========================= */

app.get("/va-starter-track/health", (req, res) => {
  res.json({ ok: true, service: "va-starter-track-proposal-tracker" });
});

/**
 * SuiteDash webhook receiver
 * Destination URL:
 * https://va-starter-track-proposal-tracker-production.up.railway.app/va-starter-track/webhook
 */
app.post("/va-starter-track/webhook", handleWebhook);

/**
 * Optional alias (keep if you ever point SuiteDash here)
 */
app.post("/va-starter-track/payload", handleWebhook);

/**
 * Client-facing page
 * Use in proposal:
 * https://va-starter-track-proposal-tracker-production.up.railway.app/va-starter-track/c/{{clientUID}}/overview
 *
 * NOTE: This now expects {{clientUID}} == webhook payload.uid
 */
app.get("/va-starter-track/c/:uid/overview", (req, res) => {
  const uid = asString(req.params.uid);
  const record = store.get(uid);

  const avatarUrl = asString(record?.avatarUrl);
  const backgroundInfo = asString(record?.backgroundInfo);
  const displayName = asString(record?.displayName) || "Profile";
  const email = asString(record?.email);
  const lastEvent = asString(record?.lastEvent) || "N/A";
  const lastUpdatedAt = asString(record?.lastUpdatedAt) || "N/A";

  res
    .status(200)
    .type("text/html")
    .send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VA Starter Track • Overview</title>

  <!-- ========================================= LENTAX — GLOBAL CASCADE (FAST) ========================================= -->
  <style>
    .lx-cascade{
      opacity:0;
      transform:translateY(12px);
      transition: opacity 260ms ease, transform 260ms ease;
      will-change:opacity, transform;
    }
    .lx-cascade.is-visible{
      opacity:1;
      transform:translateY(0);
    }
    @media (prefers-reduced-motion: reduce){
      .lx-cascade{
        opacity:1;
        transform:none;
        transition:none;
      }
    }

    /* Page styling (kept lightweight; no external deps) */
    .lx-wrap{
      margin:0 auto;
      max-width:980px;
    }
    .lx-body{
      background:#0b1020;
      color:rgba(255,255,255,0.92);
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      margin:0;
      padding:24px;
    }
    .lx-card{
      background:rgba(255,255,255,0.06);
      border:1px solid rgba(255,255,255,0.14);
      border-radius:16px;
      padding:18px;
    }
    .lx-grid{
      display:grid;
      gap:16px;
      grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
      margin-top:16px;
    }
    .lx-kicker{
      font-size:14px;
      font-weight:900;
      margin-bottom:10px;
    }
    .lx-name{
      font-size:18px;
      font-weight:900;
      letter-spacing:.01em;
    }
    .lx-meta{
      color:rgba(255,255,255,0.72);
      font-size:13px;
      line-height:1.6;
      margin-top:6px;
    }
    .lx-note{
      color:rgba(255,255,255,0.6);
      font-size:12px;
      line-height:1.6;
      margin-top:16px;
    }
    .lx-pre{
      color:rgba(255,255,255,0.75);
      line-height:1.7;
      white-space:pre-wrap;
    }
    .lx-avatar-img{
      border:1px solid rgba(255,255,255,0.18);
      border-radius:14px;
      display:block;
      height:auto;
      max-width:260px;
      width:100%;
    }
    .lx-empty{
      background:rgba(255,255,255,0.04);
      border:1px dashed rgba(255,255,255,0.22);
      border-radius:12px;
      color:rgba(255,255,255,0.75);
      line-height:1.6;
      padding:12px;
    }
  </style>
</head>

<body class="lx-body">
  <div class="lx-wrap">

    <div class="lx-card lx-cascade">
      <div class="lx-name">${escapeHtml(displayName)}</div>
      <div class="lx-meta">
        <div><strong style="color:rgba(255,255,255,0.9);">Email:</strong> ${escapeHtml(email || "N/A")}</div>
        <div><strong style="color:rgba(255,255,255,0.9);">Last event:</strong> ${escapeHtml(lastEvent)}</div>
        <div><strong style="color:rgba(255,255,255,0.9);">Last updated:</strong> ${escapeHtml(lastUpdatedAt)}</div>
        <div><strong style="color:rgba(255,255,255,0.9);">UID:</strong> ${escapeHtml(uid)}</div>
      </div>
    </div>

    <div class="lx-grid">
      <div class="lx-card lx-cascade">
        <div class="lx-kicker">Avatar</div>
        ${
          record
            ? avatarUrl
              ? `<img src="${escapeAttr(avatarUrl)}" alt="Avatar" class="lx-avatar-img" />`
              : `<div class="lx-empty">
                   No avatar code found in backgroundInfo.<br />Add one of: FAF, FEU, FPH, MAF, MEU, MPH
                 </div>`
            : `<div class="lx-empty">
                 No webhook received yet for this UID.<br />Update the project so SuiteDash sends the payload.
               </div>`
        }
      </div>

      <div class="lx-card lx-cascade">
        <div class="lx-kicker">Background info</div>
        <div class="lx-pre">${escapeHtml(backgroundInfo || "N/A")}</div>
      </div>
    </div>

    <div class="lx-note lx-cascade">
      This v1 uses in-memory storage; redeploys clear records.
    </div>

  </div>

  <!-- ========================================= LENTAX — GLOBAL CASCADE (FAST) ========================================= -->
  <script>
    (function () {
      var items = Array.prototype.slice.call(document.querySelectorAll('.lx-cascade'));
      if (!items.length) return;

      var prefersReduced = false;
      try { prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

      if (prefersReduced) {
        items.forEach(function (el) { el.classList.add('is-visible'); });
        return;
      }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

      items.forEach(function (el) { io.observe(el); });
    })();
  </script>
</body>
</html>`);
});


/**
 * Debug endpoint (optional)
 * Use internally to confirm records exist:
 * GET /va-starter-track/debug/:uid
 */
app.get("/va-starter-track/debug/:uid", (req, res) => {
  const uid = asString(req.params.uid);
  const record = store.get(uid) || null;
  res.json({ ok: true, uid, record });
});

function escapeAttr(s) {
  return asString(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(s) {
  return asString(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
