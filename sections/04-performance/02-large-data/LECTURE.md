# 04-02 - 大量データ

## TODO

1. シード投入後 `/articles` を開き、初回ロードに **数秒以上** かかること、画面いっぱいに記事が並ぶことを確認する。DevTools の Network タブで Response の **Size** と **Time** を見る
2. コードを読み、**何が遅さの原因か** を説明できるようにする
3. 修正する：
   - **3a**: `LIMIT ? OFFSET ?` を入れてページネーション UI を戻す（`01-environment` 版が参考）
   - **3b**: 一覧では `body` カラムが不要なので、`SELECT id, title, author_id, created_at` と必要なカラムだけ取る

## 学ぶこと

「件数が増えれば線形に遅くなる」が日常で起きるのは、大体この形です。最初は速かった画面が、データが溜まるにつれて気づかぬうちに重くなる、というパターンです。

この章で身につけたい観点は次の3つです。

- **遅さは複合**：DB の読み出し、ネット転送、HTML 生成、ブラウザ描画、どの層も件数に比例して重くなる
- **見えるものに必要なデータだけ取る**：行数の最小化（LIMIT/OFFSET）と、カラムの最小化（必要な列だけ SELECT）
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

**どの層も同じ理由で遅くなっています**：取りすぎ、送りすぎ、描きすぎ。逆に言えば、入口（DB クエリ）で件数とカラムを絞れば、後段の全ての層が軽くなります。

### TODO 3a: LIMIT/OFFSET でページネーション

`01-environment/01-environment/app/routes/articles.js` の `app.get('/')` ハンドラをそのまま参考にできます。ポイントだけ抜粋します。

- クエリから `limit`（1〜100、デフォルト 10）と `offset` を受け取る
- SQL に `LIMIT ? OFFSET ?` を足してバインドする
- 件数が必要なら `SELECT COUNT(*) FROM articles` を別クエリで取り、ページネーション UI に使う

修正後、`/articles` の初回ロードが **瞬時** に返るはずです。Network タブで Size と Time が桁違いに減ることを確認してください。

> **注意**：OFFSET ベースは深いページで `OFFSET 4990` のようになると、DB が前 4990 行を読み飛ばすので意外と遅くなります。後述の「OFFSET ページネーションの罠」を参照。

### TODO 3b: カラム最小化

一覧画面で表示しているのは `title`、`author_name`、`created_at` だけです。`body` は使っていません。

修正クエリ：

```js
const articles = db.prepare(`
  SELECT articles.id, articles.title, articles.created_at, users.name as author_name
  FROM articles
  JOIN users ON articles.author_id = users.id
  ORDER BY articles.created_at DESC
  LIMIT ? OFFSET ?
`).all(limit, offset);
```

`articles.*` を必要なカラムだけに絞ります。これだけでも 1 行あたりのサイズが大幅に減り、転送量と HTML サイズが軽くなります。LIMIT と組み合わせれば、1 ページ表示は確実に軽量です。

---

## 補足: OFFSET ページネーションの罠

`OFFSET 10000 LIMIT 20` は、DB から見ると「先頭 10000 行をスキャン・スキップしてから 20 行返す」動きになります。深いページほど読み飛ばす行数が増えるため、**OFFSET が大きくなると線形に遅くなります**。

実用解は **Keyset Pagination**（カーソルベースとも呼ばれる）です。

- 前ページの最終行の `created_at` と `id` を覚えておく
- 次ページは `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT N`
- インデックスが効くので深いページでも速度が変わらない

SNS のタイムラインや無限スクロールの裏では、ほぼこの方式が使われています。

## 補足: COUNT(*) も実は重い

ページネーション UI に総件数を出すために `SELECT COUNT(*) FROM articles` を打つことが多いですが、件数が多くなると **COUNT 自体がフルスキャン** になります。

本当に正確な件数が必要かは再考の余地があります。

- 「2000+ 件」のような曖昧表示にする
- 上位 10 ページ分だけページ番号を出して、それ以上は「次へ」だけにする
- 件数を別途キャッシュしておき、リアルタイム性は捨てる

## 補足: フロントエンドの描画コスト

SSR（サーバーサイドレンダリング）でも、DOM ノード数が多ければブラウザ描画は重くなります。クエリを最適化しても 5000 件描けば結局カクつきます。

クライアント側で見える分だけ描く方法として **仮想スクロール（Virtual List / Windowing）** があります。クライアント JS が必須なのでこのレクチャーでは扱いませんが、解決策の候補として知っておくと良いです。

## 次の章へ

「取らない・送らない・描かない」で軽くするのが今回でした。次は `04-performance/03-cache` で、**キャッシュで応答時間そのものを短縮する** アプローチに進みます。同じ重さの処理でも、結果を覚えておけば 2 回目以降が劇的に速くなる、という別軸の最適化です。
