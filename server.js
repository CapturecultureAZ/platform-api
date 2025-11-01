require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToMongo, getDb } = require('./lib/db');

const app = express();
app.use(cors());
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
try {
  const codesRouter = require('./routes/codes');
  app.use('/api', codesRouter);
} catch (e) {
  console.error('Failed to mount codes router:', e.message);
}

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
