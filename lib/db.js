const { MongoClient } = require('mongodb');

let db = null;

async function connectToMongo() {
  if (db) return db;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('Missing MONGO_URI in .env');
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('✅ MongoDB connected');
  return db;
}

function getDb() {
  if (!db) throw new Error('Mongo not connected yet');
  return db;
}

module.exports = { connectToMongo, getDb };
