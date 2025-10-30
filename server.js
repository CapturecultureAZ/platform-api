// Minimal, known-good server for Render
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));
app.get('/', (_req, res) => res.send('✅ Platform API is running'));
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));
app.post('/api/codes/validate', express.json(), (req, res) => {
  const code = String(req.body?.code || '').toUpperCase();
  if (code === 'TEST01') {
    return res.json({ ok: true, tier: 'single', usesRemaining: 0 });
  }
  return res.status(404).json({ ok: false, error: 'not_found' });
});

('/__whoami', 
(req,res)=>res.json({ file: __filename, routes: (app._router?.stack||[]).filter(r=>r.route).map(r=>Object.keys(r.route.methods)[0].toUpperCase()+' '+r.route.path) }));

// Blank homepage so root URL shows something
app.get('/', (_req, res) => {
  res.send(`
    <!doctype html>
    <html lang="en"><head>
      <meta charset="utf-8" />
      <title>Capture Culture API</title>
      <style>body{margin:0;font-family:sans-serif;display:grid;place-items:center;height:100vh}</style>
    </head><body>
      <h1>✅ Platform API is running</h1>
    </body></html>
  `);
});

// Simple health route
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// IMPORTANT: Render requires you to listen on process.env.PORT
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
