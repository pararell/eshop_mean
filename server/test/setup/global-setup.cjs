const { MongoMemoryServer } = require('mongodb-memory-server-core');

// One in-memory MongoDB for the whole run; each test file uses its own database (see env.ts)
module.exports = async () => {
  const mongo = await MongoMemoryServer.create();
  globalThis.__MONGO_SERVER__ = mongo;
  process.env.TEST_MONGO_BASE_URI = mongo.getUri();
};
