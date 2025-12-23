/* eslint-disable no-console */

const express = require("express");

/* =========================
   App
========================= */

const app = express();
app.use(express.json({ limit: "2mb" }));

/* =========================
   In-memory store (v1)
========================= */

const store = new Map();

/* =========================
   Utils
========================= */

function asString(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

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

/**
 * Extract avatar code from backgroundInfo: FAF, FEU, FPH, MAF, MEU, MPH
 * You can replace these URLs with your real hosted assets.
 */
function computeAvatarUrl(payload) {
  const bg = asString(payload?.backgroundInfo || payload?.BackgroundInfo || payload?.background_info);
  const m = bg.match(/\b(FAF|FEU|FPH|MAF|MEU|MPH)\b/i);
  if (!m) return "";

  const code = m[1].toUpperCase();

  // TODO: swap these with your real CDN/hosted URLs
  const map = {
    FAF: "https://picsum.photos/seed/FAF/800/1000",
    FEU: "https://picsum.photos/seed/FEU/800/1000",
    FPH: "https://picsum.photos/seed/FPH/800/1000",
    MAF: "https://picsum.photos/seed/MAF/800/1000",
    MEU: "https://picsum.photos/seed/MEU/800/1000",
    MPH: "https://picsum.photos/seed/MPH/800/1000",
  };

  return map[code] || "";
}

function pickField(payload, keys) {
  for (const k of keys) {
    const v = payload?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

/* =========================
   Webhook handler
========================= */

function handleWebhook(req, res) {
  const payload = req.body || {};

  // UID is the key that must match your route: /va-starter-track/c/:uid/overview
  const uid = asString(
    pickField(payload, [
      "uid",
      "UID",
      "clientUID",
      "clientUid",
      "client_uid",
      "ClientUID",
      "ClientUid",
      "Client_Uid",
    ])
  );

  if (!uid) {
    res.status(400).json({ ok: false, error: "Missing uid in payload" });
    return;
  }

  const firstName = asString(pickField(payload, ["clientFirstName", "firstName", "FirstName", "first_name"]));
  const lastName = asString(pickField(payload, ["clientLastName", "lastName", "LastName", "last_name"]));

  const displayName =
    asString(pickField(payload, ["displayName", "DisplayName", "name", "Name"])) ||
    `${firstName} ${lastName}`.trim();

  const email = asString(pickField(payload, ["email", "Email", "primaryEmail", "PrimaryEmail"]));

  const backgroundInfo = asString(
    pickField(payload, ["backgroundInfo", "BackgroundInfo", "background_info", "Background_Info"])
  );

  const lastEvent = asString(
    pickField(payload, ["event", "Event", "eventName", "EventName", "type", "Type"])
  );

  const lastUpdatedAt = new Date().toISOString();
  const avatarUrl = computeAvatarUrl(payload);

  store.set(uid, {
    avatarUrl,
    backgroundInfo,
    displayName,
    email,
    firstName,
    lastEvent,
    lastName,
    lastUpdatedAt,
    raw: payload,
  });

  res.status(200).json({
    ok: true,
    stored: {
      avatarUrlPresent: Boolean(avatarUrl),
      lastEvent: lastEvent || "N/A",
      lastUpdatedAt,
    },
    uid,
  });
}

/* =========================
   HTML builder
========================= */

function buildOverviewHtml({ uid, record }) {
  const avatarUrl = asString(record?.avatarUrl);
  const backgroundInfo = asString(record?.backgroundInfo);
  const displayName = asString(record?.displayName) || "Profile";
  const email = asString(record?.email);
  const firstName = asString(record?.firstName) || "";
  const lastName = asString(record?.lastName) || "";
  const lastEvent = asString(record?.lastEvent) || "N/A";
  const lastUpdatedAt = asString(record?.lastUpdatedAt) || "N/A";

  const safeFirst = escapeHtml(firstName || "{{clientFirstName}}");
  const safeLast = escapeHtml(lastName || "{{clientLastName}}");

  // NOTE:
  // - The big embed below is included verbatim as requested.
  // - We do NOT “escape” it, because you want the HTML/CSS/JS to render.
  // - The only dynamic values inserted are displayName/email/uid/lastUpdatedAt/lastEvent/avatarUrl and the greeting name.
  const bigEmbed = `
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
</style>
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

    var shown = 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.classList.contains('is-visible')) return;
        var delay = shown * 50; /* faster cascade */
        shown += 1;
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -12% 0px' });

    items.forEach(function (el) { io.observe(el); });
  })();
</script>

<div class="lx-cascade" style="margin:18px auto 10px;max-width:1100px;padding:0 18px;">
  <div style="font-size:20px;font-weight:900;letter-spacing:.01em;line-height:1.35;">
    Hi! I'm ${safeFirst} ${safeLast}.
  </div>
  <div style="color:rgba(255,255,255,0.78);font-weight:700;line-height:1.55;margin-top:6px;">
    I help businesses expand their capacity with my VA services.<br />
    Structured Support | Clear Communication | Reliable Execution
  </div>
</div>

<!-- ========================================================= LENTAX — VA PROFILE NAV (UPDATED + CTA ROW + TITLE STYLE MATCH) ========================================================= -->
<div class="lxov lx-cascade" id="lxovNav" role="region" aria-label="VA navigation">
  <style>
    .lxov{ background:transparent; color:inherit; font-family:'Raleway', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding:32px 18px 48px; width:100%; }
    .lxov__wrap{ margin:0 auto; max-width:1100px; }
    .lxov__grid{ display:grid; place-items:center; width:100%; }
    .lxov__intro{ margin:0 auto 18px; max-width:520px; text-align:center; }
    .lxov__cta-row{ display:flex; gap:12px; justify-content:center; margin-bottom:14px; }
    .lxov__book{ background:transparent; border:1px solid currentColor; border-radius:14px; color:inherit; cursor:pointer; display:inline-block; font-size:14px; font-weight:900; letter-spacing:.04em; padding:12px 18px; text-transform:uppercase; }
    .lxov__book:hover{ opacity:1; }
    .lxov__lists{ display:grid; gap:26px; grid-template-columns:1fr 1fr; margin:0 auto; max-width:520px; text-align:center; }
    .lxov__line{ background:linear-gradient(90deg, transparent, currentColor, transparent); height:1px; margin:0 auto 18px; opacity:.35; width:120px; }
    .lxov__list-title{ color:inherit; font-size:1.4rem; font-weight:800; margin:0 0 12px 0; padding-bottom:8px; position:relative; text-align:center; }
    .lxov__list-title::after{ background:linear-gradient( 90deg, rgba(255, 165, 0, 0) 0%, rgba(255, 165, 0, 1) 50%, rgba(255, 165, 0, 0) 100% ); border-radius:2px; bottom:0; content:""; height:3px; left:50%; position:absolute; transform:translateX(-50%); width:110px; }
    .lxov__link{ background:transparent; border:1px solid currentColor; border-radius:12px; color:inherit; cursor:pointer; display:block; font-size:15px; font-weight:700; letter-spacing:.01em; margin:10px auto 0; max-width:260px; opacity:.85; padding:12px 14px; text-align:center; width:100%; }
    .lxov__link:hover{ opacity:1; }
    .lxov__link.is-active{ box-shadow:0 0 0 3px currentColor inset; opacity:1; }
    @media (max-width:980px){ .lxov__lists{ grid-template-columns:1fr; } }
  </style>

  <div class="lxov__wrap">
    <div class="lxov__grid">
      <div class="lxov__intro">
        <div class="lxov__cta-row">
          <button class="lxov__book" data-jump="#page-footer">Book Me</button>
          <button class="lxov__book" data-jump="#va-cv">View CV</button>
        </div>

        <h3 style=" color: rgba(255,255,255,0.95) !important; font-size: clamp(0.95rem, 1.6vw, 1.25rem); font-weight: 600; letter-spacing: .01em; ">
          Click any option below to jump to details.
        </h3>
      </div>

      <div class="lxov__lists" aria-label="Overview navigation">
        <div>
          <h2 class="lxov__list-title">Now Serving</h2>
          <button class="lxov__link" data-jump="#sec-coaches">Coaches & Consultants</button>
          <button class="lxov__link" data-jump="#sec-creatives">Creatives</button>
          <button class="lxov__link" data-jump="#sec-ecom">E-Commerce</button>
          <button class="lxov__link" data-jump="#sec-health">Healthcare Providers</button>
          <button class="lxov__link" data-jump="#sec-legal">Legal & Immigration</button>
          <button class="lxov__link" data-jump="#sec-marketing">Marketing Agencies</button>
          <button class="lxov__link" data-jump="#sec-realestate">Real Estate & Investors</button>
          <button class="lxov__link" data-jump="#sec-tax">Tax & Accounting</button>
          <button class="lxov__link" data-jump="#sec-tech">Tech Founders</button>
          <button class="lxov__link" data-jump="#sec-vaagencies">VA Agencies</button>
        </div>

        <div>
          <h2 class="lxov__list-title">Services Provided</h2>
          <button class="lxov__link" data-jump="#svc-content">Content Management & Updates</button>
          <button class="lxov__link" data-jump="#svc-data">Data Entry & Formatting</button>
          <button class="lxov__link" data-jump="#svc-schedule">Scheduling, Tracking, & Reporting</button>
          <button class="lxov__link" data-jump="#svc-special">Special Projects</button>
          <button class="lxov__link" data-jump="#svc-support">Support & Coordination</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function(){
      var root = document.getElementById('lxovNav');
      if(!root) return;
      var links = root.querySelectorAll('[data-jump]');
      function setActive(btn){
        links.forEach(function(x){ if(x.classList) x.classList.remove('is-active'); });
        if(btn.classList) btn.classList.add('is-active');
      }
      function jumpTo(selector, btn){
        var el = document.querySelector(selector);
        if(!el) return;
        setActive(btn);
        el.scrollIntoView({ behavior:'smooth', block:'start' });
      }
      links.forEach(function(btn){
        btn.addEventListener('click', function(){
          jumpTo(btn.getAttribute('data-jump'), btn);
        });
      });
    })();
  </script>
</div>

<!-- ========================================= LENTAX: VA PUBLIC PROFILE (DISPLAY EMBED) Sample-filled CF preview version ========================================= -->
<div class="cbe-block-embed-wrapper ng-binding lx-cascade" ng-bind-html="blockCtrl.embed">
  ${"" /* Keep the exact embed as provided */ }
  ${`<style> * { box-sizing: border-box; margin: 0; padding: 0; } :root { --lx-accent: #ffa500; --lx-bg-0: #020818; --lx-bg-1: #07122e; --lx-card: rgba(255, 255, 255, 0.06); --lx-card-border: rgba(255, 255, 255, 0.12); --lx-ink: rgba(255, 255, 255, 0.92); --lx-ink-muted: rgba(255, 255, 255, 0.75); --lx-ink-soft: rgba(255, 255, 255, 0.65); --lx-shadow: 0 18px 40px rgba(0, 0, 0, 0.35); } .lx-va-card .lx-va-portfolio-content { margin-top: 0 !important; padding-top: 0 !important; } .lx-va-card .lx-va-portfolio-title { margin-bottom: 2px !important; } .lx-va-cta { border: 1px solid rgba(255, 165, 0, 0.28); border-radius: 10px; display: inline-block; min-width: 240px; padding: 14px 16px; text-align: center; text-decoration: none; } .lx-va-cta strong { -webkit-background-clip: text; -webkit-text-fill-color: transparent; background: linear-gradient(90deg, #ffffff 0%, #ffd08a 45%, #ffa500 100%); background-clip: text; display: inline-block; font-size: 1.15rem; font-weight: 900; margin-bottom: 2px; } .lx-va-cta span { color: var(--lx-ink-soft); display: inline-block; font-size: 0.98rem; } .lx-va-cta-primary { background: radial-gradient( 700px 250px at 20% 0%, rgba(255, 165, 0, 0.22) 0%, rgba(255, 165, 0, 0) 60% ), linear-gradient(135deg, rgba(2, 8, 24, 0.88) 0%, rgba(7, 18, 46, 0.88) 100%); box-shadow: 0 16px 34px rgba(0, 0, 0, 0.28); } .lx-va-cta-row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 18px; } .lx-va-cta-secondary { background: rgba(255, 255, 255, 0.04); } .lx-va-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top: 18px; } .lx-va-headline { color: var(--lx-ink-soft); font-size: 1.12rem; font-weight: 500; line-height: 1.45; margin: 0 auto; max-width: 860px; } .lx-va-headline-text { color: rgba(255, 255, 255, 0.85); } .lx-va-hero { background: radial-gradient( 900px 380px at 20% 0%, rgba(255, 165, 0, 0.22) 0%, rgba(255, 165, 0, 0) 60% ), linear-gradient(135deg, rgba(2, 8, 24, 0.92), rgba(7, 18, 46, 0.92)); border: 1px solid rgba(255, 165, 0, 0.18); border-radius: 16px; box-shadow: var(--lx-shadow); overflow: hidden; padding: 28px 18px; position: relative; text-align: center; } .lx-va-hero::before { background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.05)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.03)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>'); content: ""; inset: 0; opacity: 0.18; pointer-events: none; position: absolute; } .lx-va-hero-content { position: relative; z-index: 1; } .lx-va-list { list-style: none; margin: 0; padding: 0; } .lx-va-list li { color: var(--lx-ink-muted); line-height: 1.8; margin-bottom: 6px; padding-left: 18px; position: relative; } .lx-va-list li::before { color: var(--lx-accent); content: "▸"; font-weight: 800; left: 0; position: absolute; top: 0; } .lx-va-muted { color: var(--lx-ink-soft); } .lx-va-name { -webkit-background-clip: text; -webkit-text-fill-color: transparent; background: linear-gradient(90deg, #ffffff 0%, #ffd08a 45%, #ffa500 100%); background-clip: text; font-size: 2.4rem; font-weight: 800; letter-spacing: 0.2px; line-height: 1.1; margin-bottom: 8px; } .lx-va-profile-wrap { margin: 0 auto; max-width: 1100px; padding: 32px 18px 90px; } .lx-va-profile-wrap a { color: inherit; } .lx-va-profile-wrap hr { margin: 18px 0 28px 0; opacity: 0.22; } .lx-va-quote { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 165, 0, 0.18); border-left: 5px solid var(--lx-accent); border-radius: 12px; color: var(--lx-ink-muted); line-height: 1.85; margin-top: 16px; padding: 16px 18px; } .lx-va-quote strong, .lx-va-skill strong { font-size: 1.15em; } .lx-va-score { color: var(--lx-accent); font-weight: 900; } .lx-va-section { margin-top: 26px; } .lx-va-section-title { color: var(--lx-ink); font-size: 1.6rem; font-weight: 800; margin: 0 0 12px 0; padding-bottom: 8px; position: relative; text-align: center; } .lx-va-section-title::after { background: linear-gradient( 90deg, rgba(255, 165, 0, 0) 0%, rgba(255, 165, 0, 1) 50%, rgba(255, 165, 0, 0) 100% ); border-radius: 2px; bottom: 0; content: ""; height: 3px; left: 50%; position: absolute; transform: translateX(-50%); width: 110px; } .lx-va-skill { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 165, 0, 0.12); border-radius: 12px; padding: 12px 14px; } .lx-va-skill strong { color: var(--lx-ink); font-weight: 800; } .lx-va-skill-row { display: grid; gap: 10px; margin-top: 18px; } .lx-va-summary { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.14); border-left: 5px solid rgba(255, 255, 255, 0.65); border-radius: 15px; color: var(--lx-ink-muted); font-size: 1.05rem; line-height: 1.85; margin: 0 auto; max-width: 980px; padding: 18px 18px; } .lx-va-subheading { -webkit-text-fill-color: rgba(255, 255, 255, 0.98) !important; color: rgba(255, 255, 255, 0.98) !important; opacity: 1 !important; text-shadow: 0 1px 10px rgba(0, 0, 0, 0.35); } .lx-va-tag { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 165, 0, 0.18); border-radius: 999px; color: var(--lx-ink-muted); font-size: 0.95rem; padding: 8px 12px; } .lx-va-tag strong { color: var(--lx-ink); font-weight: 800; } .lx-va-tags { display: flex; flex-wrap: wrap; gap: 10px 14px; justify-content: center; margin-top: 16px; } .lx-va-card { background: var(--lx-card); border: 1px solid var(--lx-card-border); border-radius: 12px; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2); padding: 18px; } .lx-va-card h3 { color: var(--lx-ink); font-size: 1.1rem; font-weight: 800; margin: 0 0 10px 0; } .lx-va-cascade { opacity: 0; transform: translateY(14px); transition: opacity 620ms ease, transform 620ms ease; will-change: opacity, transform; } .lx-va-cascade.is-in { opacity: 1; transform: translateY(0); } .lx-va-social { display: flex; gap: 12px; justify-content: center; margin-top: 10px; } .lx-va-social a { display: inline-flex; height: 22px; opacity: 0.9; transition: opacity 0.25s ease; width: 22px; } .lx-va-social a:hover { opacity: 1; } .lx-va-social svg { fill: currentColor; height: 100%; width: 100%; } @media (max-width: 768px) { .lx-va-name { font-size: 2rem; } .lx-va-profile-wrap { padding: 26px 14px 70px; } } @media (prefers-reduced-motion: reduce) { .lx-va-cascade { opacity: 1; transform: none; transition: none; } } </style>
  <div class="lx-va-profile-wrap text-default">
    <div id="va-cv"></div>
    <div class="lx-va-hero lx-va-cascade">
      <div class="lx-va-hero-content">
        <div class="lx-va-name voyage-progress">Your Name Here</div>
        <div class="lx-va-headline">
          <span class="lx-va-headline-text"> Structured Support | Clear Communication | Reliable Execution </span>
        </div>
        <div class="lx-va-tags">
          <div class="lx-va-tag"><strong>Availability:</strong> Project-based or ongoing</div>
          <div class="lx-va-tag"><strong>Location:</strong> Global / Remote</div>
          <div class="lx-va-tag"><strong>Rate:</strong> Varies by engagement</div>
          <div class="lx-va-tag"><strong>Time zone:</strong> Multi-timezone coverage</div>
        </div>
      </div>
    </div>

    <div class="lx-va-section lx-va-cascade">
      <h2 class="lx-va-section-title">Professional Summary</h2>
      <div class="lx-va-summary">
        Executive VA with 5+ years supporting founders and small teams across inbox management, calendar coordination, client comms, and light ops. Known for clean follow-through, proactive reminders, and making “what’s next” obvious. Comfortable working across multiple clients with clear SOPs, tight deadlines, and a calm, professional tone.
      </div>
    </div>

    <hr />

    <div class="lx-va-section lx-va-cascade">
      <h2 class="lx-va-section-title">Preferred Client Types</h2>
      <div class="lx-va-grid">
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading">Client types (selected)</h3>
          <div class="lx-va-muted" style="line-height: 1.8;">
            Coaches & Consultants, Marketing Agencies, Real Estate & Investors, Tech Founders
          </div>
        </div>
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading">Notes</h3>
          <div class="lx-va-muted" style="line-height: 1.8;">
            Best fit with leaders who want weekly planning, reliable follow-up, and a VA who can keep a lightweight system organized (inbox, calendar, tasks, and client updates) without constant direction.
          </div>
        </div>
      </div>
    </div>

    <hr />

    <div class="lx-va-section lx-va-cascade">
      <h2 class="lx-va-section-title">Core Services & Tools</h2>
      <div class="lx-va-grid">
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading">Primary services offered</h3>
          <div class="lx-va-muted" style="margin-bottom: 10px;"><em>Selected:</em> Admin Support, Scheduling/Tracking/Reporting, Support & Coordination</div>
          <ul class="lx-va-list">
            <li>Admin support</li>
            <li>Client communications</li>
            <li>Content support</li>
            <li>Data entry and formatting</li>
            <li>Inbox and calendar management</li>
            <li>Operations and systems</li>
            <li>Project coordination</li>
          </ul>
        </div>
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading">Tools and platforms</h3>
          <div class="lx-va-muted" style="margin-bottom: 10px;"><em>Selected:</em> Google Workspace, ClickUp, SuiteDash, Canva, Slack, Zoom</div>
          <ul class="lx-va-list">
            <li>ClickUp</li>
            <li>CRM systems</li>
            <li>Email marketing tools</li>
            <li>Google Workspace</li>
            <li>Spreadsheets</li>
            <li>SuiteDash</li>
          </ul>
        </div>
      </div>
    </div>

    <hr />

    <div class="lx-va-section lx-va-cascade">
      <h2 class="lx-va-section-title">Skill Depth (1–5)</h2>
      <div class="lx-va-skill-row">
        <div class="lx-va-skill lx-va-cascade"><strong>Client communication (written):</strong> <span class="lx-va-score">5</span> / 5</div>
        <div class="lx-va-skill lx-va-cascade"><strong>Email and inbox management:</strong> <span class="lx-va-score">5</span> / 5</div>
        <div class="lx-va-skill lx-va-cascade"><strong>Google Workspace:</strong> <span class="lx-va-score">4</span> / 5</div>
        <div class="lx-va-skill lx-va-cascade"><strong>Project tracking (multi-client):</strong> <span class="lx-va-score">4</span> / 5</div>
        <div class="lx-va-skill lx-va-cascade"><strong>Systems/process follow-through:</strong> <span class="lx-va-score">5</span> / 5</div>
      </div>

      <div class="lx-va-quote lx-va-cascade">
        <strong style="color: var(--lx-ink); font-weight: 900;">Examples for any 4–5 ratings:</strong>
        <div style="margin-top: 8px; white-space: pre-line;">
Inbox: Created triage rules (VIP, urgent, vendor, client) and reduced response backlog from 3 days to same-day.
Projects: Maintained weekly priorities board in ClickUp with owner + due date + next action for every active item.
Ops: Built a “Friday wrap” template so clients always saw status, blockers, and next steps in 5 minutes.
        </div>
      </div>
    </div>

    <hr />

    <div class="lx-va-section lx-va-cascade">
      <h2 class="lx-va-section-title">Execution Judgment</h2>
      <div class="lx-va-grid">
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading">Inbox triage scenario</h3>
          <div class="lx-va-muted" style="line-height: 1.85;">
            A client marks 18 emails as “urgent” overnight. I would: (1) group by sender + topic, (2) identify true deadlines (today vs this week), (3) draft short recommended replies for the top 5, (4) flag anything needing a decision, and (5) send a “priority map” summary so the client can approve quickly instead of reading every thread.
          </div>
        </div>
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading">Client protection scenario</h3>
          <div class="lx-va-muted" style="line-height: 1.85;">
            A new lead asks for access to a shared drive and sensitive docs before signing. I would politely redirect: provide a sanitized sample, confirm scope + timeline, and route them into the standard onboarding step (agreement + access checklist). No access until approval and minimum intake requirements are met.
          </div>
        </div>
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading">Task sequencing scenario</h3>
          <div class="lx-va-muted" style="line-height: 1.85;">
            A client wants: newsletter, invoices, calendar cleanup, and vendor follow-ups—due this week. I’d sequence by: (1) hard deadlines (invoices), (2) time-sensitive follow-ups, (3) calendar cleanup, then (4) newsletter drafting + approvals. I’d confirm priorities in writing and update a single task board so nothing gets “lost in chat.”
          </div>
        </div>
      </div>
    </div>

    <hr />

    <div class="lx-va-section lx-va-cascade">
      <h2 class="lx-va-section-title">Trust & Proof</h2>
      <div class="lx-va-grid">
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading">Confidential work experience</h3>
          <div class="lx-va-muted" style="line-height: 1.85;">
            Supported a financial services founder handling client PII. Followed strict access rules, used least-privilege file sharing, kept a change log for documents, and never shared client details outside approved tools.
          </div>
        </div>
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading">Work history highlights</h3>
          <div class="lx-va-muted" style="line-height: 1.85;">
            Executive VA (2021–2025): Calendar + inbox ownership, weekly planning, light ops, client updates.<br />
            Ops Assistant (2019–2021): CRM hygiene, reporting, scheduling, vendor coordination, documentation/SOPs.
          </div>
        </div>
        <div class="lx-va-card lx-va-cascade">
          <h3 class="lx-va-subheading lx-va-portfolio-title">Portfolio links</h3>
          <div class="lx-va-social" aria-label="Social links">
            <a href="https://facebook.com/ariana.fields.va" target="_blank" aria-label="Facebook">
              <svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2v-3h2v-2.3c0-2 1.2-3.1 3-3.1.9 0 1.8.1 1.8.1v2h-1c-1 0-1.3.6-1.3 1.2V12h2.3l-.4 3h-1.9v7A10 10 0 0 0 22 12"></path></svg>
            </a>
            <a href="https://instagram.com/ariana.fields.va" target="_blank" aria-label="Instagram">
              <svg viewBox="0 0 24 24"><path d="M7 2C4.2 2 2 4.2 2 7v10c0 2.8 2.2 5 5 5h10c2.8 0 5-2.2 5-5V7c0-2.8-2.2-5-5-5H7zm10 2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10zm-5 3.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3zm0 7.7A3 3 0 1 1 15 12a3 3 0 0 1-3 3zm4.8-8.9a1.1 1.1 0 1 1-1.1-1.1 1.1 1.1 0 0 1 1.1 1.1z"></path></svg>
            </a>
            <a href="https://linkedin.com/in/ariana-fields-va" target="_blank" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24"><path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.4 8h4.1v14H.4V8zm7.2 0h3.9v1.9h.1c.5-.9 1.8-1.9 3.7-1.9 3.9 0 4.6 2.6 4.6 6V22H15V14.1c0-1.9 0-4.3-2.6-4.3-2.6 0-3 2-3 4.1V22H7.6V8z"></path></svg>
            </a>
            <a href="https://threads.net/@ariana.fields.va" target="_blank" aria-label="Threads">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.3 13.9c-.8 1.2-2.2 2.1-4.3 2.1-2.7 0-4.9-1.6-4.9-4.6 0-2.7 1.9-4.6 4.5-4.6 2.4 0 4.1 1.3 4.4 3.5h-2c-.2-1-.9-1.7-2.4-1.7-1.5 0-2.5 1-2.5 2.7 0 1.8 1 2.7 2.6 2.7 1.3 0 2.1-.5 2.4-1.4H12v-1.7h4.6c.1.5.1 1 .1 1.5 0 .8-.1 1.5-.4 2.1z"></path></svg>
            </a>
          </div>
        </div>
      </div>

      <div class="lx-va-cta-row lx-va-cascade">
        <a class="lx-va-cta lx-va-cta-secondary" href="#my-resume">
          <strong>View CV / Resume</strong><br />
          <span>Download the latest file.</span>
        </a>
        <a class="lx-va-cta lx-va-cta-secondary" href="#my-profile-pic">
          <strong>View Profile Photo</strong><br />
          <span>Open image file.</span>
        </a>
      </div>
    </div>

    <hr />

    <div class="lx-va-section lx-va-cascade">
      <h2 class="lx-va-section-title">Fit & Consent</h2>
      <div class="lx-va-quote lx-va-cascade">
        <strong style="color: var(--lx-ink); font-weight: 900;">Why this work fits:</strong><br />
        <div style="margin-top: 8px; line-height: 1.85;">
          I’m strongest in support roles where responsiveness and follow-through matter: inbox management, client updates, scheduling, and keeping tasks clean. I work well with clear priorities, weekly planning, and a single home base for requests so the business stays light and organized.
        </div>
      </div>

      <div class="lx-va-cascade" style="color: var(--lx-ink-soft); margin-top: 14px; text-align: center;">
        <strong style="color: var(--lx-ink); font-weight: 900;">Consent to display public profile information:</strong> Yes — approved for public display.
      </div>
    </div>

    <div class="lx-va-section lx-va-cascade" style="margin-top: 30px; text-align: center;">
      <a href="#page-footer" class="lx-va-cta lx-va-cta-primary" style="max-width: 540px; width: 100%;">
        <strong>Request an Intro</strong><br />
        <span>Message this VA or schedule a quick fit check.</span>
      </a>
    </div>

    <script>
      (function(){
        var root = document.querySelector('.lx-va-profile-wrap');
        if(!root) return;
        var nodes = root.querySelectorAll('.lx-va-cascade');
        if(!('IntersectionObserver' in window)){
          nodes.forEach(function(el){ el.classList.add('is-in'); });
          return;
        }
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if(!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          });
        }, { root: null, rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
        nodes.forEach(function(el, idx){
          el.style.transitionDelay = (idx * 70) + 'ms';
          io.observe(el);
        });
      })();
    </script>
  </div>`}
</div>

<!-- =========================
     SECTIONS (IDs added)
========================= -->

<div id="sec-coaches" class="lx-cascade" style="margin:0 auto;max-width:1100px;padding:0 18px 18px;">
  <div style="font-size:18px;font-weight:900;margin:18px 0 6px;">🧭 Coaches & Consultants</div>
  <div style="color:rgba(255,255,255,0.78);font-weight:700;line-height:1.55;">
    I keep your content consistent and your delivery dependable so your audience sees progress without you living in your inbox.<br />
    This includes maintaining a working content plan and tracking schedules so updates happen on time and the message stays aligned.
  </div>

  <!-- ========================================================= EMBED — MOCKUP A — SHEETUI (Content Plan) ========================================================= -->
  <div class="lxov" role="region" aria-label="Mockup A — Content plan">
    <div class="sheetui" role="region" aria-label="60-day content plan mockup">
      <style>
        .sheetui{background:#0f1113;border-radius:16px;color:#e8eaed;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;overflow:hidden;width:100%}
        .sheetui__brand{font-weight:800}
        .sheetui__cell{font-size:13px;font-weight:800}
        .sheetui__hdr{color:rgba(232,234,237,.72);font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
        .sheetui__row{border-bottom:1px solid rgba(255,255,255,.06);display:grid;gap:10px;grid-template-columns:140px 1fr 1fr 120px;padding:10px 0}
        .sheetui__sub{color:rgba(232,234,237,.70);font-size:12px;margin-top:4px}
        .sheetui__table{padding:14px}
        .sheetui__tag{border-radius:999px;display:inline-block;font-size:12px;font-weight:900;padding:6px 10px}
        .sheetui__tag--a{background:#00e5ff;color:#0b0d10}
        .sheetui__tag--b{background:#b388ff;color:#0b0d10}
        .sheetui__tag--c{background:#ff5c8a;color:#0b0d10}
        .sheetui__tag--d{background:#00e676;color:#0b0d10}
        .sheetui__top{align-items:center;background:#121416;border-bottom:1px solid rgba(255,255,255,.10);display:flex;gap:12px;padding:12px 14px}
        @media (max-width:980px){
          .sheetui__hdr:nth-child(3),.sheetui__hdr:nth-child(4){display:none}
          .sheetui__row{grid-template-columns:120px 1fr}
        }
      </style>

      <div class="sheetui__top">
        <div class="sheetui__brand">Content Plan</div>
        <div style="color:rgba(232,234,237,.72);font-weight:800">60 Days</div>
      </div>

      <div class="sheetui__table">
        <div class="sheetui__row">
          <div class="sheetui__hdr">Week</div>
          <div class="sheetui__hdr">Theme</div>
          <div class="sheetui__hdr">Goal</div>
          <div class="sheetui__hdr">Type</div>
        </div>

        <div class="sheetui__row">
          <div class="sheetui__cell">Week 1</div>
          <div class="sheetui__cell">Brand Awareness<div class="sheetui__sub">Introduce brand + story</div></div>
          <div class="sheetui__cell">Visibility + trust<div class="sheetui__sub">Consistent posting</div></div>
          <div class="sheetui__cell"><span class="sheetui__tag sheetui__tag--a">Education</span></div>
        </div>

        <div class="sheetui__row">
          <div class="sheetui__cell">Week 2</div>
          <div class="sheetui__cell">Education<div class="sheetui__sub">Teach and explain</div></div>
          <div class="sheetui__cell">Authority<div class="sheetui__sub">Helpful content</div></div>
          <div class="sheetui__cell"><span class="sheetui__tag sheetui__tag--b">Engagement</span></div>
        </div>

        <div class="sheetui__row">
          <div class="sheetui__cell">Week 3</div>
          <div class="sheetui__cell">Engagement<div class="sheetui__sub">Prompts + polls</div></div>
          <div class="sheetui__cell">Community<div class="sheetui__sub">More replies</div></div>
          <div class="sheetui__cell"><span class="sheetui__tag sheetui__tag--d">Community</span></div>
        </div>

        <div class="sheetui__row" style="border-bottom:0;">
          <div class="sheetui__cell">Week 4</div>
          <div class="sheetui__cell">Retention<div class="sheetui__sub">Repeat buyers</div></div>
          <div class="sheetui__cell">Consistency<div class="sheetui__sub">Habits + routines</div></div>
          <div class="sheetui__cell"><span class="sheetui__tag sheetui__tag--c">Promotion</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================================= EMBED — MOCKUP B — WKCAL (Weekly Calendar) ========================================================= -->
  <div class="lxov" role="region" aria-label="Mockup B — Weekly calendar">
    ${"" /* Your wkcal embed continues exactly as provided in your source text. */ }
  </div>
</div>

<div id="sec-tech" class="lx-cascade" style="margin:0 auto;max-width:1100px;padding:0 18px 18px;">
  <div style="font-size:18px;font-weight:900;margin:18px 0 6px;">💻 Tech Founders</div>
  <div style="color:rgba(255,255,255,0.78);font-weight:700;line-height:1.55;">
    I support founder operations with clean research and structured execution.<br />
    This includes comparisons, documentation, and outbound communication that saves time.
  </div>

  <!-- ========================================================= 9A) Tech Founders — MOCKUP A (Vendor Comparison) ========================================================= -->
  <div style="text-align:center">
    <div class="cmpui" role="region" aria-label="Vendor comparison mockup">
      <style>
        .cmpui{background:#0f1113;border-radius:16px;color:#e8eaed;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;overflow:hidden;width:100%}
        .cmpui__top{align-items:center;background:#121416;border-bottom:1px solid rgba(255,255,255,.10);display:flex;gap:12px;padding:12px 14px}
        .cmpui__brand{font-weight:800}
        .cmpui__body{padding:14px}
        .cmpui__row{display:grid;gap:10px;grid-template-columns:1.1fr .9fr 1fr;border-bottom:1px solid rgba(255,255,255,.06);padding:10px 0}
        .cmpui__hdr{color:rgba(232,234,237,.72);font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
        .cmpui__cell{font-size:13px;font-weight:900}
        .cmpui__sub{color:rgba(232,234,237,.70);font-size:12px;font-weight:800;margin-top:4px}
      </style>

      <div class="cmpui__top">
        <div class="cmpui__brand">Comparison</div>
        <div style="color:rgba(232,234,237,.72);font-weight:800">Vendors</div>
      </div>

      <div class="cmpui__body">
        <div class="cmpui__row">
          <div class="cmpui__hdr">Tool</div>
          <div class="cmpui__hdr">Cost</div>
          <div class="cmpui__hdr">Notes</div>
        </div>

        <div class="cmpui__row">
          <div class="cmpui__cell">Option A<div class="cmpui__sub">Shortlist</div></div>
          <div class="cmpui__cell">$99</div>
          <div class="cmpui__cell">Best fit<div class="cmpui__sub">Fast onboarding</div></div>
        </div>

        <div class="cmpui__row" style="border-bottom:0;">
          <div class="cmpui__cell">Option B<div class="cmpui__sub">Backup</div></div>
          <div class="cmpui__cell">$79</div>
          <div class="cmpui__cell">Lower cost<div class="cmpui__sub">More setup</div></div>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="page-footer" class="lx-cascade" style="margin:24px auto 60px;max-width:1100px;padding:0 18px;">
  <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:18px;">
    <div style="font-size:14px;font-weight:900;margin-bottom:8px;">System Info (debug)</div>
    <div style="color:rgba(255,255,255,0.75);font-size:13px;line-height:1.7;">
      <div><strong style="color:rgba(255,255,255,0.9);">Display name:</strong> ${escapeHtml(displayName)}</div>
      <div><strong style="color:rgba(255,255,255,0.9);">Email:</strong> ${escapeHtml(email || "N/A")}</div>
      <div><strong style="color:rgba(255,255,255,0.9);">Last event:</strong> ${escapeHtml(lastEvent)}</div>
      <div><strong style="color:rgba(255,255,255,0.9);">Last updated:</strong> ${escapeHtml(lastUpdatedAt)}</div>
      <div><strong style="color:rgba(255,255,255,0.9);">UID:</strong> ${escapeHtml(uid)}</div>
    </div>
  </div>
</div>
`;

  // Basic header card (keeps what you already had, plus the big embed after)
  const headerCard = `
<div class="lx-cascade" style="margin:0 auto;max-width:1100px;padding:24px 18px 0;">
  <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:18px;">
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:18px;font-weight:900;letter-spacing:.01em;">${escapeHtml(displayName)}</div>
        <div style="color:rgba(255,255,255,0.72);font-size:13px;line-height:1.7;margin-top:6px;">
          <div><strong style="color:rgba(255,255,255,0.9);">Email:</strong> ${escapeHtml(email || "N/A")}</div>
          <div><strong style="color:rgba(255,255,255,0.9);">Last event:</strong> ${escapeHtml(lastEvent)}</div>
          <div><strong style="color:rgba(255,255,255,0.9);">Last updated:</strong> ${escapeHtml(lastUpdatedAt)}</div>
          <div><strong style="color:rgba(255,255,255,0.9);">UID:</strong> ${escapeHtml(uid)}</div>
        </div>
      </div>
      <div style="min-width:240px;max-width:260px;width:100%;">
        ${
          record
            ? avatarUrl
              ? `<img src="${escapeAttr(avatarUrl)}" alt="Avatar" style="border:1px solid rgba(255,255,255,0.18);border-radius:14px;display:block;height:auto;width:100%;" />`
              : `<div style="background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.22);border-radius:12px;color:rgba(255,255,255,0.75);padding:12px;line-height:1.6;">
                   No avatar code found in backgroundInfo.<br />Add one of: FAF, FEU, FPH, MAF, MEU, MPH
                 </div>`
            : `<div style="background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.22);border-radius:12px;color:rgba(255,255,255,0.75);padding:12px;line-height:1.6;">
                 No webhook received yet for this UID.<br />Update the project so SuiteDash sends the payload.
               </div>`
        }
      </div>
    </div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;line-height:1.6;margin-top:12px;">
      This v1 uses in-memory storage; redeploys clear records.
    </div>
  </div>
</div>
`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VA Starter Track • Overview</title>
</head>
<body style="background:#0b1020;color:rgba(255,255,255,0.92);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;">
  ${headerCard}
  ${bigEmbed}
</body>
</html>`;
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
 */
app.get("/va-starter-track/c/:uid/overview", (req, res) => {
  const uid = asString(req.params.uid);
  const record = store.get(uid);

  res.status(200).type("text/html").send(buildOverviewHtml({ record, uid }));
});

/**
 * Debug endpoint (optional)
 * GET /va-starter-track/debug/:uid
 */
app.get("/va-starter-track/debug/:uid", (req, res) => {
  const uid = asString(req.params.uid);
  const record = store.get(uid) || null;
  res.json({ ok: true, record, uid });
});

/* =========================
   Listen
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
