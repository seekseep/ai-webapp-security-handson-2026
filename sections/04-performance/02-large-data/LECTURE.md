# 04-02 - 大量データ

## TODO

1. シード投入後 `/articles` を開き、初回ロードに **数秒以上** かかること、画面いっぱいに記事が並ぶことを確認する。DevTools の Network タブで Response の **Size** と **Time** を見る
2. コードを読み、**何が遅さの原因か** を説明できるようにする
3. `LIMIT ? OFFSET ?` を入れてページネーションを導入し、Network タブで Size と Time が桁違いに減ることを確認する

## 学ぶこと

「件数が増えれば線形に遅くなる」が日常で起きるのは、大体この形です。最初は速かった画面が、データが溜まるにつれて気づかぬうちに重くなる、というパターンです。

この章で身につけたい観点は次の3つです。

- **遅さは複合**：DB の読み出し、ネット転送、HTML 生成、ブラウザ描画、どの層も件数に比例して重くなる
- **行数を絞れば全層が同時に軽くなる**：入口で `LIMIT` をかければ、転送量・HTML 生成・ブラウザ描画まで一気に軽くなる
- **件数の上限を意識する**：性能要件は「現在の件数」ではなく「将来の最大件数」で考える

## 説明

### TODO 1: 体感する

まずは普通にアプリを起動して、遅さを体感します。

```bash
npm install
npm run database:init
npm run database:seed   # 5000 件投入されるので数十秒程度かかる
npm run dev
```

ブラウザで `/articles` を開くと、

- 初回ロードに **数秒以上** かかる
- スクロールしても終わらないほど縦に長い記事一覧
- サーバーターミナル側でも、レスポンスが返る時刻が遅いのが分かる

DevTools を開き **Network タブ** で `articles` のリクエストを選んでください。

- **Size**：数 MB 単位（HTML が巨大）
- **Time**：数秒（DB 読み出し + HTML 生成 + 転送）

これが「全件取得・全件描画」をやってしまったときの典型的な挙動です。

### TODO 2: 何が遅いか

該当箇所は [app/routes/articles.js](./app/routes/articles.js) の `app.get('/')` ハンドラです。

```js
const articles = db.prepare(`
  SELECT articles.*, users.name as author_name
  FROM articles
  JOIN users ON articles.author_id = users.id
  ORDER BY articles.created_at DESC
`).all();
```

ここで起きていることを層ごとに整理します。

- **DB**：`articles.*` には `body`（数百〜数千文字の Markdown 本文）も含まれる。1 行あたりの転送量がでかい上に、LIMIT が無いので **5000 行全部** SELECT する
- **メモリ / HTML 生成**：5000 行を `articles.map(...)` で全部 HTML 化。テンプレートエンジンの仕事も件数に比例して増える
- **ネット転送**：巨大な HTML をクライアントに送る。回線が遅ければ遅いほど効いてくる
- **ブラウザ描画**：5000 個の `<div class="article-card">` をパース・レイアウトする

**どの層も同じ理由で遅くなっています**：5000 行を取って・送って・描いている。逆に言えば、入口（DB クエリ）で **行数を絞れば** 後段の全ての層が同時に軽くなります。今回はここを `LIMIT` で攻めます。

### TODO 3: LIMIT/OFFSET でページネーション

クエリ文字列から `limit` と `offset` を受け取り、SQL に `LIMIT ? OFFSET ?` を足してバインドします。`01-environment/01-environment/app/routes/articles.js` の `app.get('/')` ハンドラに同じ要件で書かれた実装があるので、書き方に詰まったらそちらを参照してください。

要件は次のとおりです。

- クエリから `limit`（1〜100 の範囲、デフォルト 10）と `offset`（0 以上、デフォルト 0）を受け取る
- 不正な値（数値でない・範囲外）はデフォルトに丸める
- SQL に `LIMIT ? OFFSET ?` を足してバインドする
- 総件数を `SELECT COUNT(*) FROM articles` で取り、ページネーション UI（前へ／次へなど）に使う

修正後、`/articles` の初回ロードが **瞬時** に返るはずです。Network タブで Size と Time が桁違いに減ることを確認してください。

> **注意**：OFFSET ベースは深いページで `OFFSET 4990` のようになると、DB が前 4990 行を読み飛ばすので意外と遅くなります。後述の「OFFSET ページネーションの罠」を参照。

---

## 補足: もう一段の最適化「使わないカラムは取らない」

ページネーションで行数を 5000 → 10 に絞ると体感は十分速くなりますが、よく見ると **1 行あたりにも無駄が残っています**。

このレクチャーの一覧画面が表示しているのは `title` / `author_name` / `created_at` だけで、`body`（数百〜数千文字の Markdown 本文）は画面のどこにも出していません。それなのに `SELECT articles.*` だと **毎回 `body` も DB から読み・サーバへ転送し・JS のメモリに載せて・捨てている** ことになります。

そこで一覧用クエリを必要なカラムだけに絞ります。

```js
const articles = db.prepare(`
  SELECT articles.id, articles.title, articles.created_at, users.name as author_name
  FROM articles
  JOIN users ON articles.author_id = users.id
  ORDER BY articles.created_at DESC
  LIMIT ? OFFSET ?
`).all(limit, offset);
```

効くポイントは2つです。

- **転送量の削減** … 1 行あたりが小さくなる。本文が長い記事ほど効く（`body` が 5KB の記事を 10 件返せば、それだけで 50KB の節約）
- **DB 側の I/O 削減** … 多くの DB は大きいテキスト列をオーバーフローページに分けて持つので、不要な大カラムを SELECT しなければそのページを読まずに済む

**LIMIT による「行数」の最小化と、SELECT による「列数」の最小化は別軸の最適化** で、両方を組み合わせるのが理想です。今回のレクチャーでは、まず効果がわかりやすい行数のほうを本筋にしました。

## 補足: OFFSET ページネーションの罠

`OFFSET 10000 LIMIT 20` は、DB から見ると「先頭 10000 行をスキャン・スキップしてから 20 行返す」動きになります。深いページほど読み飛ばす行数が増えるため、**OFFSET が大きくなると線形に遅くなります**。

実用解は **Keyset Pagination**（カーソルベースとも呼ばれる）です。

- 前ページの最終行の `created_at` と `id` を覚えておく
- 次ページは `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT N`
- インデックスが効くので深いページでも速度が変わらない

ただし最後の「インデックスが効く」は **`(created_at, id)` の複合インデックスを実際に張ってある** ことが前提です。

```sql
CREATE INDEX articles_created_at_id ON articles(created_at DESC, id DESC);
```

このインデックスを張らないと、`ORDER BY created_at DESC` のためにテーブル全体を読んで並び替える羽目になり、Keyset にしてもその恩恵は受けられません。実は OFFSET 版の `ORDER BY created_at DESC` も同じインデックスがあった方が速くなるので、「並び替えのキーにはインデックスを張る」は一覧画面ではほぼ必須の作法と思っておくと安全です。

SNS のタイムラインや無限スクロールの裏では、ほぼこの Keyset 方式 + 並び替えキーのインデックスが使われています。

## 補足: フロントエンドの描画コスト

SSR（サーバーサイドレンダリング）でも、DOM ノード数が多ければブラウザ描画は重くなります。クエリを最適化しても 5000 件描けば結局カクつきます。

クライアント側で見える分だけ描く方法として **仮想スクロール（Virtual List / Windowing）** があります。クライアント JS が必須なのでこのレクチャーでは扱いませんが、解決策の候補として知っておくと良いです。

## 次の章へ

「取らない・送らない・描かない」で軽くするのが今回でした。次は `04-performance/03-cache` で、**キャッシュで応答時間そのものを短縮する** アプローチに進みます。同じ重さの処理でも、結果を覚えておけば 2 回目以降が劇的に速くなる、という別軸の最適化です。
