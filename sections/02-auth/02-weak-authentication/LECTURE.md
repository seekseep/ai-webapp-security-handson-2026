# 03-02 - 不十分な認証

## TODO

1. 自分のアカウント (`tanaka@example.com` / `password`) でログインしたあと、ブラウザの DevTools から Cookie `user_id` を `1` に書き換えてリロードし、`admin@example.com` に化けて管理画面に入れることを確認する
2. 該当コードを読み、**なぜ突破できるのか** を説明できるようにする
3. サーバー側ストア + ランダム session_id（httpOnly Cookie）方式に直し、同じ攻撃が通らないことを確認する

## 学ぶこと

ログイン状態の保持を「クライアントが見える値」で行うと、攻撃者は DevTools で値を書き換えるだけで他人になりすませます。本章は **「サーバーが信用してよい値とは何か」** を考える出発点です。

この章で身につけたい観点は次の3つです。

- **クライアントから見える Cookie はクライアントが書き換え可能** であること
- **「サーバー側で持っている情報を引くキー」** と **「サーバーが直接信用する値」** の決定的な違い
- 一般的な対策である **サーバーサイドセッション・署名 Cookie・JWT** の3方式の住み分け

## 説明

### TODO 1: Cookie 書き換えで管理者に化ける

1. `tanaka@example.com` / `password` でログインする
2. DevTools を開く（Chrome なら **Application** タブ／Firefox なら **Storage** タブ）→ Cookies → `http://localhost:3000`
3. `user_id` Cookie の値を `1` に書き換えてリロードする
4. ヘッダーに表示される名前が「管理者」に変わり、`/admin` が開けてしまう

### TODO 2: なぜ通ってしまうのか

該当箇所は [app/middleware/session.js](./app/middleware/session.js) です。サーバー側ストアが存在せず、`session.userId` の getter は単に Cookie を読んでいるだけです。

```js
get userId() {
  const v = getCookie(c, 'user_id');
  return v ?? null;
}
```

[app/middleware/auth.js](./app/middleware/auth.js) の `currentUser` は `session.userId` を使って users テーブルを引いています。

```js
const session = c.get('session');
if (session?.userId) {
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(session.userId);
  c.set('user', user || null);
}
```

DB を引いてはいますが、**引くキー自体がクライアントから自由に書き換えられる値** です。要は **「自称」を信用している** だけで、認証として成立していません。

ログイン処理 [app/routes/auth.js](./app/routes/auth.js) も `session.userId = user.id;` という形で、setter 経由で `user_id` Cookie を発行しています。中身が「ユーザー ID 直書きの Cookie」である以上、攻撃者は DevTools でそれを別の ID に書き換えるだけで終わりです。

### TODO 3: サーバーサイドセッションに直す

修正の方向は **「Cookie にはランダムな ID だけを置き、ユーザーの実態はサーバー側ストアに持つ」** です。Cookie が書き換えられても、サーバー側ストアに存在しない ID なら未ログイン扱いになります。

`app/middleware/session.js` を以下に置き換えます（01-environment の実装と同じものです）。本教材では **学習環境を簡素化するため SQLite の `sessions` テーブル** をストアとして使います。本番環境では Redis のようなインメモリ KVS を使うのが定石です（後述）。

```js
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import crypto from 'crypto';
import db from '../db.js';

const ONE_DAY_SEC = 60 * 60 * 24;
const nowSec = () => Math.floor(Date.now() / 1000);

export function sessionMiddleware() {
  return async (c, next) => {
    const sessionId = getCookie(c, 'session_id');
    let session;

    if (sessionId) {
      const row = db
        .prepare('SELECT data FROM sessions WHERE id = ? AND expires_at > ?')
        .get(sessionId, nowSec());
      if (row) session = { id: sessionId, ...JSON.parse(row.data) };
    }

    if (!session) {
      session = { id: crypto.randomUUID() };
      db
        .prepare('INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)')
        .run(session.id, '{}', nowSec() + ONE_DAY_SEC);
      setCookie(c, 'session_id', session.id, {
        httpOnly: true,
        path: '/',
        maxAge: ONE_DAY_SEC,
      });
    }

    c.set('session', session);
    await next();

    // ルート内で変更された session を DB に書き戻す
    const { id, ...data } = c.get('session');
    db
      .prepare('UPDATE sessions SET data = ? WHERE id = ?')
      .run(JSON.stringify(data), id);
  };
}

export function destroySession(c) {
  const session = c.get('session');
  if (session) {
    db
      .prepare('DELETE FROM sessions WHERE id = ?')
      .run(session.id);
    deleteCookie(c, 'session_id', { path: '/' });
  }
}
```

`scripts/init.js` には次の `sessions` テーブルが追加してあります（再 init 不要なら既存 DB のまま使えます）。

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',  -- JSON: { userId, ... }
  expires_at INTEGER NOT NULL        -- UNIX秒
)
```

ポイントは次の3つです。

- Cookie に入れるのは `session_id` という **ランダム UUID** だけ。ユーザー ID は乗せない
- サーバー側 `sessions` テーブルで `sessionId → { userId }` を保持し、`session.userId` への代入はミドルウェア末尾の `UPDATE` で DB に書き戻される
- Cookie には `httpOnly: true` を付け、JS からのアクセスを塞ぐ

修正後、もう一度動作確認してください。

1. ログインすると Cookie が `session_id` という UUID 1個だけになっていること
2. その値を `1` に書き換えてリロードしても、サーバーの `sessions` テーブルにそんな ID は無いので未ログイン扱いになること
3. ログアウトすると `session_id` Cookie が消え、サーバー側 `sessions` テーブルのレコードも削除されること

> **本番ではどうする？** 全リクエストで DB ヒットするのは高負荷時のボトルネックになりやすいので、本番では **Redis や Memcached** のようなインメモリ KVS をセッションストアに使うのが定石です。Express の `express-session` も標準ストアは MemoryStore（プロセスローカル）で、本番には `connect-redis` 等を組み合わせます。本教材では学習環境を増やさないために SQLite で代用しています。

---

## 補足: 攻撃の種類を切り分ける

セッションまわりの攻撃は **「自分のセッションを偽る」** 系と **「他人のセッションを乗っ取る」** 系の2つに大きく分かれます。それぞれ防ぎ方が違うので、混ぜずに考えてください。

### 自分のセッションを偽る攻撃（本レクチャーの対応範囲）

攻撃者が自分のブラウザの DevTools を開き、Cookie の値を別のユーザーのものに書き換えてリクエストを送る攻撃です。本レクチャーで実演したのがまさにこれで、`user_id=1` に書き換えるだけで管理者に化けられました。

これは **「サーバーが Cookie の値そのものを信用している」** ことが原因なので、対策は **「Cookie にはランダムな ID だけを置き、ユーザーの実態はサーバー側で持つ」** ことです。Cookie を書き換えても、サーバー側ストアに該当 ID が無ければ未ログイン扱いになります。本レクチャーの TODO 3 で対応したのはこの問題です。

### 他人のセッション ID を盗み出す攻撃（`httpOnly` で防ぐもの）

サーバーサイドセッションに直しても、Cookie の中身（ランダムな session_id）を **他人のブラウザから盗まれて** しまえば、攻撃者はその ID をそのまま自分のブラウザに貼り付けて被害者になりすませます。盗む手段の代表が XSS で、`document.cookie` から JS で Cookie を読み取られます。

これを防ぐのが `httpOnly` フラグです。`httpOnly` を付けると JS から `document.cookie` で読み書きできなくなるので、XSS で Cookie を抜かれにくくなります。

注意点として、`httpOnly` は **「JS から Cookie を盗まれない」** ためのフラグであって、**「DevTools の Cookie エディタで書き換えられない」** ためのものではありません。本レクチャーの最初の攻撃（自分のセッションを偽る）は `httpOnly` が付いていても通ります。役割を取り違えないでください。

## 補足: セッションの管理方法

ログイン状態を持たせる方式は実務では主に3つです。どれを選んでも **「クライアントが書き換えられる値をサーバーが信用しない」** という大原則は変わりません。

- **サーバーサイドセッション**
- **署名 Cookie**
- **JWT**

### サーバーサイドセッション

Cookie にはランダムな session_id だけを置き、ユーザー情報（user_id・権限・最終アクセス時刻など）はサーバー側のストアに `sessionId → 中身` で持つ方式です。Cookie が改ざんされてもストアに無ければ未ログイン扱いになり、ログアウト時はストアから消すだけで即座に失効できます。古典的で堅い反面、複数台にスケールアウトするときはストアを共有する必要があります。

よく使われる技術:

- セッションストア: **Redis**（最も一般的）、Memcached、RDB の `sessions` テーブル、Cookie ベースのフォールバックなど
- ライブラリ: Node.js なら **express-session**、**iron-session**、Hono なら自前 Map か Redis クライアント、Rails なら **ActiveRecord::SessionStore** や **Redis::Store**、Django のデフォルトのデータベースバックエンド

### 署名 Cookie

Cookie に小さな状態（user_id 等）を載せ、サーバー秘密鍵による **HMAC 署名** を一緒に付けて改ざんを検知する方式です。サーバーが状態を持たないのでスケールが楽な反面、**失効が難しい** という弱点があります（ログアウトしても、攻撃者が事前にコピーしておいた Cookie はサーバー側から無効化できない）。

よく使われる技術:

- **Rails のデフォルトセッション**（`config.session_store :cookie_store`）
- **Django の signed_cookies バックエンド**
- Node.js の **cookie-session**、Hono の **Signed Cookies**（`getSignedCookie` / `setSignedCookie`）

### JWT

**JSON Web Token**（RFC 7519）。署名 Cookie の考え方を JSON ベースで規格化したもので、`Header.Payload.Signature` の3パートを `.` で連結した文字列を使います。Cookie だけでなく `Authorization: Bearer ...` ヘッダーで送ることも多く、フロントエンドとバックエンドが分離した SPA / モバイルアプリ / マイクロサービス間認証で広く使われています。

署名 Cookie と同じく **失効が難しい** ため、有効期限を短く（例: アクセストークン 5〜15 分）設定し、**リフレッシュトークン** と組み合わせて使うのが前提です。

よく使われる技術:

- ライブラリ: Node.js の **jsonwebtoken**、**jose**、Hono の `hono/jwt`
- 認証基盤: **Auth0**、**Firebase Authentication**、**AWS Cognito**、**Supabase Auth**、**Clerk** などが発行する ID トークン / アクセストークン
- プロトコル: **OAuth 2.0** のアクセストークン、**OpenID Connect** の ID トークンの実体が JWT

## 次の章へ

不十分な認証を直したら、次の章 [02-auth/03-broken-authorization](../03-broken-authorization/) に進みましょう。「認証は通ったけど他人のリソースにアクセスできてしまう」ケースを扱います。
