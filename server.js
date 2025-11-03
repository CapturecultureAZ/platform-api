require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- Health routes ---
app.get('/', (_req, res) => res.send('✅ Platform API is running'));
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);
// --- Debug: list mounted routes ---
app.get('/__whoami', (req, res) => {
  const routes = (app._router?.stack || [])
    .filter(r => r.route && r.route.path)
    .map(r => {
      const method = Object.keys(r.route.methods)[0]?.toUpperCase() || 'GET';
      return `${method} ${r.route.path}`;
    });
  res.json({ file: __filename, routes });
});
const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, '0.0.0.0', () =>
  console.log(`✅ Server running on port ${PORT}`)
);
