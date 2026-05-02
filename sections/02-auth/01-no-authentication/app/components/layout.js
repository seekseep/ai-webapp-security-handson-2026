import { html } from 'hono/html';

export function layout(title, user, content) {
  return html`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - ナレッジ共有</title>
  <link rel="stylesheet" href="/assets/style.css" />
</head>
<body>
  <header>
    <div class="header-inner">
      <h1><a href="/">ナレッジ共有</a></h1>
      <nav>
        <a href="/articles">記事一覧</a>
        <a href="/dashboard">ダッシュボード</a>
        ${user
          ? html`
            <a href="/users/${user.id}">${user.name}</a>
            ${user.role === 'admin' ? html`<a href="/admin">管理画面</a>` : ''}
            <form method="POST" action="/auth/logout" style="margin: 0;">
              <button type="submit" class="btn-link">ログアウト</button>
            </form>
          `
          : html`
            <a href="/auth/login">ログイン</a>
            <a href="/auth/register">新規登録</a>
          `}
      </nav>
    </div>
  </header>
  <main>${content}</main>
</body>
</html>`;
}
