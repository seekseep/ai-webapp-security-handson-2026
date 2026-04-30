import { Hono } from 'hono';
import { html } from 'hono/html';
import db from '../db.js';
import { layout } from '../components/layout.js';

const app = new Hono();

// ダッシュボード（集計情報）— 毎回同じ重い処理を実行している
app.get('/', async (c) => {
  const t0 = Date.now();
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

  // 追加：コメントが多い記事 TOP5
  const topCommentedArticles = db.prepare(`
    SELECT articles.id, articles.title, COUNT(comments.id) as comment_count
    FROM articles
    LEFT JOIN comments ON comments.article_id = articles.id
    GROUP BY articles.id
    ORDER BY comment_count DESC, articles.id ASC
    LIMIT 5
  `).all();

  // 追加：コメント投稿数の多いユーザー TOP5
  const topCommenters = db.prepare(`
    SELECT users.name, COUNT(comments.id) as comment_count
    FROM users
    LEFT JOIN comments ON comments.user_id = users.id
    GROUP BY users.id
    ORDER BY comment_count DESC, users.id ASC
    LIMIT 5
  `).all();

  // 重い外部 API 呼び出しや CPU バウンドな集計処理を模した待ち。
  // 教材として「毎回800ms以上かかる」を再現可能にするため。
  await new Promise((r) => setTimeout(r, 800));

  console.log(`[dashboard] ${Date.now() - t0}ms`);

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
        <tr><th>タイトル</th><th>著者</th><th>投稿日</th></tr>
      </thead>
      <tbody>
        ${recentArticles.map((a) => html`
          <tr><td>${a.title}</td><td>${a.author_name}</td><td>${a.created_at}</td></tr>
        `)}
      </tbody>
    </table>

    <h3>投稿数ランキング</h3>
    <table>
      <thead><tr><th>ユーザー</th><th>記事数</th></tr></thead>
      <tbody>
        ${topAuthors.map((a) => html`<tr><td>${a.name}</td><td>${a.article_count}</td></tr>`)}
      </tbody>
    </table>

    <h3>コメントの多い記事</h3>
    <table>
      <thead><tr><th>タイトル</th><th>コメント数</th></tr></thead>
      <tbody>
        ${topCommentedArticles.map((a) => html`
          <tr><td><a href="/articles/${a.id}">${a.title}</a></td><td>${a.comment_count}</td></tr>
        `)}
      </tbody>
    </table>

    <h3>コメントの多いユーザー</h3>
    <table>
      <thead><tr><th>ユーザー</th><th>コメント数</th></tr></thead>
      <tbody>
        ${topCommenters.map((u) => html`<tr><td>${u.name}</td><td>${u.comment_count}</td></tr>`)}
      </tbody>
    </table>
  `));
});

export default app;
