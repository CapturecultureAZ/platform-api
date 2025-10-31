// lib/db.js
// Uses a mock in-memory DB when USE_MOCK_DB=true.
// Otherwise connects to Mongo using MONGO_URI.

const { MongoClient } = require('mongodb');

let client, db;

// Tiny in-memory mock for "codes" collection
function createMockDb() {
  const codes = new Map(); // code -> doc
  return {
    collection(name) {
      if (name !== 'codes') {
        return {
          insertOne: async (doc) => ({ insertedId: null }),
          find: () => ({ toArray: async () => [] }),
          findOne: async () => null,
          updateOne: async () => ({ matchedCount: 0, modifiedCount: 0 })
        };
      }
      return {
        insertOne: async (doc) => { codes.set(doc.code, { ...doc }); return { insertedId: doc.code }; },
        findOne: async (query) => codes.get(query.code) || null,
        updateOne: async (filter, update) => {
          const code = filter.code;
          const doc = codes.get(code);
          if (!doc) return { matchedCount: 0, modifiedCount: 0 };
          const set = update.$set || {};
          const inc = update.$inc || {};
          const newDoc = { ...doc, ...set };
          if (typeof inc.usesRemaining === 'number') {
            newDoc.usesRemaining = (newDoc.usesRemaining || 0) + inc.usesRemaining;
          }
          codes.set(code, newDoc);
          return { matchedCount: 1, modifiedCount: 1 };
        },
        createIndex: async () => {}
      };
    }
  };
}

async function connectToMongo() {
  const useMock = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';
  if (useMock) {
    db = createMockDb();
    console.log('⚠️ Using MOCK in-memory DB (USE_MOCK_DB=true)');
    return db;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set and USE_MOCK_DB != true');

  client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    tls: true
  });

  await client.connect();
  const dbName = uri.split('/').pop().split('?')[0] || 'captureculture';
  db = client.db(dbName);
  console.log('✅ MongoDB connected');

  const codes = db.collection('codes');
  try {
    await codes.createIndex({ code: 1 }, { unique: true });
    await codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch (e) { /* ignore */ }

  return db;
}

function getDb() {
  if (!db) throw new Error('DB not connected (connectToMongo not called)');
  return db;
}

module.exports = { connectToMongo, getDb };
