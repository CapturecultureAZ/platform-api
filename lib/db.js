const mongoose = require('mongoose');

let isConnected = false;

/**
 * Server usage (Mongoose): await connectMongo()
 */
async function connectMongo() {
  if (isConnected) return mongoose.connection;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI missing');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  isConnected = true;
  console.log('✅ MongoDB connected');
  return mongoose.connection;
}

/**
 * Script usage compatibility: await connectToMongo(); then use getDb()
 * Returns the same connection, but exposes the native db handle.
 */
async function connectToMongo() {
  return connectMongo();
}

function getDb() {
  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('Mongo not connected yet; call connectToMongo() first');
    }
  return mongoose.connection.db;
}

module.exports = {
  connectMongo,
  connectToMongo,
  getDb,
};
