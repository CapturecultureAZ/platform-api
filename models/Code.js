const mongoose = require('mongoose');

const CodeSchema = new mongoose.Schema({
  code: { type: String, unique: true, index: true, required: true },
  tier: { type: String, required: true },
  usesAllowed: { type: Number, required: true, min: 1 },
  remainingUses: { type: Number, required: true, min: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

CodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.Code || mongoose.model('Code', CodeSchema);
