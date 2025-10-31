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

   