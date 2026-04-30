import { Hono } from 'hono';
import { html } from 'hono/html';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { layout } from '../components/layout.js';

const app = new Hono();

app.use('*', requireAdmin());

// 管理画面トップ（ユーザー一覧）
app.get('/', (c) => {
  const user = c.get('user');
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id').all();

  return c.html(layout('管理画面', user, html`
    <h2>管理画面 - ユーザー一覧</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th><th>名前</th><th>メールアドレス</th><th>ロール</th><th>登録日</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((u) => html`
          <tr>
            <td>${u.id}</td>
            <td><a href="/users/${u.id}">${u.name}</a></td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>${u.created_at}</td>
            <td>
              ${u.id !== user.id
                ? html`
                  <form method="POST" action="/admin/users/${u.id}/delete" style="display:inline">
                    <button type="submit" class="btn btn-danger btn-sm">削除</button>
                  </form>
                ` : ''}
            </td>
          </tr>
        `)}
      </tbody>
    </table>
  `));
});

// ユーザー削除
app.post('/users/:id/delete', (c) => {
  const user = c.get('user');
  const targetId = Number(c.req.param('id'));

  if (targetId !== user.id) {
    db.prepare('DELETE FROM comments WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM articles WHERE author_id = ?').run(targetId);
    db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  }

  return c.redirect('/admin');
});

export default app;
