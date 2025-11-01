require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToMongo } = require('./lib/db');

const app = express();
app.use(cors());
app.use(express.json());

// Root route for Render
app.get('/', (_req, res) => res.send('✅ Platform API is running'));

// Health & Ping routes
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));

// Mount the codes router (routes/codes.js)
const codesRouter = require('./routes/codes');
app.use('/api', codesRouter);

// Connect to Mongo first, then start the server
const PORT = Number(process.env.PORT || 3000);
function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on :${PORT}`);
  });
}

// Try DB, but don't crash if it fails — log why and still start the API
connectToMongo()
  .then(() => {
    console.log('✅ MongoDB connected');
    startServer();
  })
  .catch((err) => {
    console.error('⚠️ Mongo connect FAILED:', err && err.stack ? err.stack : err);
    startServer();
  });

   
// --- Admin routes (simple key) ---
app.get('/api/admin/codes', async (req, res) => {
  try {
    const key = req.get('x-admin-key');
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }
    const includeExpired = String(req.query.includeExpired || 'false').toLowerCase() === 'true';
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);

    const db = require('./lib/db').getDb();
    const query = includeExpired ? {} : { expiresAt: { $gt: new Date() } };
    const items = await db.collection('codes').find(query).toArray();

    items.sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt));
    return res.json({ ok: true, count: Math.min(items.length, limit), codes: items.slice(0, limit) });
  } catch (e) {
    console.error('admin/codes error', e);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

// Quick diagnostics: which routes are mounted
app.get('/__whoami', (req, res) => {
  const routes = (app._router?.stack || [])
    .filter(r => r.route && r.route.path)
    .map(r => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
  res.json({ file: __filename, routes });
});
