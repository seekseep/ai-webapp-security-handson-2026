import { setCookie, deleteCookie, getCookie } from 'hono/cookie';

export function sessionMiddleware() {
  return async (c, next) => {
    const session = {
      get userId() {
        const v = getCookie(c, 'user_id');
        return v ?? null;
      },
      set userId(value) {
        if (value == null) {
          deleteCookie(c, 'user_id', { path: '/' });
          return;
        }

        setCookie(c, 'user_id', String(value), {
          path: '/',
          httpOnly: true
        });
      },
    };
    c.set('session', session);
    await next();
  };
}

export function destroySession(c) {
  deleteCookie(c, 'user_id', { path: '/' });
}
