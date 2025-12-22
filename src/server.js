import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.get("/va-starter-track/embed.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(__dirname, "embed.js"));
});

app.get("/va-starter-track/health", (req, res) => {
  res.json({ ok: true, service: "va-starter-track-proposal-tracker" });
});

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function page({ clientUID, section }) {
  const title = section === "overview" ? "Overview" : section;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>VA Starter Track • ${esc(title)}</title>
  <style>
    :root{
      --lx-accent:#ffa500;
      --lx-bg-0:#020818;
      --lx-bg-1:#07122e;
      --lx-card:rgba(255,255,255,.06);
      --lx-card-border:rgba(255,255,255,.12);
      --lx-ink:rgba(255,255,255,.92);
      --lx-ink-soft:rgba(255,255,255,.65);
    }
    *{box-sizing:border-box}
    body{
      background:radial-gradient(900px 380px at 20% 0%, rgba(255,165,0,.18) 0%, rgba(255,165,0,0) 60%),
                 linear-gradient(135deg, var(--lx-bg-0), var(--lx-bg-1));
      color:var(--lx-ink);
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      margin:0;
      padding:28px 16px 60px;
    }
    .wrap{margin:0 auto;max-width:980px}
    .card{
      background:var(--lx-card);
      border:1px solid var(--lx-card-border);
      border-radius:16px;
      padding:18px;
    }
    h1{margin:0 0 6px 0;font-size:1.6rem}
    .muted{color:var(--lx-ink-soft)}
    .nav{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      margin-top:14px;
    }
    .btn{
      border:1px solid rgba(255,165,0,.28);
      border-radius:12px;
      color:inherit;
      display:inline-block;
      padding:10px 12px;
      text-decoration:none;
      white-space:nowrap;
    }
    .btn strong{
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
      background:linear-gradient(90deg,#fff 0%,#ffd08a 45%,#ffa500 100%);
      background-clip:text;
      font-weight:900;
    }
    hr{border:none;border-top:1px solid rgba(255,255,255,.14);margin:16px 0}
    .section-title{margin:0 0 8px 0;font-size:1.2rem}
    ul{margin:0;padding-left:18px;line-height:1.8}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>VA Starter Track • ${esc(title)}</h1>
      <div class="muted">Client UID: <strong>${esc(clientUID)}</strong></div>

      <div class="nav" aria-label="VA Starter Track navigation">
        <a class="btn" href="/va-starter-track/p/${encodeURIComponent(clientUID)}/overview"><strong>Overview</strong></a>
        <a class="btn" href="/va-starter-track/p/${encodeURIComponent(clientUID)}/services/by-activity"><strong>By Activity</strong></a>
        <a class="btn" href="/va-starter-track/p/${encodeURIComponent(clientUID)}/services/by-budget"><strong>By Budget</strong></a>
        <a class="btn" href="/va-starter-track/p/${encodeURIComponent(clientUID)}/services/by-package"><strong>By Package</strong></a>
        <a class="btn" href="/va-starter-track/p/${encodeURIComponent(clientUID)}/services/by-role"><strong>By Role</strong></a>
        <a class="btn" href="/va-starter-track/p/${encodeURIComponent(clientUID)}/services/get-quote"><strong>Get Quote</strong></a>
      </div>

      <hr />

      <h2 class="section-title">Content</h2>
      ${renderSection(section)}
    </div>
  </div>
</body>
</html>`;
}

function renderSection(section) {
  const s = String(section);

  if (s === "overview") {
    return `<p class="muted">This is the VA Starter Track proposal microsite. Use the navigation above.</p>`;
  }

  if (s === "services/by-budget") {
    return `
      <p class="muted">Budget-based options (placeholder). Replace with your real tiers.</p>
      <ul>
        <li><strong>Just Need A Load Off</strong></li>
        <li><strong>My Staff Needs A Break</strong></li>
        <li><strong>We Need Another Hand</strong></li>
        <li><strong>I'm Ready To Hire Major Support</strong></li>
      </ul>
    `;
  }

  if (s === "services/get-quote") {
    return `
      <p class="muted">Get Quote (placeholder).</p>
      <p class="muted">Next: add a simple form that posts to /va-starter-track/e/click or your CRM.</p>
    `;
  }

  return `<p class="muted">Section not built yet: <strong>${esc(s)}</strong></p>`;
}

/**
 * Railway is the destination (for now): render pages here.
 */
app.get("/va-starter-track/p/:clientUID/*?", (req, res) => {
  const { clientUID } = req.params;
  const subpath = req.params[0] || "";
  const section = subpath ? subpath : "overview";

  res.status(200).type("text/html").send(page({ clientUID, section }));
});

app.post("/va-starter-track/e/:event", (req, res) => {
  // event: click | view
  // Still cheap/no-op. Later you can store counts or forward to SuiteDash.
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
