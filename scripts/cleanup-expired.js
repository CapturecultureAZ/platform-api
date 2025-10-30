require('dotenv').config();
const { connectToMongo, getDb } = require('../lib/db');

(async () => {
  try {
    await connectToMongo();
    const db = getDb();
    const col = db.collection('codes');
    // Delete expired OR already consumed codes
    const res = await col.deleteMany({
      $or: [
        { expiresAt: { $lte: new Date() } },
        { consumed: true }
      ]
    });
    console.log(`🧹 Deleted ${res.deletedCount} expired/consumed codes`);
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
})();
