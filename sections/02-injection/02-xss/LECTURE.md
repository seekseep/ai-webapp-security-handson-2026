# 02-02 - XSS（Stored XSS）

## TODO

1. アプリを起動し、記事のコメント欄に **`<script>` を含むコメントを投稿** して JavaScript が実行されることを確認する
2. コメント表示のコードを読み、**なぜ実行されてしまうのか** を説明できるようにする
3. テンプレートの自動エスケープが効くように修正し、再度同じ攻撃で実行されないことを確認する
4. 記事本文の Markdown レンダリングにも同種のリスクがあることを確認する（発展課題）

## 学ぶこと

XSS（Cross-Site Scripting）は、攻撃者が仕込んだ JavaScript が **他のユーザーのブラウザで実行される** 脆弱性です。盗難・改ざんの起点になり、Cookie 経由でセッション奪取まで繋がります。

特に **Stored XSS** は、攻撃ペイロードが DB に保存されて、ページを開いた全員に配信されるタイプです。投稿された時点で攻撃が成立してしまうので、影響範囲が広いのが特徴です。

この章で身につけたい観点は次の3つです。

- **なぜ脆弱なのか**：HTML 文字列にユーザー入力を **エスケープせず** 埋め込むと、`<script>` などのタグがそのままブラウザで実行される
- **正しい直し方**：テンプレートの **自動エスケープ機構** を使う。`hono/html` のタグ付きテンプレートは `${...}` を自動でエスケープしてくれる。`raw()` でラップしている箇所は意図的なバイパスなので要注意
- **多層防御の意識**：エスケープを忘れない仕組みづくり（Linter、テンプレート選択、CSP など）が大切

## 説明

### TODO 1: 攻撃用コメントを投稿する

1. http://localhost:3000 でログインする（例: `tanaka@example.com` / `password`）
2. 任意の記事を開く
3. コメント欄に次のいずれかを入力して投稿:

   ```html
   <script>alert('XSS')</script>
   ```

   ```html
   <img src=x onerror="alert('XSS')">
   ```

4. ページがリロードされた瞬間に `alert` が実行されれば成功

ログアウトして別ユーザーで開いても同じく実行されます。**投稿された時点で全閲覧者に対して攻撃が成立** するのが Stored XSS の怖いところです。

### TODO 2: なぜ実行されてしまうのかを説明する

該当箇所は [app/routes/articles.js](./app/routes/articles.js) のコメント表示部分です。

```js
${comments.map((comment) => html`
  <div class="comment">
    <strong>${comment.user_name}</strong>
    <time>${comment.created_at}</time>
    <p>${raw(comment.body)}</p>   ← ここ
  </div>
`)}
```

`hono/html` のタグ付きテンプレート `` html`...` `` は、`${変数}` の中身を **自動的に HTML エスケープ** してくれます（`<` → `&lt;` など）。これがフレームワークの基本防御です。

ところが `raw(comment.body)` で囲むと **エスケープを意図的にスキップ** してしまうので、ユーザーが入力した `<script>` がそのままブラウザに届いて、実行されてしまいます。

### TODO 3: 自動エスケープが効くように修正する

`raw()` を外すだけです。

```js
<p>${comment.body}</p>
```

修正後、もう一度 `<script>alert('XSS')</script>` を投稿してみると、画面には文字列としてそのまま表示され（`<script>...` が見える）、JS は実行されません。

ブラウザで「ソースを表示」すると、HTML としては `&lt;script&gt;alert('XSS')&lt;/script&gt;` にエスケープされていることが確認できます。

### TODO 4（発展）: 記事本文の Markdown もリスクあり

記事本文は `marked.parse()` の結果を `raw()` で埋め込んでいます。

```js
<div class="article-body">${raw(marked.parse(article.body))}</div>
```

`marked` はデフォルトで **Markdown 内に書かれた生 HTML を許可** します。なので記事本文に `<script>alert('XSS')</script>` と書いても XSS が成立します。

実際に試してみてください。新規記事を作成して、本文に:

```markdown
# 普通の見出し

<script>alert('article XSS')</script>
```

を入れて投稿すると、開いた瞬間にアラートが出ます。

#### 直し方

選択肢は3つあります。

1. **HTML を許可しない設定にする**
   ```js
   import { marked } from 'marked';
   marked.use({ renderer: { html: () => '' } });
   ```
2. **DOMPurify でサニタイズする**
   ```js
   import DOMPurify from 'isomorphic-dompurify';
   const safe = DOMPurify.sanitize(marked.parse(article.body));
   ```
3. **そもそも Markdown ではなくプレーンテキスト表示にする**

「Markdown を許可するけど HTML は許可しない」が一番現実的なバランスです（1）。

---

## 補足: なぜ「入力時にサニタイズ」より「出力時にエスケープ」?

XSS 対策はよく「入力時のサニタイズ」と言われますが、推奨は **「出力時のエスケープ」** です。理由:

- 同じデータでも HTML、JS、URL 属性、JSON など **コンテキストごとに必要なエスケープが違う**
- 入力時に削ってしまうと、データの **元の形** が失われる（後から「やっぱり残したかった」が効かない）
- DB から取得したデータも常に「未信頼」と見なせばよく、出力時に統一処理できる

`hono/html` や React の JSX のように、**テンプレートエンジンが自動でエスケープしてくれる** 仕組みを素直に使うのが鉄則です。`raw()` や `dangerouslySetInnerHTML` のような **明示的なバイパス** を見つけたら、必ず正当性を確認しましょう。

## 次の章へ

XSS を直して、コメント・記事本文の両方で安全な表示ができるようになったら、次の章（コマンドインジェクション）に進みましょう。
