// lib/db.js
// Uses a mock in-memory DB when USE_MOCK_DB=true.
// Otherwise connects to Mongo using MONGO_URI.

const { MongoClient } = require('mongodb');

let client, db;

// Tiny in-memory mock DB
function createMockDb() {
  const codes = new Map();

  function matchFilter(doc, filter) {
    if (!filter) return true;
    if (filter.code && doc.code !== filter.code) return false;
    if (filter.expiresAt && filter.expiresAt.$gt && !(new Date(doc.expiresAt) > new Date(filter.expiresAt.$gt))) return false;
    if (filter.usesRemaining && filter.usesRemaining.$gt && !(doc.usesRemaining > filter.usesRemaining.$gt)) return false;
    return true;
  }

  function applyUpdate(doc, update) {
    const newDoc = { ...doc };
    if (update.$set) Object.assign(newDoc, update.$set);
    if (update.$inc && typeof update.$inc.usesRemaining === 'number')
      newDoc.usesRemaining = (newDoc.usesRemaining || 0) + update.$inc.usesRemaining;
    return newDoc;
  }

  return {
    collection(name) {
      if (name !== 'codes')
        return { insertOne: async()=>{}, findOne: async()=>null, updateOne: async()=>{}, findOneAndUpdate: async()=>({value:null}), createIndex: async()=>{} };

      return {
        insertOne: async (doc) => { codes.set(doc.code, doc); return { insertedId: doc.code }; },
        findOne: async (q) => codes.get(q.code) || null,
        updateOne: async (filter, update) => {
          const doc = codes.get(filter.code);
          if (!doc || !matchFilter(doc, filter)) return { matchedCount: 0, modifiedCount: 0 };
          codes.set(filter.code, applyUpdate(doc, update));
          return { matchedCount: 1, modifiedCount: 1 };
        },
        findOneAndUpdate: async (filter, update, options) => {
          const doc = codes.get(filter.code);
          if (!doc || !matchFilter(doc, filter)) return { value: null };
          const newDoc = applyUpdate(doc, update);
          codes.set(filter.code, newDoc);
          return { value: (options && options.returnDocument === 'after') ? newDoc : doc };
        },
        createIndex: async()=>{}
      };
    }
  };
}

async function connectToMongo() {
  const useMock = (process.env.USE_MOCK_DB || '').toLowerCase() === 'true';
  if (useMock) {
    db = createMockDb();
    console.log('⚠️ Using MOCK in-memory DB (USE_MOCK_DB=true)');
    return db;
  }
  const uri = process.env.MONGO_URI;
  const clientOpts = { maxPoolSize: 10, serverSelectionTimeoutMS: 15000, tls: true };
  client = new MongoClient(uri, clientOpts);
  await client.connect();
  db = client.db(uri.split('/').pop().split('?')[0] || 'captureculture');
  console.log('✅ Mock DB ready');
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not connected (connectToMongo not called)');
  return db;
}

module.exports = { connectToMongo, getDb };
