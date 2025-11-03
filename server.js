// server.js — clean final version
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const listEndpoints = require('express-list-endpoints');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- Base health routes ---
app.get('/', (_req, res) => res.send('✅ Platform API is running'));
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));

// --- Mount API routers ---
app.use('/api', require('./routes/codes'));
app.use('/api', require('./routes/square'));

// --- Debug route to list all endpoints ---
app.get('/__whoami', (_req, res) => {
  const endpoints = listEndpoints(app)
    .flatMap(e => e.methods.map(m => `${m} ${e.path}`))
    .sort();
  res.json({ file: __filename, routes: endpoints });
});

// --- Start the server ---
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
