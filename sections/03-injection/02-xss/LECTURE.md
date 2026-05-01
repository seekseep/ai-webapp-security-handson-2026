# 02-02 - XSS（Stored XSS）

## TODO

1. アプリを起動し、記事のコメント欄に **`<script>` を含むコメントを投稿** して JavaScript が実行されることを確認する
2. コメント表示のコードを読み、**なぜ実行されてしまうのか** を説明できるようにする
3. テンプレートの自動エスケープが効くように修正し、再度同じ攻撃で実行されないことを確認する

## 学ぶこと

XSS（Cross-Site Scripting）は、攻撃者が仕込んだ JavaScript が **他のユーザーのブラウザで実行される** 脆弱性です。盗難・改ざんの起点になり、Cookie 経由でセッション奪取まで繋がります。

特に **Stored XSS** は、攻撃ペイロードが DB に保存されて、ページを開いた全員に配信されるタイプです。投稿された時点で攻撃が成立してしまうので、影響範囲が広いのが特徴です。

この章で身につけたい観点は次の3つです。

- **なぜ脆弱なのか**：HTML 文字列にユーザー入力を **エスケープせず** 埋め込むと、`<script>` などのタグがそのままブラウザで実行される
- **正しい直し方**：テンプレートの **自動エスケープ機構** を使う。`hono/html` のタグ付きテンプレートは `${...}` を自動でエスケープしてくれる。`raw()` でラップしている箇所は意図的なバイパスなので要注意
- **`raw()` に手を出してしまう動機を理解する**：HTML を **文字列結合（`+`）で組み立てた** あと描画するために `raw()` を使うのは典型的な失敗パターン。タグ付きテンプレートで構造ごと組み立てれば、そもそも `raw()` は不要になる

## 説明

### TODO 1: 攻撃用コメントを投稿する

1. http://localhost:3000 でログインする（例: `tanaka@example.com` / `password`）
2. 任意の記事を開く
3. コメント欄に次のいずれかを入力して投稿:

   ```html
   <script>alert('XSS')</script>
   ```

   ```html
   <img src="x" onerror="alert('XSS')">
   ```

4. ページがリロードされた瞬間に `alert` が実行されれば成功

ログアウトして別ユーザーで開いても同じく実行されます。**投稿された時点で全閲覧者に対して攻撃が成立** するのが Stored XSS の怖いところです。

### TODO 2: なぜ実行されてしまうのかを説明する

該当箇所は [app/routes/articles.js](./app/routes/articles.js) のコメント表示部分です。

次の部分に問題があります。

```js
${comments.map((comment) => {
  const isNew = new Date(comment.created_at) > new Date(Date.now() - 5 * 60 * 1000);
  const body = isNew
    ? '<span style="color: red; font-weight: bold;">[New] </span>' + comment.body
    : '' + comment.body;

  return html`
    <div class="comment">
      <strong>${comment.user_name}</strong>
      <time>${comment.created_at}</time>
      <p>${raw(body)}</p>
    </div>
  `;
})}
```

`hono/html` のタグ付きテンプレート `` html`...` `` は、`${変数}` の中身を **自動的に HTML エスケープ** してくれます（`<` → `&lt;` など）。これがフレームワークの基本防御です。

このコードでは「新着コメントに `[New]` バッジを付けたい」という要件を **文字列結合（`+`）** で実現しています。`<span>...</span>` を `${...}` でそのまま渡すとエスケープされて `&lt;span&gt;` になってしまうため、開発者は `raw()` でくるんで HTML として描画させました。

ところが `raw()` の中身は **バッジ + ユーザー入力（`comment.body`）** です。バッジを描画するために `raw()` を使うと、同じ文字列に含まれる `comment.body` までエスケープが効かなくなります。これが Stored XSS の入り口です。

### TODO 3: 自動エスケープが効くように修正する

ポイントは **文字列結合をやめて、タグ付きテンプレートで構造ごと組み立てる** ことです。`<span>` 部分は静的 HTML なのでテンプレートに直接書き、`comment.body` は `${...}` で渡してエスケープを効かせます。

```js
${comments.map((comment) => {
  const isNew = new Date(comment.created_at) > new Date(Date.now() - 5 * 60 * 1000);

  return html`
    <div class="comment">
      <strong>${comment.user_name}</strong>
      <time>${comment.created_at}</time>
      <p>
        ${isNew ? html`<span style="color: red; font-weight: bold;">[New] </span>` : ''}
        ${comment.body}
      </p>
    </div>
  `;
})}
```

こうすると:

- `<span>` は **テンプレートの一部** として安全に描画される
- `comment.body` は **`${}` で渡された値** なので自動エスケープされる
- `raw()` は登場しなくなる

修正後、もう一度 `<script>alert('XSS')</script>` を投稿してみると、画面には文字列としてそのまま表示され（`<script>...` が見える）、JS は実行されません。

ブラウザで「ソースを表示」すると、HTML としては `&lt;script&gt;alert('XSS')&lt;/script&gt;` にエスケープされていることが確認できます。

---

## 補足: 記事本文の Markdown はどう守られているか

記事本文も `marked.parse()` の結果を `raw()` で埋め込んでいます。

```js
<div class="article-body">${raw(marked.parse(article.body))}</div>
```

ここで `raw()` を使っているのは Markdown 由来の HTML（`<h1>` や `<p>` など）を描画するために必要だからです。一方、`marked` はデフォルトでは Markdown 内に書かれた **生 HTML をそのまま通してしまう** ので、本文に `<script>` を書かれると XSS になります。

このアプリでは `articles.js` の冒頭で対策済みです。

```js
marked.use({ renderer: { html: () => '' } });
```

これで Markdown ソース中の生 HTML は無視され、Markdown 構文だけが安全に HTML 化されます。`raw()` を使う場合でも、**`raw()` に渡す前にユーザー入力を無害化しておく** のがポイントです。

---

## 補足: なぜ「入力時にサニタイズ」より「出力時にエスケープ」?

XSS 対策はよく「入力時のサニタイズ」と言われますが、推奨は **「出力時のエスケープ」** です。理由:

- 同じデータでも HTML、JS、URL 属性、JSON など **コンテキストごとに必要なエスケープが違う**
- 入力時に削ってしまうと、データの **元の形** が失われる（後から「やっぱり残したかった」が効かない）
- DB から取得したデータも常に「未信頼」と見なせばよく、出力時に統一処理できる

`hono/html` や React の JSX のように、**テンプレートエンジンが自動でエスケープしてくれる** 仕組みを素直に使うのが鉄則です。`raw()` や `dangerouslySetInnerHTML` のような **明示的なバイパス** を見つけたら、必ず正当性を確認しましょう。

## 次の章へ

XSS を直してコメントを安全に表示できるようになったら、次の章（コマンドインジェクション）に進みましょう。
