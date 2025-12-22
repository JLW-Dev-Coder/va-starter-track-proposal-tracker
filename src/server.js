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

/**
 * Route target: change this when your external pages are ready.
 * For now, it can point to any “hub” URL you control.
 */
app.get("/va-starter-track/p/:clientUID/*?", (req, res) => {
  const { clientUID } = req.params;
  const subpath = req.params[0] || "";

  // TODO: replace with your real external destination
  const target = `https://secure.lentax.co/va-starter-track/${clientUID}/${subpath}`;
  res.redirect(target);
});

app.post("/va-starter-track/e/:event", (req, res) => {
  // event: click | view
  // Minimal/no-op tracking endpoint (cheap). Add persistence later if needed.
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
