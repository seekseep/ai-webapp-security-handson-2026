import db from '../db.js';

// ログイン済みかチェックし、ユーザー情報を c.set('user') にセットする
export function currentUser() {
  return async (c, next) => {
    const session = c.get('session');
    if (session?.userId) {
      const user = db.prepare(
        'SELECT id, name, email, role FROM users WHERE id = ?'
      ).get(session.userId);
      c.set('user', user || null);
    } else {
      c.set('user', null);
    }
    await next();
  };
}

// ログイン必須
export function requireAuth() {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.redirect('/auth/login');
    }
    await next();
  };
}

// 管理者必須
export function requireAdmin() {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
      return c.redirect('/');
    }
    await next();
  };
}
