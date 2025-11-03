I have yetrequire('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToMongo, getDb } = require('./lib/db');

const app = express();
app.use(cors()); OK all require OK College abuse King
app.use(express.json());

// Home + health
app.get('/', (_req, res) => res.send('✅ Platform API is running'));
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Diagnostics: show mounted routes
app.get('/__whoami', (req, res) => {
  const routes = (app._router?.stack || [])
    .filter(r => r.route && r.route.path)
    .map(r => {
      const method = Object.keys(r.route.methods)[0]?.toUpperCase() || 'GET';
      return `${method} ${r.route.path}`;
    });
  res.json({ file: __filename, routes });
});

// Mount codes router (/api/codes, /api/codes/validate)
app.use('/api', require('./routes/codes'));

// Admin: list codes (requires x-admin-key)
app.get('/api/admin/codes', async (req, res) => {
  try {
    const key = req.get('x-admin-key');
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }
    const includeExpired = String(req.query.includeExpired || 'false').toLowerCase() === 'true';
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);

    const db = getDb();
    const query = includeExpired ? {} : { expiresAt: { $gt: new Date() } };
    const items = await db.collection('codes').find(query).toArray();
    items.sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt));

    return res.json({ ok: true, count: Math.min(items.length, limit), codes: items.slice(0, limit) });
  } catch (e) {
    console.error('admin/codes error:', e);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});
app.use('/api', require('./routes/codes'));

// Start server (work even if Mongo fails when mock enabled)
const PORT = Number(process.env.PORT || 3000);
connectToMongo()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server running on :${PORT}`));
  })
  .catch((err) => {
    console.error('⚠️ DB connect failed, starting server anyway:', err.message);
    app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server running on :${PORT} (DB unavailable)`));
  });

// --- Version/debug endpoint ---
app.get('/__version', (req, res) => {
  res.json({
    ok: true,
    commit: process.env.RENDER_GIT_COMMIT || process.env.COMMIT_REF || 'unknown',
    branch: process.env.RENDER_GIT_BRANCH || 'unknown',
    mock: String(process.env.USE_MOCK_DB || ''),
    node: process.version
  });
});
console.log('BOOT => commit:', process.env.RENDER_GIT_COMMIT || process.env.COMMIT_REF || 'unknown',
            'branch:', process.env.RENDER_GIT_BRANCH || 'unknown',
            'mock:', String(process.env.USE_MOCK_DB || ''));

// --- ultra simple test route ---
app.get('/hello', (req, res) => {
  res.json({ ok: true, msg: 'hello from server.js' });
});

// --- ultra-simple test route ---
app.get('/hello', (req, res) => {
  res.json({ ok: true, msg: 'hello from server.js' });
});

// --- admin ping (auth only, no DB) ---
app.get('/api/admin/ping', (req, res) => {
  const key = req.get('x-admin-key');
  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });
  }
  res.json({ ok:true, msg:'admin alive' });
});

// --- ultra-simple test route ---
app.get('/hello', (req, res) => {
  res.json({ ok: true, msg: 'hello from server.js' });
});

// --- admin ping (auth only, no DB) ---
app.get('/api/admin/ping', (req, res) => {
  const key = req.get('x-admin-key');
  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });
  }
  res.json({ ok:true, msg:'admin alive' });
});
// --- secured env peek (what the app really sees) ---
app.get('/api/admin/envpeek', (req, res) => {
  const key = req.get('x-admin-key');
  if (key !== process.env.ADMIN_KEY) return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });

  const uri = process.env.MONGO_URI || '';
  const show = (s) => (s ? (s.length <= 16 ? s : (s.slice(0,12) + '...' + s.slice(-6))) : '');

  res.json({
    ok: true,
    USE_MOCK_DB: String(process.env.USE_MOCK_DB || ''),
    has_MONGO_URI: Boolean(uri),
    MONGO_URI_preview: show(uri),
    NODE_VERSION: process.version,
    RENDER_GIT_COMMIT: process.env.RENDER_GIT_COMMIT || 'unknown',
    RENDER_GIT_BRANCH: process.env.RENDER_GIT_BRANCH || 'unknown'
  });
});

// --- on-demand MongoDB test (secured) ---
app.get('/api/admin/dbtest', async (req, res) => {
  try {
    const key = req.get('x-admin-key');
    if (key !== process.env.ADMIN_KEY) return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });

    const uri = process.env.MONGO_URI;
    if (!uri) return res.status(400).json({ ok:false, error:'MONGO_URI_MISSING' });

    const { MongoClient, ServerApiVersion } = require('mongodb');
    const client = new MongoClient(uri, {
      serverApi: ServerApiVersion.v1,
      tls: true,
      retryWrites: true,
      serverSelectionTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000
    });

    const t0 = Date.now();
    await client.connect();
    const admin = client.db().admin();
    const ping = await admin.ping().catch(e => ({ pingError: e.message }));
    const dbName = uri.split('/').pop().split('?')[0] || 'captureculture';
    const codesCount = await client.db(dbName).collection('codes').countDocuments().catch(() => null);
    await client.close();

    res.json({ ok:true, ms: Date.now()-t0, ping, db: dbName, codesCount });
  } catch (e) {
    res.status(500).json({
      ok:false,
      error:'CONNECT_FAILED',
      message: e.message,
      firstStack: String(e.stack||'').split('\n')[0]
    });
  }
});

// --- on-demand MongoDB test (no restart needed), secured by x-admin-key ---
app.get('/api/admin/dbtest', async (req, res) => {
  try {
    const key = req.get('x-admin-key');
    if (key !== process.env.ADMIN_KEY) return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });

    const { MongoClient, ServerApiVersion } = require('mongodb');
    const uri = process.env.MONGO_URI;
    if (!uri) return res.status(400).json({ ok:false, error:'MONGO_URI_MISSING' });

    const client = new MongoClient(uri, {
      serverApi: ServerApiVersion.v1,
      tls: true,
      serverSelectionTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true
    });

    const started = Date.now();
    await client.connect();
    const admin = client.db().admin();
    const ping = await admin.ping();

    // Try a lightweight read on your db/collection
    const dbName = uri.split('/').pop().split('?')[0] || 'captureculture';
    const count = await client.db(dbName).collection('codes').countDocuments().catch(() => null);

    await client.close();

    return res.json({
      ok: true,
      ms: Date.now() - started,
      ping,
      db: dbName,
      codesCount: count
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: 'CONNECT_FAILED',
      message: e.message,
      firstStack: String(e.stack || '').split('\n')[0]
    });
  }
});
