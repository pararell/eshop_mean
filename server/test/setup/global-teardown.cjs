module.exports = async () => {
  await globalThis.__MONGO_SERVER__?.stop();
  await globalThis.__POSTGRES_CONTAINER__?.stop();
};
