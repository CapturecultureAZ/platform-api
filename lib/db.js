const { MongoClient } = require("mongodb");
let client, db;

async function connectToMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // wait up to 10 s
    });
    await client.connect();

    // pick the right database name
    const dbName =
      client.options?.dbName ||
      uri.split("/").pop().split("?")[0] ||
      "capture-culture";

    db = client.db(dbName);
    console.log("✅ MongoDB connected");

    // indexes
    const codes = db.collection("codes");
    await codes.createIndex({ code: 1 }, { unique: true });
    await codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch (err) {
    console.error("❌ Mongo connect error:", err.message);
    throw err;
  }

  return db;
}

function getDb() {
  if (!db) throw new Error("Mongo not connected");
  return db;
}

module.exports = { connectToMongo, getDb };
