import app, { initDbPromise } from '../server/index.js';

export default async function handler(req, res) {
  if (initDbPromise) {
    await initDbPromise;
  }
  return app(req, res);
}
