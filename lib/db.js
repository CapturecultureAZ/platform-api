function connectToMongo(){ throw new Error("DB_NOT_WIRED"); }
function getDb(){ throw new Error("DB_NOT_WIRED"); }
module.exports = { connectToMongo, getDb };
