import { setCookie, deleteCookie, getCookie } from 'hono/cookie';

// 「セッション」と称しているが、実体は client が書き換え可能な Cookie ひとつだけ。
// サーバーサイドストアは持たない。これがレクチャーの問題点。
export function sessionMiddleware() {
  return async (c, next) => {
    const session = {
      get userId() {
        const v = getCookie(c, 'user_id');
        const n = Number(v);
        return Number.isInteger(n) && n > 0 ? n : null;
      },
      set userId(value) {
        if (value == null) {
          deleteCookie(c, 'user_id', { path: '/' });
        } else {
          setCookie(c, 'user_id', String(value), { path: '/' });
          // httpOnly をわざと付けない／署名もしない
        }
      },
    };
    c.set('session', session);
    await next();
  };
}

export function destroySession(c) {
  deleteCookie(c, 'user_id', { path: '/' });
}
