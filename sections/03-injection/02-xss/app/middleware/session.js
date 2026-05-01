import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import crypto from 'crypto';

// インメモリのセッションストア
const sessions = new Map();

export function sessionMiddleware() {
  return async (c, next) => {
    let sessionId = getCookie(c, 'session_id');
    let session;

    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
    } else {
      sessionId = crypto.randomUUID();
      session = {};
      sessions.set(sessionId, session);
      setCookie(c, 'session_id', sessionId, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24, // 1日
      });
    }

    c.set('session', session);
    c.set('sessionId', sessionId);
    await next();
  };
}

export function destroySession(c) {
  const sessionId = c.get('sessionId');
  if (sessionId) {
    sessions.delete(sessionId);
    deleteCookie(c, 'session_id', { path: '/' });
  }
}
