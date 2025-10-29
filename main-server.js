require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Codes router
const codesRouter = require('./routes-folder/codes');
app.use('/api', codesRouter);
app.use('/api', require('./routes-folder/square'));


// Root
app.get('/', (req, res) => {
  res.type('text').send('Capture Culture platform-api is running. Try /api/health');
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

/* ---- auto-added: connect to MongoDB on boot (no file editor used) ---- */
;(async () => {
  try {
    const { connectMongo } = require('./lib/db');
    await connectMongo();
    console.log('✅ MongoDB connected');
  } catch (e) {
    console.warn('⚠️ Mongo connect failed; continuing:', e.message);
  }
})();
