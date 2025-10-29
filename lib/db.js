const { MongoClient } = require('mongodb');

let client, db;

async function connectMongo() {
  if (db) return db;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('⚠️  MONGO_URI missing; skipping Mongo connect');
    return null;
  }
  client = new MongoClient(uri, { ignoreUndefined: true });
  await client.connect();
  db = client.db('capture_culture');
  console.log('✅ MongoDB connected');

  const col = db.collection('codes');
  try { await col.createIndex({ code: 1 }, { unique: true }); } catch {}
  try { await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); } catch {}
  return db;
}

function getDb() {
  if (!db) throw new Error('Mongo not connected yet');
  return db;
}

module.exports = { connectMongo, getDb };
