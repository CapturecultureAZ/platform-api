require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Base health
app.get('/', (_req, res) => res.send('✅ Platform API is running'));
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));

// Mount routes
app.use('/api', require('./routes/codes'));

// Mount square webhook if present (won’t crash if missing)
try { app.use('/api', require('./routes/square')); } catch (_) {}

// Safe route inspector
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
  } catch {}
  res.json({ file: __filename, routes: routes.sort() });
});

// Start
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
