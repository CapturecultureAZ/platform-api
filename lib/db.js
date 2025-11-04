const mongoose = require('mongoose');

let connected = false;

async function connectMongo(uri) {
  if (connected) return mongoose.connection;
  if (!uri) throw new Error('Missing MONGO_URI');

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000
  });

  connected = true;
  console.log('✅ MongoDB connected');
  return mongoose.connection;
}

module.exports = { connectMongo };
