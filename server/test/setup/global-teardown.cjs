module.exports = async () => {
  await globalThis.__POSTGRES_CONTAINER__?.stop();
};
