const { MongoClient } = require('mongodb');
let client, db;

async function connectToMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  const dbName = client.options?.dbName || 'capture-culture';
  db = client.db(dbName);
  console.log('✅ MongoDB connected');

  // Make sure indexes exist
  const codes = db.collection('codes');
  await codes.createIndex({ code: 1 }, { unique: true });
  await codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  return db;
}

function getDb() {
  if (!db) throw new Error('Mongo not connected');
  return db;
}

module.exports = { connectToMongo, getDb };
