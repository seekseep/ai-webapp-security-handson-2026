import { getQueryCount } from '../db.js';

// リクエストごとに発行された SQL の本数を [queries] <path>: N の形でログに出す。
export function queryLogger() {
  return async (c, next) => {
    const start = getQueryCount();
    await next();
    const used = getQueryCount() - start;
    console.log(`[queries] ${c.req.method} ${c.req.path}: ${used}`);
  };
}
