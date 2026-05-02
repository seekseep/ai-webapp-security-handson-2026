import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import crypto from 'crypto';
import db from '../db.js';

const ONE_DAY_SEC = 60 * 60 * 24;
const nowSec = () => Math.floor(Date.now() / 1000);

export function sessionMiddleware() {
  return async (c, next) => {
    const sessionId = getCookie(c, 'session_id');
    let session;

    if (sessionId) {
      const row = db
        .prepare('SELECT data FROM sessions WHERE id = ? AND expires_at > ?')
        .get(sessionId, nowSec());
      if (row) session = { id: sessionId, ...JSON.parse(row.data) };
    }

    if (!session) {
      session = { id: crypto.randomUUID() };
      db
        .prepare('INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)')
        .run(session.id, '{}', nowSec() + ONE_DAY_SEC);
      setCookie(c, 'session_id', session.id, {
        httpOnly: true,
        path: '/',
        maxAge: ONE_DAY_SEC,
      });
    }

    c.set('session', session);
    await next();

    // ルート内で変更された session を DB に書き戻す
    const { id, ...data } = c.get('session');
    db
      .prepare('UPDATE sessions SET data = ? WHERE id = ?')
      .run(JSON.stringify(data), id);
  };
}

export function destroySession(c) {
  const session = c.get('session');
  if (session) {
    db
      .prepare('DELETE FROM sessions WHERE id = ?')
      .run(session.id);
    deleteCookie(c, 'session_id', { path: '/' });
  }
}
