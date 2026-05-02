# 04-03 - キャッシュ

## TODO

1. アプリを起動して `/dashboard` を **5 回連続で開き**、サーバーターミナルに毎回 `[dashboard] 900ms` 前後の行が出ることを確認する
2. `app/routes/dashboard.js` と `comments` テーブルの状態を見て、**毎回その時間がかかる理由** を説明できるようにする
3. `app/lib/cache.js` を **新規作成** して TTL 30 秒の簡易キャッシュを導入し、2 回目以降のリクエストが `<10ms` で返ることを確認する

## 学ぶこと

ダッシュボードのような「毎回ほぼ同じ集計を返す画面」は、**同じ入力に対して同じ出力を毎回計算し直す** という無駄を抱えがちです。アプリ層のキャッシュ（メモ化）はこの無駄を取り除く一番手前の手段です。

この章で身につけたい観点は次の3つです。

- **同じ計算を毎回やらない**：集計結果は秒単位では変わらない、というドメイン知識を活かす
- **メモ化（同じ入力 → 同じ出力をキャッシュ）の発想**：関数の入出力をそのまま覚えておく
- **キャッシュ導入の常套手段**：TTL（時限失効）、key 設計、無効化、整合性のトレードオフ

## 説明

### TODO 1: 遅さを観測する

管理者（`admin@example.com` / `admin123`）でログインし、`/dashboard` を開いてください。サーバーを起動しているターミナルに次のような行が出ます。

```
[dashboard] 912ms
```

ブラウザを 5 回リロードしても、毎回 900ms 前後の数字が出続けます。ブラウザキャッシュも効いていません（HTML を返しているだけで `Cache-Control` を付けていないため）。

### TODO 2: 何にかかっているのかを説明する

該当箇所は [app/routes/dashboard.js](./app/routes/dashboard.js) のハンドラです。リクエストごとに次のクエリが走っています。

- `COUNT(*)` クエリ × 3（`users` / `articles` / `comments`）
- JOIN・GROUP BY 集計クエリ × 4（`recentArticles` / `topAuthors` / `topCommentedArticles` / `topCommenters`）

このうち重いのは **`comments` を JOIN して GROUP BY する 2 つ**（`topCommentedArticles` / `topCommenters`）です。`comments` テーブルには **100 万行** が入っていて、`comments.article_id` と `comments.user_id` には **インデックスがありません**。そのため記事ごと・ユーザーごとの集計を取るために 100 万行を毎回フルスキャンする必要があり、これだけで 800ms 以上かかります。

```sh
sqlite3 data/database.sqlite 'SELECT COUNT(*) FROM comments;'
# => 1000003
```

ポイントは、**これらの結果は秒単位ではほとんど変わらない** ということです。ユーザー数や記事数の集計が 1 秒ごとに別の値を返す必要はありません。にもかかわらず、毎リクエスト計算し直しているのが今の状態です。

> **インデックスを貼れば速くなるのでは？**
> その通りで、`comments(article_id)` / `comments(user_id)` にインデックスを貼れば数十 ms まで縮みます（前章 [02-large-data](../02-large-data/) で扱った話）。ただしインデックスを貼っても **GROUP BY の集計コスト自体はゼロにはなりません**。ユーザー数・記事数の集計のように「秒単位では値が変わらない」結果は、**そもそも毎回計算しないのが一番速い** — それがキャッシュの発想です。実運用ではインデックスとキャッシュの両方を使います。

### TODO 3: TTL キャッシュを導入する

新しくファイル `app/lib/cache.js` を作ります。

```js
// 簡易インメモリ TTL キャッシュ
const store = new Map();

export function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clear() {
  store.clear();
}

export async function getOrLoad(key, ttlMs, loader) {
  const cached = get(key);
  if (cached !== undefined) return cached;
  const value = await loader();
  set(key, value, ttlMs);
  return value;
}
```

次に `app/routes/dashboard.js` を、集計部分を `getOrLoad` で包む形に書き換えます。

```js
import { getOrLoad } from '../lib/cache.js';

app.get('/', async (c) => {
  const t0 = Date.now();
  const user = c.get('user');

  const stats = await getOrLoad('dashboard:stats', 30_000, async () => {
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

    const topCommentedArticles = db.prepare(`
      SELECT articles.id, articles.title, COUNT(comments.id) as comment_count
      FROM articles
      LEFT JOIN comments ON comments.article_id = articles.id
      GROUP BY articles.id
      ORDER BY comment_count DESC, articles.id ASC
      LIMIT 5
    `).all();

    const topCommenters = db.prepare(`
      SELECT users.name, COUNT(comments.id) as comment_count
      FROM users
      LEFT JOIN comments ON comments.user_id = users.id
      GROUP BY users.id
      ORDER BY comment_count DESC, users.id ASC
      LIMIT 5
    `).all();

    return {
      userCount, articleCount, commentCount,
      recentArticles, topAuthors, topCommentedArticles, topCommenters,
    };
  });

  const {
    userCount, articleCount, commentCount,
    recentArticles, topAuthors, topCommentedArticles, topCommenters,
  } = stats;

  console.log(`[dashboard] ${Date.now() - t0}ms`);

  return c.html(layout('ダッシュボード', user, html`
    <!-- 既存の HTML はそのまま。userCount / recentArticles などは stats から分解した変数を使う -->
  `));
});
```

動作確認は次の通りです。

1. 1 回目の `/dashboard` → ターミナルに `[dashboard] 912ms` のような行（キャッシュミスで再計算）
2. 30 秒以内にリロード → `[dashboard] 2ms` のような行（キャッシュヒット）
3. 30 秒経過後にリロード → また 900ms 台（TTL 切れで再計算）

「同じ入力に対しては同じ出力を返す」を **覚えておくだけ** で 900ms が 2ms になります。これがアプリ層キャッシュの基本です。

---

## 補足: キャッシュの 3 大難所

キャッシュは入れれば速くなる、で済む話ではありません。古典的にハマる罠が 3 つあります。

- **(1) 無効化（invalidation）**：書き込み（記事の作成・削除など）でキャッシュを壊し忘れると、古いデータが見え続けます。本レクチャーは TTL で時限的に壊しているだけ。整合性が大事な箇所では、書き込みのフックで `cache.clear()` を呼ぶか、関連する key を細かく管理する必要があります
- **(2) データ整合性**：TTL 30 秒の間は古い値が見えます。許容できない用途（残高・在庫）には不向きで、許容できる用途（ダッシュボード・ランキング・統計）に向きます
- **(3) Thundering herd（雷鳴の群れ）**：TTL が切れた瞬間に同時リクエストが全部 DB へ突進する現象。SingleFlight（同時実行を 1 本に束ねる）や stale-while-revalidate（古い値を返しつつ裏で更新）で緩和します

## 補足: アプリ層キャッシュ vs HTTP キャッシュ vs CDN

キャッシュを「どの層で持つか」も重要な設計判断です。

- HTTP `Cache-Control` でブラウザにキャッシュさせる方式は、ログイン後の動的な画面では `Cache-Control: private` で慎重に扱う必要があります
- リバースプロキシ（Varnish, Nginx）や CDN（CloudFront, Fastly）でも同様のキャッシュが可能。アプリの手前で吸収できれば DB を見ずに済みます
- インメモリ Map は **同一プロセス内** だけで共有されます。スケールアウト（プロセス・サーバーを増やす）すると共有が必要になるので、Redis / Memcached が定番です

## 補足: 何をキャッシュ key にするか

key 設計は「同じ入力なら同じ出力が返る」を守るためのものです。

- ユーザーごとに違うデータなら key にユーザー ID を含める：`dashboard:stats:user:${user.id}`
- パラメータ付きエンドポイントはクエリも key に含める：`articles:list:limit:${limit}:offset:${offset}`
- 衝突しなければ大丈夫。長さは気にしなくて良い

逆に、ユーザー固有の情報（個人の通知バッジ数など）を含む結果を **全ユーザー共通の key** で覚えてしまうと、他人のデータが他人に見える事故が起きます。「key にすべき次元」を一度書き出してから設計してください。

## 次の章へ

これでハンズオンは一区切りです。

ここまで 9 レクチャーで繰り返してきたのは、**攻撃や問題を体感する → コードを読む → 直す** という同じループです。SQL インジェクション、XSS、CSRF、認可、コマンドインジェクション、N+1、インデックス、そしてキャッシュ。題材は違っても、やっていたことは同じでした。

実際の業務でも、**「動いている」と「正しく速く安全に動いている」は別物** です。今日身につけたループ — 動かす、観察する、原因を特定する、最小の修正で直す — を、自分のコードベースに持ち帰ってください。お疲れさまでした。
