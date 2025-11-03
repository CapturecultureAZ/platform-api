require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- health routes ---
app.get('/', (_req, res) => res.send('✅ Platform API (Render) is running'));
app.get('/api/ping', (_req, res) => res.json({ ok: true, pong: true }));

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
