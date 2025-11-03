require('dotenv').config();
const express = require('express');
const cors = require('cors');
const listEndpoints = require('express-list-endpoints');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.send('✅ Platform API (local) is running'));
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));

app.use('/api', require('./routes/codes'));

app.get('/__whoami', (_req, res) => {
  const endpoints = listEndpoints(app).flatMap(e => e.methods.map(m => `${m} ${e.path}`)).sort();
  res.json({ file: __filename, routes: endpoints });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server running on port ${PORT}`));
