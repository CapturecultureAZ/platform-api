require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Root (keeps Render happy)
app.get('/', (_req, res) => res.send('✅ Platform API is running'));

// Health + Ping
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/ping',   (_req, res) => res.json({ ok: true, pong: true }));

// Debug route to see what's mounted
app.get('/__whoami', (_req, res) => {
  const routes = (app._router?.stack || [])
    .filter(r => r.route)
    .map(r => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
  res.json({ file: __filename, routes });
});

// Mount your real codes router (you confirmed this file exists)
const codesRouter = require('./routes/codes');
app.use('/api', codesRouter);

// Start server (bind to 0.0.0.0 for Render)
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on :${PORT}`);
});
