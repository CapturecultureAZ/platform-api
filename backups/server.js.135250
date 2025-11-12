require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connectMongo } = require('./lib/db'); // 🔗 add Mongo connector

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Base health
app.get('/', (_req, res) => res.send('✅ Platform API is running'));
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));

// Mount routes
try { app.use('/api', require('./routes/codes')); } catch (e) { console.error('codes route load error:', e); }
try { app.use('/api', require('./routes/square')); } catch (e) { /* optional; ignore if missing */ }

// Safe route inspector (no external deps)
app.get('/__whoami', (_req, res) => {
  const routes = [];
  try {
    const stack = (app._router && app._router.stack) || [];
    for (const layer of stack) {
      if (layer?.route?.path) {
        const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase());
        methods.forEach(m => routes.push(`${m} ${layer.route.path}`));
      } else if (layer?.name === 'router' && layer?.handle?.stack) {
        for (const s of layer.handle.stack) {
          if (s?.route?.path) {
            const methods = Object.keys(s.route.methods || {}).map(m => m.toUpperCase());
            methods.forEach(m => routes.push(`${m} ${s.route.path}`));
          }
        }
      }
    }
  } catch (_) {}
  res.json({ file: __filename, routes: routes.sort() });
});

// Start ONLY after Mongo connects
const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI;

connectMongo(MONGO_URI)
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Mongo connection failed:', err?.message || err);
    process.exit(1);
  });
