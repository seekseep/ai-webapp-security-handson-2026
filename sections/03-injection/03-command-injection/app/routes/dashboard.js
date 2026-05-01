import { Hono } from 'hono';
import { html } from 'hono/html';
import db from '../db.js';
import { layout } from '../components/layout.js';

const app = new Hono();

// ダッシュボード（集計情報）
app.get('/', (c) => {
  const user = c.get('user');

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const articleCount = db.prepare('SELECT COUNT(*) as count FROM articles').get();
  const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get();

  const recentArticles = db.prepare(`
    SELECT articles.title, users.name as author_name, articles.created_at
    FROM articles
    JOIN users ON articles.author_id = users.id
    ORDER BY articles.created_at DESC
    LIMIT 5
  `).all();

  const topAuthors = db.prepare(`
    SELECT users.name, COUNT(articles.id) as article_count
    FROM users
    LEFT JOIN articles ON users.id = articles.author_id
    GROUP BY users.id
    ORDER BY article_count DESC
    LIMIT 5
  `).all();

  return c.html(layout('ダッシュボード', user, html`
    <h2>ダッシュボード</h2>

    <div class="stats">
      <div class="stat-card">
        <span class="stat-number">${userCount.count}</span>
        <span class="stat-label">ユーザー数</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${articleCount.count}</span>
        <span class="stat-label">記事数</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${commentCount.count}</span>
        <span class="stat-label">コメント数</span>
      </div>
    </div>

    <h3>最近の記事</h3>
    <table>
      <thead>
        <tr>
          <th>タイトル</th>
          <th>著者</th>
          <th>投稿日</th>
        </tr>
      </thead>
      <tbody>
        ${recentArticles.map((a) => html`
          <tr>
            <td>${a.title}</td>
            <td>${a.author_name}</td>
            <td>${a.created_at}</td>
          </tr>
        `)}
      </tbody>
    </table>

    <h3>投稿数ランキング</h3>
    <table>
      <thead>
        <tr>
          <th>ユーザー</th>
          <th>記事数</th>
        </tr>
      </thead>
      <tbody>
        ${topAuthors.map((a) => html`
          <tr>
            <td>${a.name}</td>
            <td>${a.article_count}</td>
          </tr>
        `)}
      </tbody>
    </table>
  `));
});

export default app;
