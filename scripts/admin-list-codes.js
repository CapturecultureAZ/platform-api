require('dotenv').config();
const { connectToMongo, getDb } = require('../lib/db');

(async () => {
  await connectToMongo();
  const col = getDb().collection('codes');
  const count = await col.countDocuments();
  const sample = await col.find({}, { projection: { _id:0 }, limit:5, sort:{ _id:-1 } }).toArray();
  console.log(`Codes in DB: ${count}`);
  console.log(sample);
  process.exit(0);
})();
