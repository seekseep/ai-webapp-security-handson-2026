# 04-01 - N+1 問題

## TODO

1. 管理者でログインして `/admin` を開き、サーバーターミナルに `[queries] GET /admin: 31` のような行が出ることを確認する
2. `app/routes/admin.js` を読み、**なぜ31本になるのか** を説明できるようにする
3. `LEFT JOIN articles ... GROUP BY users.id` を使って 1 本のクエリにまとめ、ログのクエリ数が大幅に減ることを確認する

## 学ぶこと

N+1 問題は、一覧画面で **「ついでに各行の関連データも出したい」** という要件が来たときに発生しがちな、もっとも典型的なパフォーマンスバグです。一覧取得が 1 本、各行の関連データ取得が件数ぶん（N 本）走るので、合わせて **N+1 本** のクエリが発行されます。

この章で身につけたい観点は次の3つです。

- **N+1 とは何か**：一覧取得 1 本 + 子要素を要素数ぶん 1 本ずつ、で合計 N+1 本になるパターン
- **ループ内 SQL の罠**：`for` の中で `db.prepare(...).get(...)` を書いた瞬間にこの問題が発生する
- **直し方**：`JOIN + GROUP BY` で 1 本にまとめる、もしくは `IN(...)` で一括取得して JS 側で組み立てる

## 説明

### TODO 1: 観測する

まず管理者（`admin@example.com` / `admin123`）でログインし、`/admin` にアクセスしてください。

ブラウザ上はユーザー一覧に「記事数」列が増えているだけですが、**サーバー側のターミナル** に注目すると、リクエストごとに次のようなログが出ているはずです。

```
[queries] GET /admin: 31
```

「サーバー側のターミナル」は、起動方法によって見る場所が変わります。

- **ローカル Node.js の場合** … `npm run dev` を実行しているターミナルにそのまま出ます。
- **Docker の場合** … `docker compose watch` のターミナルには同期・再起動イベントしか出ず、コンテナの stdout は流れてきません。別ターミナルで以下を実行してログを追いかけてください。

  ```bash
  docker compose logs -f app
  ```

  最初から `up` と `watch` をまとめて起動して、同じターミナルにログも出したい場合は `docker compose up --watch` という選択肢もあります。

シードデータが30ユーザーぶん入っているので、ユーザー一覧取得 1 本 + ユーザーごとの COUNT 30 本 = **合計 31 本** が、リロードするたびに走っています。

### TODO 2: なぜ31本か

`app/routes/admin.js` の問題箇所を見てみましょう。

```js
const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id').all();

// 各ユーザーの投稿記事数を1件ずつ取得（= N+1）
for (const u of users) {
  const row = db.prepare('SELECT COUNT(*) as c FROM articles WHERE author_id = ?').get(u.id);
  u.article_count = row.c;
}
```

内訳は以下のとおりです。

- (1) ユーザー一覧の取得 …… **1 本**（30 件返す）
- (2) ループの中で「このユーザーの記事数」を 1 本ずつ COUNT …… **30 本**

合わせて **31 本** になります。

ここで重要なのは、ユーザー数が増えると **「行数 × 1 クエリ」が走る** という点です。ユーザーが 1000 人になれば 1001 本、10000 人になれば 10001 本にスケールします。これが N+1 の核です。

なお、教材として同梱している `app/middleware/queryLogger.js` は `db.prepare` をラップして発行回数を数えているだけのシンプルな仕組みですが、本質的には ORM のスロークエリログや APM の SQL 抽出と同じ役割（「いつどれだけクエリが飛んでいるか」を可視化する）を果たします。

### TODO 3: JOIN + GROUP BY で一括化

`for` ループを廃止し、`LEFT JOIN` + `GROUP BY` で 1 本のクエリに置き換えます。

```js
const users = db.prepare(`
  SELECT users.id, users.name, users.email, users.role, users.created_at,
         COUNT(articles.id) as article_count
  FROM users
  LEFT JOIN articles ON articles.author_id = users.id
  GROUP BY users.id
  ORDER BY users.id
`).all();
```

この修正を入れて再度 `/admin` を開くと、ログは `[queries] GET /admin: 1`（あるいはヘッダー描画やセッション周りで他に小さな SELECT がある場合は数本）まで縮みます。

**重要ポイント** として、ここでは必ず `LEFT JOIN` を使ってください。`INNER JOIN` にしてしまうと **記事を 1 件も書いていないユーザーが結果から落ちて** しまいます。「親（users）は全件残しつつ、子（articles）は0件でも構わない」という意図を正しく表すのが `LEFT JOIN` です。

---

## 補足: 「ループの中で SQL」を見たらまず疑う

コードレビューで `for (...) { await db.something(...) }` のような形を見かけたら、ほぼ N+1 の入り口だと思って疑ってください。

例外は **本当に 1〜2 回しか回らない** ことが保証されているループだけです（たとえば「特定の id を1件貰って、親と子を1件ずつ取る」など）。それ以外は、JOIN・GROUP BY・IN などでバルク化できないか必ず検討しましょう。

## 補足: GROUP BY 以外の選択肢

JOIN + GROUP BY ではなく、`IN(...)` で子テーブルを一括取得して JS 側で組み立てる手もあります（DataLoader 系のアプローチ）。

```js
const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id').all();
const ids = users.map((u) => u.id);
const counts = db.prepare(
  `SELECT author_id, COUNT(*) as c FROM articles WHERE author_id IN (${ids.map(() => '?').join(',')}) GROUP BY author_id`
).all(...ids);
// counts を Map にして users にマージする
const countMap = new Map(counts.map((r) => [r.author_id, r.c]));
for (const u of users) u.article_count = countMap.get(u.id) ?? 0;
```

クエリは **2 本**（ユーザー一覧 + 集計）で固定されます。GROUP BY が JOIN 後に重くなりがちなテーブル構成では、この `IN` 方式のほうが速いことがあります。

## 補足: 「結局同じ件数を読むのだから、速さも同じでは？」

「ユーザーごとに 1 件ずつ COUNT するのも、JOIN で 1 本にまとめるのも、最終的に articles テーブルから読む件数はだいたい同じ。なら遅さも同じはずでは？」という疑問が出ます。

この直感は半分当たっていて、**DB の中で カーソル（≒インデックスやテーブルを舐めるポインタ）が触る行の数** だけを見れば、N+1 と JOIN+GROUP BY の差は意外と小さいことがあります（COUNT を index seek で済ませるなど、N+1 側のほうが触る行数が少ないケースさえあります）。

問題はそこではありません。**「クエリを 1 本発行する」こと自体に乗っかる固定コストが、N+1 回ぶん積み上がる** ことが本体です。

クエリ 1 本ぶんに乗っかる固定コストはおおまかに次のとおりです。

- **接続を取り直す／プールから 1 本占有する**（client/server 型 DB の場合）
- **ネットワーク往復**（client/server 型 DB の場合。同じ LAN でも 1 往復 1ms 程度。30 ユーザーなら 30ms のフロアが立つ）
- **クエリプランニング**（「どのインデックスを使うか」を毎回計算する。prepared statement で多少キャッシュされる）
- **パラメータバインディング・結果のシリアライズ**（プロトコル/ドライバの層を毎回通る）
- **JS ↔ ネイティブの境界越え**（better-sqlite3 のようにネットワークが無くても、N-API を1往復するだけで微小なコストが乗る）

これらは「行を1つ読む」コストとは別物で、**クエリを呼び出した回数そのものに比例** します。だから「カーソルが触る行数は同じくらいでも、コネクション取得・プロトコル処理・プランナの呼び出しを 30 回繰り返す」という時点で N+1 側の負けが確定しています。

ついでに、クエリプランナの目線でも「30 本の小さい仕事」より「1 本のまとまった仕事」のほうが最適化の余地があります（JOIN 順序の入れ替え、ソートのスキップ、インデックスのまとめ読みなど）。

このレクチャーは SQLite なのでネットワーク往復のコストはゼロで、N+1 と JOIN の体感差は小さく見えます。**これがむしろ落とし穴** で、本番でよく使われる Postgres / MySQL では「ネットワーク往復 × N」が支配項になり、「ローカルで動かしているうちは平気だったのに本番に出た瞬間に詰まる」というのが N+1 の典型的な刺さり方です。

## 補足: なぜ N+1 が起こりやすいか

- 一覧画面に対して「ついでに各行の集計値（記事数・コメント数など）も出したい」という要件が来たとき、ループで素直に書くとそのまま N+1 になる
- ORM の lazy load（関連付けの自動取得）で気付かないうちに発生することもある（`user.articles.length` のような一見ただのプロパティアクセスが、裏で SQL を打っているケース）
- 検出は **「クエリ数を見る」** が最強。本番なら APM やスロークエリログ、開発なら本レクチャーの queryLogger のように軽い計装を仕込んでおくと早期発見できる

## 次の章へ

N+1 問題は「クエリ本数」が爆発するパターンでした。次の章 `04-performance/02-large-data` では、「クエリ本数」ではなく **「1本のクエリで取りすぎる」** ケースに進みます。
