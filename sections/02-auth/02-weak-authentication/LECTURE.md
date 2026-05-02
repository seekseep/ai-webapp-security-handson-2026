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
5. このとき `httpOnly` 列にチェックが付いていることを確認してください。`httpOnly` は JS (`document.cookie`) からの読み書きを禁止するフラグですが、DevTools の Cookie エディタからの編集には効きません。**フラグを付けても「Cookie の中身が答えそのもの」である限り改ざんは防げない** のが本章の核心です

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

修正の方向は **「Cookie にはランダムな ID だけを置き、ユーザーの実態はサーバー側 Map に持つ」** です。Cookie が書き換えられても、サーバー側 Map に存在しない ID なら未ログイン扱いになります。

`app/middleware/session.js` を以下に置き換えます（01-environment の実装と同じものです）。

```js
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import crypto from 'crypto';

// インメモリのセッションストア
const sessions = new Map();

export function sessionMiddleware() {
  return async (c, next) => {
    let sessionId = getCookie(c, 'session_id');
    let session;

    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
    } else {
      sessionId = crypto.randomUUID();
      session = {};
      sessions.set(sessionId, session);
      setCookie(c, 'session_id', sessionId, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24, // 1日
      });
    }

    c.set('session', session);
    c.set('sessionId', sessionId);
    await next();
  };
}

export function destroySession(c) {
  const sessionId = c.get('sessionId');
  if (sessionId) {
    sessions.delete(sessionId);
    deleteCookie(c, 'session_id', { path: '/' });
  }
}
```

ポイントは次の3つです。

- Cookie に入れるのは `session_id` という **ランダム UUID** だけ。ユーザー ID は乗せない
- サーバー側 `Map` で `sessionId → { userId }` を保持し、`session.userId` への代入は Map への書き込み、参照は Map からの読み出しになる
- Cookie には `httpOnly: true` を付け、JS からのアクセスを塞ぐ

修正後、もう一度動作確認してください。

1. ログインすると Cookie が `session_id` という UUID 1個だけになっていること
2. その値を `1` に書き換えてリロードしても、サーバーの Map にそんな ID は無いので未ログイン扱いになること
3. ログアウトすると `session_id` Cookie が消え、サーバー側 Map のエントリも削除されること

---

## 補足: httpOnly だけでは足りない

`httpOnly` は XSS で Cookie が JS から盗まれるのを防ぐためのフラグです。本レクチャーで起きている **「サーバーが Cookie の値そのものを信用してしまう」** 問題とは別物です。

`httpOnly` 付きで署名なしの Cookie に「ユーザー ID」を直書きしているだけなら、攻撃者は DevTools で値を見て直接書き換えるだけで済みます。JS からの読み書きを塞いでも、認証としては破綻しています。

「JS から守る」と「サーバーが信用してよいか」は別の問題、と切り分けて考えてください。

## 補足: サーバーサイドセッション／署名 Cookie／JWT の住み分け

ログイン状態を持たせる方式は実務では主に3つです。

- **サーバーサイドセッション**：本レクチャーの正解。Cookie はランダム ID だけで、中身はサーバー（メモリや Redis）が持つ。古典的で堅い。スケールアウト時には共有ストア（Redis 等）が必要
- **署名 Cookie**（HMAC 署名 + Cookie に小さな状態を載せる）：サーバーが状態を持たないので楽。ただし署名済みのトークンは **失効が難しい**（ログアウトしても、コピーされた Cookie はサーバー側からは無効化できない）
- **JWT**：署名 Cookie の規格化版。普及している。同じく失効が難しいので、有効期限を短く設定 + リフレッシュトークン併用が前提になる

方式は変わっても、共通の鉄則は変わりません。**「クライアントが書き換えられる値をサーバーが信用しない」** こと、これが認証における大原則です。

## 次の章へ

不十分な認証を直したら、次の章 [02-auth/03-broken-authorization](../03-broken-authorization/) に進みましょう。「認証は通ったけど他人のリソースにアクセスできてしまう」ケースを扱います。
