const mongoose = require('mongoose');

const CodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  tier: { type: String, default: 'single' },
  usesAllowed: { type: Number, default: 1 },
  uses: { type: Number, default: 0 },
  expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Code', CodeSchema);
