require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToMongo } = require('./lib/db');

const app = express();
app.use(cors());
app.use(express.json());

// Health route (always available)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Start after DB is connected, then mount routes
async function startServer() {
  await connectToMongo();

  const codesRouter = require('./routes-folder/codes');
  app.use('/api', codesRouter);
  console.log('✅ Routes loaded from routes-folder/codes.js');

  const squareRouter = require('./routes-folder/square');
  app.use('/api', squareRouter);
  console.log('✅ Routes loaded from routes-folder/square.js');

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
