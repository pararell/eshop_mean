module.exports = async () => {
  await globalThis.__MONGO_SERVER__?.stop();
};
