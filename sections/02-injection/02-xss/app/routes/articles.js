import { Hono } from 'hono';
import { html, raw } from 'hono/html';
import { marked } from 'marked';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { layout } from '../components/layout.js';

const app = new Hono();

// 記事一覧
app.get('/', (c) => {
  const user = c.get('user');
  const articles = db.prepare(`
    SELECT articles.*, users.name as author_name
    FROM articles
    JOIN users ON articles.author_id = users.id
    ORDER BY articles.created_at DESC
  `).all();

  return c.html(layout('記事一覧', user, html`
    <div class="page-header">
      <h2>記事一覧</h2>
      ${user ? html`<a href="/articles/new" class="btn">新しい記事を書く</a>` : ''}
    </div>
    ${articles.length === 0
      ? html`<p>記事がまだありません。</p>`
      : articles.map((a) => html`
        <div class="article-card">
          <h3><a href="/articles/${a.id}">${a.title}</a></h3>
          <span class="meta">${a.author_name} / ${a.created_at}</span>
        </div>
      `)}
  `));
});

// 記事作成フォーム
app.get('/new', requireAuth(), (c) => {
  const user = c.get('user');

  return c.html(layout('新規作成', user, html`
    <h2>新しい記事を書く</h2>
    <form method="POST" action="/articles">
      <label for="title">タイトル</label>
      <input type="text" id="title" name="title" required />
      <label for="body">本文</label>
      <textarea id="body" name="body" rows="10" required></textarea>
      <button type="submit" class="btn">投稿する</button>
    </form>
  `));
});

// 記事作成処理
app.post('/', requireAuth(), async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();

  if (!body.title || !body.body) {
    return c.redirect('/articles/new');
  }

  db.prepare('INSERT INTO articles (title, body, author_id) VALUES (?, ?, ?)').run(
    body.title, body.body, user.id
  );
  return c.redirect('/articles');
});

// 記事編集フォーム
app.get('/:id/edit', requireAuth(), (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);

  if (!article) {
    return c.html(layout('見つかりません', user, html`<p>記事が見つかりませんでした。</p>`), 404);
  }
  if (user.id !== article.author_id && user.role !== 'admin') {
    return c.html(layout('権限がありません', user, html`<p>この記事を編集する権限がありません。</p>`), 403);
  }

  return c.html(layout('記事を編集', user, html`
    <nav class="breadcrumb" aria-label="パンくずリスト">
      <ol>
        <li><a href="/articles">記事一覧</a></li>
        <li><a href="/articles/${article.id}">${article.title}</a></li>
        <li aria-current="page">編集</li>
      </ol>
    </nav>
    <h2>記事を編集</h2>
    <form method="POST" action="/articles/${article.id}/edit">
      <label for="title">タイトル</label>
      <input type="text" id="title" name="title" value="${article.title}" required />
      <label for="body">本文</label>
      <textarea id="body" name="body" rows="10" required>${article.body}</textarea>
      <button type="submit" class="btn">更新する</button>
    </form>
  `));
});

// 記事更新処理
app.post('/:id/edit', requireAuth(), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.parseBody();

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!article) return c.redirect('/articles');
  if (user.id !== article.author_id && user.role !== 'admin') {
    return c.redirect(`/articles/${id}`);
  }
  if (!body.title || !body.body) {
    return c.redirect(`/articles/${id}/edit`);
  }

  db.prepare('UPDATE articles SET title = ?, body = ? WHERE id = ?').run(
    body.title, body.body, id
  );
  return c.redirect(`/articles/${id}`);
});

// 記事詳細 + コメント
app.get('/:id', (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const article = db.prepare(`
    SELECT articles.*, users.name as author_name
    FROM articles
    JOIN users ON articles.author_id = users.id
    WHERE articles.id = ?
  `).get(id);

  if (!article) {
    return c.html(layout('見つかりません', user, html`<p>記事が見つかりませんでした。</p>`), 404);
  }

  const comments = db.prepare(`
    SELECT comments.*, users.name as user_name
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.article_id = ?
    ORDER BY comments.created_at ASC
  `).all(id);

  const canEdit = user && (user.id === article.author_id || user.role === 'admin');

  return c.html(layout(article.title, user, html`
    <nav class="breadcrumb" aria-label="パンくずリスト">
      <ol>
        <li><a href="/articles">記事一覧</a></li>
        <li aria-current="page">${article.title}</li>
      </ol>
    </nav>
    <article>
      <h2>${article.title}</h2>
      <p class="meta">${article.author_name} / ${article.created_at}</p>
      <div class="article-body">${raw(marked.parse(article.body))}</div>
    </article>

    ${canEdit ? html`
      <div class="article-actions">
        <a href="/articles/${article.id}/edit" class="btn">編集</a>
        <form method="POST" action="/articles/${article.id}/delete">
          <button type="submit" class="btn btn-danger">削除</button>
        </form>
      </div>
    ` : ''}

    <section class="comments">
      <h3>コメント (${comments.length})</h3>
      ${comments.map((comment) => html`
        <div class="comment">
          <strong>${comment.user_name}</strong>
          <time>${comment.created_at}</time>
          <!-- TODO: ここを修正してみよう -->
          <!-- raw() で囲っているとユーザー入力に含まれる HTML/スクリプトがそのまま埋め込まれる -->
          <p>${raw(comment.body)}</p>
        </div>
      `)}

      ${user
        ? html`
          <form method="POST" action="/articles/${article.id}/comments">
            <label for="comment">コメントを書く</label>
            <textarea id="comment" name="body" rows="3" required></textarea>
            <button type="submit" class="btn">投稿する</button>
          </form>
        `
        : html`<p><a href="/auth/login">ログイン</a>するとコメントできます。</p>`}
    </section>
  `));
});

// コメント投稿
app.post('/:id/comments', requireAuth(), async (c) => {
  const user = c.get('user');
  const articleId = c.req.param('id');
  const body = await c.req.parseBody();

  if (body.body) {
    db.prepare('INSERT INTO comments (body, article_id, user_id) VALUES (?, ?, ?)').run(
      body.body, articleId, user.id
    );
  }
  return c.redirect(`/articles/${articleId}`);
});

// 記事削除
app.post('/:id/delete', requireAuth(), (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (article && (user.id === article.author_id || user.role === 'admin')) {
    db.prepare('DELETE FROM comments WHERE article_id = ?').run(id);
    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  }

  return c.redirect('/articles');
});

export default app;
