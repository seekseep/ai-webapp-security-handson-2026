import { Hono } from 'hono';
import { html } from 'hono/html';
import db from '../db.js';
import { layout } from '../components/layout.js';

const app = new Hono();

// ユーザープロフィール
app.get('/:id', (c) => {
  const currentUser = c.get('user');
  const id = c.req.param('id');

  const profile = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id);
  if (!profile) {
    return c.html(layout('見つかりません', currentUser, html`<p>ユーザーが見つかりませんでした。</p>`), 404);
  }

  const articles = db.prepare(
    'SELECT id, title, created_at FROM articles WHERE author_id = ? ORDER BY created_at DESC'
  ).all(id);

  const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE user_id = ?').get(id);

  return c.html(layout(profile.name, currentUser, html`
    <h2>${profile.name}</h2>
    <div class="profile-info">
      <p>メール: ${profile.email}</p>
      <p>権限: ${profile.role}</p>
      <p>登録日: ${profile.created_at}</p>
      <p>コメント数: ${commentCount.count}</p>
    </div>

    <h3>投稿した記事 (${articles.length})</h3>
    ${articles.length === 0
      ? html`<p>まだ記事がありません。</p>`
      : articles.map((a) => html`
        <div class="article-card">
          <h4><a href="/articles/${a.id}">${a.title}</a></h4>
          <time>${a.created_at}</time>
        </div>
      `)}
  `));
});

export default app;
