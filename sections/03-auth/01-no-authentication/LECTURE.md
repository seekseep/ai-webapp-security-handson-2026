# 03-01 - 認証なし

## TODO

1. 未ログイン状態のブラウザで `/admin` にアクセスし、**ユーザー一覧と削除ボタン** が見えてしまうことを確認する
2. 管理画面のコードを読み、**なぜ未ログインでも開けるのか** を説明できるようにする
3. ミドルウェアで未ログイン／非管理者をはじくよう修正し、もう一度未ログインで `/admin` を開いて `/auth/login` にリダイレクトされることを確認する

## 学ぶこと

認可ガード（ログイン必須・管理者必須などのチェック）は、ミドルウェアとしてルートの前段に「当てる」ことで効きます。逆に言えば、**当て忘れたルートは完全に公開** されてしまう、という事故が起こりやすい場所でもあります。

この章で身につけたい観点は次の3つです。

- ミドルウェアによる認可ガードを **どこに、どの粒度で** 当てるか
- 「書き忘れただけで全公開になる」事故の怖さ
- `requireAuth`（ログイン必須）と `requireAdmin`（管理者必須）の **役割の違い**

## 説明

### TODO 1: 未ログインで `/admin` にアクセスする

ログアウトした状態（あるいはシークレットウィンドウ）でブラウザを開き直し、http://localhost:3000/admin に直接アクセスしてください。

確認したいことは次の2点です。

- ユーザー一覧テーブルが表示される（メールアドレス・ロール・登録日まで丸見え）
- ログイン中であれば自分以外のユーザーに **削除ボタン** が出ている

未ログインの場合は `user` が `null` になるので削除ボタンは表示されませんが、**一覧は閲覧できてしまう** ことが問題です。さらに一般ユーザー（`tanaka@example.com`）でログインしても、ヘッダーに `/admin` リンクは出ないものの URL 直打ちで届いてしまうことを確認してください。

### TODO 2: なぜ未ログインで開けるのかを説明する

該当箇所は [app/routes/admin.js](./app/routes/admin.js) です。冒頭を見てみましょう。

```js
import { Hono } from 'hono';
import { html } from 'hono/html';
import db from '../db.js';
import { layout } from '../components/layout.js';

const app = new Hono();

// 管理画面トップ（ユーザー一覧）
app.get('/', (c) => {
  // ...
});
```

他のレクチャー（`01-environment/01-environment` など）と見比べると、次の2点が **抜け落ちている** ことに気付きます。

- `requireAdmin` の import 文が無い
- ルート定義の前にあったはずの `app.use('*', requireAdmin());` が無い

Hono ではミドルウェアを次のどちらかで当てます。

- `app.use('*', requireAdmin())` で **そのルーター配下の全ルート** に当てる
- `app.get(path, requireAdmin(), handler)` のように **個別ルートに引数で** 渡す

今回はその両方を当て忘れた状態なので、`/admin` 配下のすべてのエンドポイントが認証なしで叩ける状態になっています。なお `app/middleware/auth.js` には `requireAuth()` と `requireAdmin()` がそのまま残っているので、import して `app.use` するだけで元に戻せます。

### TODO 3: ミドルウェアを当て直す

修正は2行で済みます。`requireAdmin` を import し、`app` を作った直後に全ルート向けで適用します。

```js
import { Hono } from 'hono';
import { html } from 'hono/html';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { layout } from '../components/layout.js';

const app = new Hono();

app.use('*', requireAdmin());
```

修正後、もう一度未ログインで http://localhost:3000/admin を開くと、`/` （または `/auth/login`）にリダイレクトされてユーザー一覧が見えなくなります。`tanaka@example.com`（一般ユーザー）でログインした状態でも同じく弾かれ、`admin@example.com` でログインしているときだけ管理画面が見える、という期待した状態に戻ります。

---

## 補足: requireAuth と requireAdmin の使い分け

`app/middleware/auth.js` には2種類のガードが用意されています。

- `requireAuth()` … セッションにログイン中のユーザーがいれば通す
- `requireAdmin()` … `requireAuth()` に加え、`role` が `admin` であることまで要求する

「閲覧やコメントなど、ログインさえしていれば一般ユーザーにも許可したい機能」には `requireAuth()`、「管理機能や全ユーザーの管理など、管理者にだけ許可したい機能」には `requireAdmin()` を使います。

当て方も2通りあり、そのルーターの **全ルートが同じ権限を要求するなら** `app.use('*', ...)` でまとめて当てるのが安全です（`admin.js` のように）。一方、ルーター内に **公開ルートと要ログインルートが混在する場合** は、`articles.js` のように `app.get(path, requireAuth(), handler)` の形で必要なルートだけに当てるほうが見通しが良くなります。

## 補足: 「URL を知らないから安全」は通用しない

`/admin` リンクをヘッダーから外したり、推測しづらい URL に変えたりするだけでは隠蔽になりません。攻撃者は URL 推測やクローリング、JavaScript の解析、過去のリーク情報などから内部パスに容易に到達します。

いわゆる **Security through obscurity（隠ぺいによるセキュリティ）** に頼らず、サーバー側で必ず認可チェックを行う、という原則を覚えておいてください。フロントから導線を消すのは UX の整理であって、セキュリティ対策ではありません。

## 次の章へ

ミドルウェアを当て直して認可ガードが効く状態に戻したら、次は [03-auth/02-weak-authentication](../02-weak-authentication/) に進みます。次の章ではミドルウェアはきちんと当たっているのに、**認証の仕組み自体が壊れている** ケースを扱います。
