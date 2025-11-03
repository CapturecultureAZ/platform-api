const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('❌ No MONGO_URI in env');
  process.exit(1);
}

(async () => {
  const client = new MongoClient(uri, {
    serverApi: ServerApiVersion.v1,
    tls: true,
    retryWrites: true,
    serverSelectionTimeoutMS: 15000,
    heartbeatFrequencyMS: 10000,
  });
  const t0 = Date.now();
  try {
    await client.connect();
    const ping = await client.db().admin().ping();
    const dbName = uri.split('/').pop().split('?')[0] || 'captureculture';
    const count = await client.db(dbName).collection('codes').countDocuments().catch(() => null);
    console.log('✅ Connected in', (Date.now()-t0)+'ms', 'ping=', ping, 'codesCount=', count);
    await client.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Connect failed:', e.message);
    process.exit(2);
  }
})();
