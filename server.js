require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// base health
app.get('/', (_req, res) => res.send('✅ Platform API is running'));
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));

// mount API routers
app.use('/api', require('./routes/codes'));
app.use('/api', require('./routes/square'));

// Fallback route inspector (no dependencies)
function collectRoutes(app) {
  const out = [];
  const stack = (app._router && app._router.stack) || [];
  for (const layer of stack) {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      for (const m of methods) out.push(`${m} ${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      // try to infer the base path
      let base = '';
      if (layer.regexp && layer.regexp.fast_slash) base = '';
      else if (layer.regexp && layer.regexp.toString) {
        const m = layer.regexp.toString().match(/\\/(.*?)\\/?\\/?\//);
        if (m && m[1]) base = '/' + m[1];
      }
      for (const s of layer.handle.stack) {
        if (s.route && s.route.path) {
          const methods = Object.keys(s.route.methods).map(m => m.toUpperCase());
          for (const m of methods) out.push(`${m} ${base}${s.route.path}`);
        }
      }
    }
  }
  return out.sort();
}

app.get('/__whoami', (_req, res) => {
  res.json({ file: __filename, routes: collectRoutes(app) });
});

// start
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  const routes = collectRoutes(app);
  console.log(`✅ Server running on port ${PORT}`);
  console.log('🔎 Mounted routes:\n' + routes.map(r => ' • ' + r).join('\n'));
});
