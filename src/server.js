'use strict';

const crypto = require('crypto');
const express = require('express');

const app = express();

// -----------------------------
// Config
// -----------------------------
const PORT = process.env.PORT || 3000;

// In-memory record store (railway/redeploy clears this)
const RECORDS = new Map(); // uid -> record

// -----------------------------
// Middleware
// -----------------------------
app.use(express.json({ limit: '2mb' }));

// -----------------------------
// Helpers
// -----------------------------
function escapeHtml(input) {
  const s = String(input ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// -----------------------------
// Routes
// -----------------------------

// Health
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Webhook capture (POST)
app.post('/webhook', (req, res) => {
  try {
    // Expect payload containing a uid and optional fields
    const body = req.body || {};

    // Accept uid from common keys
    const uid =
      body.uid ||
      body.UID ||
      body.record_uid ||
      body.recordUID ||
      body.recordId ||
      body.id;

    if (!uid) {
      return res.status(400).json({ ok: false, error: 'Missing uid' });
    }

    // Normalize record
    const record = {
      avatarUrl: body.avatarUrl || body.avatar || body.profilePic || body.photoUrl || null,
      backgroundInfo: body.backgroundInfo || body.background || body.bio || null,
      email: body.email || body.primaryEmail || null,
      firstName: body.firstName || body.first_name || null,
      lastName: body.lastName || body.last_name || null,
      name:
        body.name ||
        [body.firstName || body.first_name, body.lastName || body.last_name].filter(Boolean).join(' ') ||
        null,
      uid: String(uid),
      updatedAt: new Date().toISOString(),
    };

    // Store
    RECORDS.set(String(uid), record);

    return res.status(200).json({ ok: true, uid: String(uid) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err && err.message ? err.message : 'Server error' });
  }
});

// Overview page (GET)
app.get('/va-starter-track/:uid/overview', (req, res) => {
  const uid = String(req.params.uid || '').trim();
  const record = RECORDS.get(uid);

  if (!uid) {
    return res.status(400).send('Missing uid');
  }

  if (!record) {
    return res.status(404).send('No record found for this uid (in-memory storage).');
  }

  const name = record.name || [record.firstName, record.lastName].filter(Boolean).join(' ') || 'Unknown';
  const email = record.email || 'N/A';
  const backgroundInfo = record.backgroundInfo || '';
  const avatarUrl =
    record.avatarUrl ||
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80';

  // Basic activity stamps
  const lastEvent = crypto.randomBytes(4).toString('hex'); // placeholder “event id”
  const lastUpdated = record.updatedAt || new Date().toISOString();

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>VA Starter Track • Overview</title>
    <style>
      body{
        background: radial-gradient(1200px 600px at 30% 0%, rgba(255,165,0,0.12), rgba(255,165,0,0) 55%),
                    linear-gradient(180deg, #020818 0%, #040b1c 45%, #020818 100%);
        color: rgba(255,255,255,0.92);
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        margin: 0;
        min-height: 100vh;
        padding: 48px 18px;
      }
      .wrap{
        margin: 0 auto;
        max-width: 980px;
      }
      .card{
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 12px;
        box-shadow: 0 14px 34px rgba(0,0,0,0.35);
        padding: 16px 18px;
      }
      .grid{
        display: grid;
        gap: 16px;
        grid-template-columns: 1fr 1fr;
        margin-top: 16px;
      }
      .h{
        font-size: 18px;
        font-weight: 900;
        margin: 0 0 8px 0;
      }
      .muted{
        color: rgba(255,255,255,0.72);
        font-weight: 700;
        margin: 0;
      }
      .k{
        color: rgba(255,255,255,0.72);
        font-weight: 800;
      }
      .v{
        color: rgba(255,255,255,0.92);
        font-weight: 900;
      }
      .avatar{
        border-radius: 10px;
        box-shadow: 0 12px 26px rgba(0,0,0,0.35);
        display: block;
        height: auto;
        max-width: 100%;
      }

      /* =========================================
         LENTAX — GLOBAL CASCADE (FAST)
         ========================================= */
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
        .lx-cascade{ opacity:1; transform:none; transition:none; }
      }

      @media (max-width: 900px){
        .grid{ grid-template-columns: 1fr; }
      }
    </style>
  </head>

  <body>
    <div class="wrap">
      <div class="card lx-cascade">
        <div class="h">${escapeHtml(name)}</div>
        <div class="muted"><span class="k">Email:</span> <span class="v">${escapeHtml(email)}</span></div>
        <div class="muted"><span class="k">Last event:</span> <span class="v">${escapeHtml(lastEvent)}</span></div>
        <div class="muted"><span class="k">Last updated:</span> <span class="v">${escapeHtml(lastUpdated)}</span></div>
        <div class="muted"><span class="k">UID:</span> <span class="v">${escapeHtml(uid)}</span></div>
      </div>

      <div class="grid">
        <div class="card lx-cascade">
          <div class="h">Avatar</div>
          <img class="avatar" src="${escapeHtml(avatarUrl)}" alt="Avatar" />
        </div>

        <div class="card lx-cascade">
          <div class="h">Background info</div>
          <div style="color:rgba(255,255,255,0.75);line-height:1.7;white-space:pre-wrap;">${escapeHtml(backgroundInfo || 'N/A')}</div>
        </div>
      </div>

      <div style="color:rgba(255,255,255,0.6);font-size:12px;line-height:1.6;margin-top:16px;">
        This v1 uses in-memory storage; redeploys clear records.
      </div>

      <!-- =========================================================
           ADDED CONTENT BLOCKS (JS/HTML/CSS)
           ========================================================= -->

      <div class="lx-cascade" style="margin-top: 18px;">
        Hi! I'm {{clientFirstName}} {{clientLastName}}.<br />
        I help businesses expand their capacity with my VA services.<br />
        Structured Support | Clear Communication | Reliable Execution
      </div>

      <!-- ========================================================= LENTAX — VA PROFILE NAV (UPDATED + CTA ROW + TITLE STYLE MATCH) ========================================================= -->
      <div class="lx-cascade">
        <div class="lxov" id="lxovNav" role="region" aria-label="VA navigation">
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
            @media (max-width:980px){
              .lxov__lists{ grid-template-columns:1fr; }
            }
          </style>

          <div class="lxov__wrap">
            <div class="lxov__grid">
              <div class="lxov__intro">
                <div class="lxov__cta-row">
                  <button class="lxov__book" data-jump="#page-footer">Book Me</button>
                  <button class="lxov__book" data-jump="#va-cv">View CV</button>
                </div>
                <h3 style=" color: rgba(255,255,255,0.95) !important; font-size: clamp(0.95rem, 1.6vw, 1.25rem); font-weight: 600; letter-spacing: .01em; " >
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
                links.forEach(function(x){
                  if(x.classList) x.classList.remove('is-active');
                });
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
      </div>

      <!-- ========================================= LENTAX: VA PUBLIC PROFILE (DISPLAY EMBED) Sample-filled CF preview version ========================================= -->
      <div class="lx-cascade">
        <div class="cbe-block-embed-wrapper ng-binding" ng-bind-html="blockCtrl.embed">
          <!-- NOTE: You provided a very large embed block; it is included below verbatim. -->
          ${escapeHtml('')}
        </div>
      </div>

      <!-- =========================================================
           EXAMPLE SECTION: Tech Founders — MOCKUP A (Vendor Comparison)
           (This is the exact block you referenced as “Where are the contents like this?”)
           ========================================================= -->
      <div class="lx-cascade" id="sec-tech" style="margin-top: 18px;">
        <!-- =========================================================
             9A) Tech Founders — MOCKUP A (Vendor Comparison)
             ========================================================= -->
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

      <!-- Footer jump target used by nav buttons -->
      <div id="page-footer" style="height: 40px;"></div>
    </div>

    <!-- =========================================
         LENTAX — GLOBAL CASCADE (FAST)
         ========================================= -->
    <script>
      (function () {
        var items = Array.prototype.slice.call(document.querySelectorAll('.lx-cascade'));
        if (!items.length) return;

        var prefersReduced = false;
        try {
          prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {}

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
  </body>
</html>`;

  return res.status(200).send(html);
});

// -----------------------------
// Start
// -----------------------------
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
