"use strict";

require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const mongoose = require("mongoose");
const { randomInt } = require("crypto");

const app = express();

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h" }));

let mongoReady = false;
mongoose.set("bufferCommands", false);
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
    .then(() => { console.log("✅ MongoDB connected"); mongoReady = true; })
    .catch((err) => { console.error("❌ Mongo connect error:", err.message); mongoReady = false; });
}

const codeSchema = new mongoose.Schema(
  {
    code: { type: String, index: true },
    tier: { type: String },
    usesAllowed: { type: Number },
    remainingUses: { type: Number },
    expiresAt: { type: Date },
    event: { type: String, default: null },
    route: { type: String }
  },
  { timestamps: true }
);
const Code = mongoose.models.Code || mongoose.model("Code", codeSchema);

function isMongoReady() { return mongoReady === true; }
function digitsOnly(s) { return String(s || "").replace(/\D/g, ""); }

function genCodeWithPrefix(prefix2, totalLen) {
  const p = digitsOnly(prefix2);
  const L = Number(totalLen || 6);
  const n = Math.max(0, L - p.length);
  if (n <= 0) return p.slice(0, L);
  const min = Math.pow(10, n - 1);
  const max = Math.pow(10, n) - 1;
  const tail = String(randomInt(min, max + 1));
  return p + tail;
}

function normalizeIncomingCode(raw) {
  const entered = digitsOnly(raw);
  const prefix = digitsOnly(process.env.CODE_PREFIX || "");
  const expectedLen = Number(process.env.CODE_LENGTH || 6);
  if (entered.length === expectedLen) return entered;
  if (entered.length === 4 && prefix.length === 2 && expectedLen === 6) {
    return prefix + entered;
  }
  return entered;
}

function minutesFromNow(mins) { return new Date(Date.now() + mins * 60 * 1000); }

function makeLaunchUrl(rec) {
  const base = process.env.BASE_LAUNCH_URL || "https://CaptureCultureAZ.com";
  const url = new URL(base);
  url.searchParams.set("code", rec.code);
  url.searchParams.set("tier", rec.tier);
  if (rec.event) url.searchParams.set("event", rec.event);
  return url.toString();
}

const memCodes = new Map();

app.get("/api/health", (_req, res) => res.json({ ok: true, mongo: isMongoReady() }));

app.post("/api/codes", async (req, res) => {
  try {
    const tier = req.body && typeof req.body.tier === "string" && req.body.tier ? req.body.tier : "single";
    const usesAllowed = Number(req.body && req.body.usesAllowed ? req.body.usesAllowed : 1);
    const minutesToLive = Number(req.body && req.body.minutesToLive ? req.body.minutesToLive : process.env.CODE_EXPIRY_MINUTES || 60);
    const event = req.body && typeof req.body.event === "string" ? req.body.event : null;

    const totalLen = Number(process.env.CODE_LENGTH || 6);
    const code = genCodeWithPrefix(process.env.CODE_PREFIX || "", totalLen);

    const record = {
      code,
      tier,
      usesAllowed,
      remainingUses: usesAllowed,
      expiresAt: minutesFromNow(minutesToLive),
      event,
      route: process.env.CODE_ROUTE || "numeric-codes-v2"
    };

    if (isMongoReady()) {
      await Code.create(record);
    } else {
      memCodes.set(code, { ...record });
    }

    res.json({
      ok: true,
      code: record.code,
      tier: record.tier,
      usesAllowed: record.usesAllowed,
      remainingUses: record.remainingUses,
      expiresAt: record.expiresAt,
      route: record.route,
      event: record.event,
      launchUrl: makeLaunchUrl(record),
      _backend: isMongoReady() ? "mongo" : "memory"
    });
  } catch (err) {
    console.error("codes create error:", err);
    res.status(500).json({ ok: false, error: "internal error" });
  }
});

app.post("/api/codes/validate", async (req, res) => {
  try {
    const incoming = req.body && req.body.code ? req.body.code : "";
    const code = normalizeIncomingCode(incoming);
    const consume = !!(req.body && req.body.consume);
    if (!code) return res.status(400).json({ ok: false, error: "missing code" });

    let rec = null;

    if (isMongoReady()) {
      rec = await Code.findOne({ code });
      if (!rec) return res.status(404).json({ ok: false, error: "not found" });
      if (new Date(rec.expiresAt) < new Date()) return res.status(410).json({ ok: false, error: "expired" });
      if (consume) {
        if (rec.remainingUses <= 0) return res.status(409).json({ ok: false, error: "no remaining uses" });
        rec.remainingUses -= 1;
        await rec.save();
      }
    } else {
      rec = memCodes.get(code);
      if (!rec) return res.status(404).json({ ok: false, error: "not found" });
      if (rec.expiresAt < new Date()) { memCodes.delete(code); return res.status(410).json({ ok: false, error: "expired" }); }
      if (consume) {
        if (rec.remainingUses <= 0) { memCodes.delete(code); return res.status(409).json({ ok: false, error: "no remaining uses" }); }
        rec.remainingUses -= 1;
        if (rec.remainingUses <= 0) memCodes.delete(code); else memCodes.set(code, rec);
      }
    }

    res.json({
      ok: true,
      code: rec.code,
      tier: rec.tier,
      usesAllowed: rec.usesAllowed,
      remainingUses: rec.remainingUses,
      expiresAt: rec.expiresAt,
      route: rec.route,
      event: rec.event || null,
      launchUrl: makeLaunchUrl(rec),
      _backend: isMongoReady() ? "mongo" : "memory"
    });
  } catch (err) {
    console.error("codes validate error:", err);
    res.status(500).json({ ok: false, error: "internal error" });
  }
});

app.post("/kiosk/validate", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const entered = String(req.body.code || "");
    const code = normalizeIncomingCode(entered);
    const event = String(req.body.event || "");
    if (!code) return res.redirect("/gate?e=missing");

    const r = await fetch("http://127.0.0.1:3001/api/codes/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, consume: false, event: event || undefined })
    });
    const j = await r.json();
    if (!j.ok) {
      const msg = encodeURIComponent(j.error || "invalid");
      return res.redirect("/gate?e=" + msg);
    }

    const launch = j.launchUrl ? j.launchUrl : "/capture.html?code=" + encodeURIComponent(code) + (event ? "&event=" + encodeURIComponent(event) : "");
    return res.redirect(launch);
  } catch {
    return res.redirect("/gate?e=network");
  }
});

app.get("/gate", (_req, res) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset='utf-8'><title>Kiosk</title>",
    "<meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover'>",
    "<style>body{margin:0;background:#000;color:#fff;font-family:-apple-system,system-ui}.w{max-width:420px;margin:0 auto;padding:24px;text-align:center}h1{margin:0 0 20px 0;font-size:28px}form{display:grid;gap:12px}input{font-size:32px;padding:18px;text-align:center;border-radius:12px;background:#111;color:#fff;border:none;width:100%}button{font-size:24px;padding:18px;border:none;border-radius:12px;background:#ff7a00;color:#fff}#err{font-size:18px;margin-top:12px;color:#f44}</style>",
    "</head><body><div class='w'><h1>Enter Last 4</h1>",
    "<form action='/kiosk/validate' method='POST'>",
    "<input name='code' maxlength='4' inputmode='numeric' autocomplete='off'>",
    "<input type='hidden' name='event' value=''>",
    "<button type='submit'>Go</button>",
    "</form><div id='err'></div></div>",
    "<script>(function(){var p=new URLSearchParams(location.search);if(p.has('e')){document.getElementById('err').textContent=p.get('e');}})();</script>",
    "</body></html>"
  ].join(""));
});

app.get("/capture.html", (req, res) => res.sendFile(path.join(__dirname, "public", "capture.html")));
app.get("/", (_req, res) => res.redirect("/gate"));

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => { console.log("✅ Server running on port " + PORT); });
