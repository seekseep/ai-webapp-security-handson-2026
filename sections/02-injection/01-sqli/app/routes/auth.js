import { Hono } from 'hono';
import { html } from 'hono/html';
import db from '../db.js';
import { destroySession } from '../middleware/session.js';
import { layout } from '../components/layout.js';

const app = new Hono();

// ログインフォーム
app.get('/login', (c) => {
  const user = c.get('user');
  const error = c.req.query('error');

  return c.html(layout('ログイン', user, html`
    <div class="auth-form">
      <h2>ログイン</h2>
      ${error ? html`<p class="error">${error}</p>` : ''}
      <form method="POST" action="/auth/login">
        <label for="email">メールアドレス</label>
        <input type="text" id="email" name="email" required />
        <label for="password">パスワード</label>
        <input type="password" id="password" name="password" required />
        <button type="submit" class="btn">ログイン</button>
      </form>
      <p>アカウントがない方は <a href="/auth/register">新規登録</a></p>
    </div>
  `));
});

// ログイン処理
app.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const { email, password } = body;

  const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
  const user = db.prepare(query).get();

  if (!user) {
    return c.redirect('/auth/login?error=メールアドレスまたはパスワードが正しくありません');
  }

  const session = c.get('session');
  session.userId = user.id;

  return c.redirect('/');
});

// 新規登録フォーム
app.get('/register', (c) => {
  const user = c.get('user');
  const error = c.req.query('error');

  return c.html(layout('新規登録', user, html`
    <div class="auth-form">
      <h2>新規登録</h2>
      ${error ? html`<p class="error">${error}</p>` : ''}
      <form method="POST" action="/auth/register">
        <label for="name">名前</label>
        <input type="text" id="name" name="name" required />
        <label for="email">メールアドレス</label>
        <input type="email" id="email" name="email" required />
        <label for="password">パスワード</label>
        <input type="password" id="password" name="password" required minlength="6" />
        <button type="submit" class="btn">登録</button>
      </form>
      <p>アカウントをお持ちの方は <a href="/auth/login">ログイン</a></p>
    </div>
  `));
});

// 新規登録処理
app.post('/register', async (c) => {
  const body = await c.req.parseBody();
  const { name, email, password } = body;

  if (!name || !email || !password || password.length < 6) {
    return c.redirect('/auth/register?error=入力内容を確認してください');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return c.redirect('/auth/register?error=このメールアドレスは既に登録されています');
  }

  const result = db.prepare(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
  ).run(name, email, password);

  const session = c.get('session');
  session.userId = result.lastInsertRowid;

  return c.redirect('/');
});

// ログアウト
app.post('/logout', (c) => {
  destroySession(c);
  return c.redirect('/');
});

export default app;
