const { MongoClient } = require('mongodb');

let client, db;

async function connectToMongo() {
  if (db) return db;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');
  client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();
  db = client.db(); // default DB from URI
  await db.collection('codes').createIndex({ code: 1 }, { unique: true });
  await db.collection('codes').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  console.log('✅ MongoDB connected');
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not connected yet');
  return db;
}

module.exports = { connectToMongo, getDb };
