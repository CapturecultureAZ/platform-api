

const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "keypad.html"));
});

app.get([/^\/dash$/, /^\/dashboard$/, /^\/app(?:\/.*)?$/], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected"))
  .catch((err) => console.error("Mongo connect error:", err.message));

const codeSchema = new mongoose.Schema({
  code: { type: String, index: true, unique: true },
  tier: String,
  usesAllowed: { type: Number, default: 1 },
  remainingUses: { type: Number, default: 1 },
  expiresAt: { type: Date },
  event: String,
  route: String,
  launchUrl: String,
});
codeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Code = mongoose.model("Code", codeSchema);

const jobSchema = new mongoose.Schema({
  provider: String,
  latencyMs: Number,
  ok: Boolean,
  fallback: Boolean,
  errorPrimary: String,
  venueId: String,
  createdAt: { type: Date, default: Date.now },
});
const Job = mongoose.model("Job", jobSchema);

const CODE_LENGTH = Number(process.env.CODE_LENGTH || 6);
const CODE_EXPIRY_MINUTES = Number(process.env.CODE_EXPIRY_MINUTES || 1440);
const CODE_ROUTE = process.env.CODE_ROUTE || "numeric-codes-v2";
const BASE_LAUNCH_URL = process.env.BASE_LAUNCH_URL || "https://CaptureCultureAZ.com";
const tierUrls = Object.create(null);

function generateCode(totalLen = 6) {
  const prefix = String(process.env.CODE_PREFIX || "");
  const digits = "0123456789";
  const need = Math.max(0, totalLen - prefix.length);
  let body = "";
  for (let i = 0; i < need; i++) body += digits[(Math.random() * 10) | 0];
  return prefix + body;
}

function buildLaunchUrl(tier, code) {
  const tpl = tierUrls[tier];
  if (tpl) return tpl.replace(/{code}/g, code).replace(/{tier}/g, tier);
  const u = new URL(BASE_LAUNCH_URL);
  u.searchParams.set("code", code);
  u.searchParams.set("tier", tier);
  return u.toString();
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/codes", async (req, res) => {
  try {
    const {
      tier = "single",
      usesAllowed = 1,
      minutesToLive = CODE_EXPIRY_MINUTES,
      event = "DemoEvent",
      codeLength = CODE_LENGTH,
    } = req.body || {};
    const code = generateCode(Number(codeLength));
    const expiresAt = new Date(Date.now() + Number(minutesToLive) * 60000);
    const launchUrl = buildLaunchUrl(tier, code);
    const doc = await Code.create({
      code,
      tier,
      usesAllowed,
      remainingUses: usesAllowed,
      expiresAt,
      event,
      route: CODE_ROUTE,
      launchUrl,
    });
    res.json({
      ok: true,
      code: doc.code,
      tier: doc.tier,
      usesAllowed: doc.usesAllowed,
      expiresAt: doc.expiresAt,
      route: doc.route,
      launchUrl: doc.launchUrl,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/codes/validate", async (req, res) => {
  try {
    const { code, consume = false } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, error: "MISSING_CODE" });
    const doc = await Code.findOne({ code }).lean();
    if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ ok: false, error: "EXPIRED" });
    }
    if (consume) {
      const updated = await Code.findOneAndUpdate(
        { code, remainingUses: { $gt: 0 } },
        { $inc: { remainingUses: -1 } },
        { new: true }
      ).lean();
      if (!updated) return res.status(409).json({ ok: false, error: "NO_REMAINING_USES" });
      return res.json({
        ok: true,
        code: updated.code,
        tier: updated.tier,
        remainingUses: updated.remainingUses,
        expiresAt: updated.expiresAt,
        route: updated.route,
        launchUrl: updated.launchUrl || buildLaunchUrl(updated.tier, updated.code),
        consumed: true,
      });
    }
    res.json({
      ok: true,
      code: doc.code,
      tier: doc.tier,
      remainingUses: doc.remainingUses,
      expiresAt: doc.expiresAt,
      route: doc.route,
      launchUrl: doc.launchUrl || buildLaunchUrl(doc.tier, doc.code),
      consumed: false,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/tiers", (req, res) => res.json({ ok: true, tiers: tierUrls }));

app.put("/api/tiers/:tier", (req, res) => {
  const { tier } = req.params;
  const { url } = req.body || {};
  if (!tier || !url) return res.status(400).json({ ok: false, error: "INVALID" });
  tierUrls[tier] = url;
  res.json({ ok: true, tier, url });
});

const BG_PROVIDER = (process.env.BG_PROVIDER || "REPLICATE").toUpperCase();

async function replicatePredictImage(imageUrl) {
  const token = process.env.REPLICATE_API_TOKEN;
  const modelPath = process.env.REPLICATE_IMAGE_MODEL || "851-labs/background-remover";
  const version = process.env.REPLICATE_IMAGE_VERSION || "";
  if (!token) throw new Error("REPLICATE_API_TOKEN missing");

  const start = Date.now();

  async function startByModel() {
    return await fetch(`https://api.replicate.com/v1/models/${modelPath}/predictions`, {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: { image: imageUrl } }),
    });
  }

  async function startByVersion() {
    if (!version) throw new Error("Replicate model version not set in .env");
    return await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ version, input: { image: imageUrl } }),
    });
  }

  let startResp = await startByModel();
  if (startResp.status === 404) startResp = await startByVersion();

  if (!startResp.ok) {
    const txt = await startResp.text();
    throw new Error(`Replicate start failed: ${startResp.status} ${txt}`);
  }

  const startJson = await startResp.json();
  const id = startJson.id;
  const deadline = Date.now() + Number(process.env.AI_MAX_WAIT_MS || 20000);
  const pollMs = Number(process.env.AI_POLL_INTERVAL_MS || 800);

  while (Date.now() < deadline) {
    const p = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${token}` },
    });
    const j = await p.json();
    if (j.status === "succeeded") {
      const resultUrl = Array.isArray(j.output) ? j.output[0] : j.output;
      return { provider: "REPLICATE", url: resultUrl, latencyMs: Date.now() - start, costCents: null };
    }
    if (j.status === "failed" || j.status === "canceled") {
      throw new Error(`Replicate ${j.status}: ${j.error || "unknown error"}`);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error("Replicate timed out while waiting for result");
}

async function removeBg(imageUrl) {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) throw new Error("REMOVE_BG_API_KEY missing for fallback");
  const start = Date.now();
  const body = new URLSearchParams();
  body.set("image_url", imageUrl);
  body.set("size", "auto");
  const r = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": key },
    body,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`remove.bg failed: ${r.status} ${t}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return { provider: "REMOVEBG", url: dataUrl, latencyMs: Date.now() - start, costCents: null };
}

async function removeBackgroundViaProvider(imageUrl) {
  try {
    if (BG_PROVIDER === "REPLICATE") return await replicatePredictImage(imageUrl);
    if (BG_PROVIDER === "REMOVEBG") return await removeBg(imageUrl);
    throw new Error(`Unknown BG_PROVIDER=${BG_PROVIDER}`);
  } catch (e) {
    if (BG_PROVIDER !== "REMOVEBG" && process.env.REMOVE_BG_API_KEY) {
      const fb = await removeBg(imageUrl);
      fb.fallback = true;
      fb.errorPrimary = String(e.message || e);
      return fb;
    }
    throw e;
  }
}

app.post("/api/ai/remove", async (req, res) => {
  try {
    const { imageUrl } = req.body || {};
    if (!imageUrl) return res.status(400).json({ ok: false, error: "imageUrl is required" });
    const result = await removeBackgroundViaProvider(imageUrl);
    try {
      await Job.create({
        provider: result.provider,
        latencyMs: result.latencyMs,
        ok: true,
        fallback: !!result.fallback,
        errorPrimary: result.errorPrimary || "",
        venueId: (req.body && req.body.venueId) || "",
      });
    } catch (e) {}
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));