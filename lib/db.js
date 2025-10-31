// lib/db.js
// Uses a mock in-memory DB when USE_MOCK_DB=true.
// Otherwise connects to Mongo using MONGO_URI.

const { MongoClient } = require('mongodb');

let client, db;

// Tiny in-memory mock for "codes" collection with basic $gt filter support
function createMockDb() {
  const codes = new Map(); // code -> doc

  function matchFilter(doc, filter) {
    // Only support fields we actually use in routes: code, expiresAt.$gt, usesRemaining.$gt
    if (filter.code && doc.code !== filter.code) return false;

    if (filter.expiresAt && filter.expiresAt.$gt) {
      const gtVal = filter.expiresAt.$gt;
      if (!(doc.expiresAt && new Date(doc.expiresAt) > new Date(gtVal))) return false;
    }

    if (filter.usesRemaining && typeof filter.usesRemaining.$gt === 'number') {
      const current = typeof doc.usesRemaining === 'number' ? doc.usesRemaining : 0;
      if (!(current > filter.usesRemaining.$gt)) return false;
    }

    return true;
  }

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

        findOne: async (query) => {
          // Support lookup by code
          if (query && query.code) return codes.get(query.code) || null;
          // Fallback: return first doc (not used by our routes)
          for (const d of codes.values()) return d;
          return null;
        },

        updateOne: async (filter, update) => {
          // Find doc by code and apply simple filter logic
          const byCode = filter && filter.code ? codes.get(filter.code) : null;
          const doc = byCode && matchFilter(byCode, filter) ? byCode : null;
          if (!doc) return { matchedCount: 0, modifiedCount: 0 };

          const set = (update && update.$set) || {};
          const inc = (update && update.$inc) || {};

          const newDoc = { ...doc, ...set };

          if (typeof inc.usesRemaining === 'number') {
            const current = typeof newDoc.usesRemaining === 'number' ? newDoc.usesRemaining : 0;
            newDoc.usesRemaining = current + inc.usesRemaining;
          }

          codes.set(doc.code, newDoc);
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

  const clientOpts = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    tls: true
  };

  client = new MongoClient(uri, clientOpts);
  await client.connect();

  const dbName = uri.split('/').pop().split('?')[0] || 'captureculture';
  db = client.db(dbName);
  console.log('✅ MongoDB connected');

  const codes = db.collection('codes');
  try {
    await codes.createIndex({ code: 1 }, { unique: true });
    await codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch (_) { /* ignore index creation errors in prod */ }

  return db;
}

function getDb() {
  if (!db) throw new Error('DB not connected (connectToMongo not called)');
  return db;
}

module.exports = { connectToMongo, getDb };
