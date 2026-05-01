# AGENTS.md - プロジェクト方針

## プロジェクト概要

Node.js + SQLite で動く、Webアプリケーションのセキュリティ／パフォーマンス学習用ハンズオンリポジトリ。

勉強会参加者が1つのリポジトリをクローンし、各レクチャーのディレクトリに移動してアプリを起動し、問題のあるコードを見つけて修正する形式。

### 対象者

AIで Web アプリを作れるようになったが、コードの中身や安全性に不安がある初学者〜中級者。

## 用語：セクションとレクチャー

このリポジトリは2階層の単位で教材を整理する。

| 用語 | 指すもの | 例 |
|---|---|---|
| **セクション** | テーマで束ねた親ディレクトリ（`sections/<section>/`） | `02-injection/`, `03-auth/`, `04-performance/` |
| **レクチャー** | 1つのハンズオン単位＝1つの動くアプリ（`sections/<section>/<lecture>/`） | `02-injection/01-sqli/`, `04-performance/03-cache/` |

- 1 セクションは 1 つ以上のレクチャーを持つ
- レクチャーは `README.md`（プロジェクト説明）と `LECTURE.md`（教材本文）の2文書を持つ
- 学習者はレクチャー単位で `cd` して動かし、その LECTURE.md に沿って手を動かす

## 技術スタック

- Node.js（JavaScript ESM）
- Hono（`@hono/node-server` で起動）
- `hono/html` のテンプレートリテラルで SSR（JSX や tsx は使わない）
- SQLite（better-sqlite3）— ORM は使わず直接 SQL を書く
- marked（記事本文の Markdown レンダリング）
- HTML / CSS（静的ファイルは CSS と画像のみ。フロントエンド JS は使わない）
- `node --watch` で自動再起動
- Docker / Docker Compose
- npm

### Hono の方針

- `@hono/node-server` で Node.js 上に HTTP サーバーを立てる
- **全レクチャー SSR 方式。** 参加者が読むコードはサーバー側のみ。フロントエンド JS は使わない
- **テンプレートは全レクチャー `hono/html`** のタグ付きテンプレートリテラル。`${...}` は自動エスケープされる
- **XSS のレクチャーだけ：** 自動エスケープを `raw()` で意図的にバイパスして脆弱性を作る。「便利な抜け穴がそのまま XSS になる」ことを学ぶ教材
- 静的ファイル（CSS、画像）は `@hono/node-server/serve-static` で配信
- セッション管理が必要なレクチャーでは Cookie ベースで自前実装（`app/middleware/session.js`）

### SQLite（better-sqlite3）の方針

- ORM は使わない。`better-sqlite3` で直接 SQL を書く
- 初学者が SQL の中身を理解しやすくするため
- SQL インジェクションのレクチャーでは文字列連結／テンプレートリテラルで SQL を組み立てる問題コードを書き、修正時にプレースホルダ（`?` バインド）に置き換える
- DB 接続時に `journal_mode = WAL`、`foreign_keys = ON` を設定する

## ディレクトリ構成

```text
/README.md              リポジトリ全体の説明
/AGENTS.md              本ファイル（プロジェクト方針）
/TODO.md                各レクチャーの作成状況管理
/sections/              セクション群
  01-environment/       セクション
    01-environment/     レクチャー
      package.json
      Dockerfile
      docker-compose.yml
      README.md         プロジェクト説明（起動方法・構成・問題のあるファイル）
      LECTURE.md        レクチャー本文（TODO / 学ぶこと / 説明）
      app/              アプリケーション本体
      scripts/          DB スクリプト（init.js, seed.js）
      data/             SQLite ファイル置き場（実行後に生成）
  02-injection/         セクション
    01-sqli/            レクチャー
    02-xss/             レクチャー
    03-command-injection/
  03-auth/              セクション
    01-no-authentication/
    02-weak-authentication/
    03-broken-authorization/
  04-performance/       セクション
    01-n-plus-one/
    02-large-data/
    03-cache/
```

各レクチャーの `app/` 配下は次の構成に統一する。

```text
app/
  server.js             サーバー起動・ルート登録
  db.js                 better-sqlite3 接続
  routes/               ルートごとのエンドポイント定義
  middleware/           session.js, auth.js
  components/           layout.js（共通レイアウト）
  lib/                  password.js などのユーティリティ
  public/               静的ファイル（CSS、画像）
```

## 各レクチャーの共通ルール

### package.json のスクリプト

各レクチャーの **root** に `package.json` を置く。

```json
{
  "name": "<lecture>",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch app/server.js",
    "database:init": "node scripts/init.js",
    "database:seed": "node scripts/seed.js",
    "database:reset": "node scripts/reset.js && node scripts/seed.js"
  },
  "dependencies": {
    "@hono/node-server": "^1.14.0",
    "better-sqlite3": "^11.8.0",
    "hono": "^4.7.0",
    "marked": "^18.0.2"
  }
}
```

### scripts/ の責務分離

- `scripts/init.js` — テーブル定義（`CREATE TABLE IF NOT EXISTS`）のみ
- `scripts/seed.js` — シードデータ投入。**冒頭で `users` テーブルの行数をチェックし、すでにデータがあればスキップ** する（追記式・非破壊）。空のときだけ初期データを INSERT
- `scripts/reset.js` — 全テーブルの `DELETE` と `sqlite_sequence` のリセットだけを行う。投入はしない
- 「全消ししてシードを入れ直す」フローは `npm run database:reset`（= `reset.js` → `seed.js`）でまとめて行う

### 起動方法（2通り）

**Docker の場合：**

```bash
docker compose up --build
```

サーバーだけが起動する（init / seed は **自動実行されない**）。**初回起動時** または DB を作り直したいときは、別ターミナルで以下を実行する。

```bash
docker compose exec app npm run database:init   # テーブル作成（初回のみ）
docker compose exec app npm run database:seed   # 初期データ投入（追記式）
docker compose exec app npm run database:reset  # 全消ししてシード再投入
```

DB ファイルはホスト側 `./data` に bind-mount されているので、`docker compose down` してもデータは消えない。

**ローカル Node.js の場合：**

```bash
npm install
npm run database:init
npm run database:seed
npm run dev
```

すべてのアプリは `http://localhost:3000` で起動する。

### docker-compose.yml の共通パターン

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_PATH=/workspace/data/database.sqlite
    volumes:
      - ./app:/workspace/app
      - ./scripts:/workspace/scripts
      - ./data:/workspace/data
      - /workspace/node_modules
```

### Dockerfile の共通パターン

```dockerfile
FROM node:24-slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY package*.json ./
RUN npm install
COPY app ./app
COPY scripts ./scripts
CMD ["node", "--watch", "app/server.js"]
```

`init` と `seed` は CMD に含めない。**コンテナ起動時にデータを毎回ゼロから作り直さない** ため。学習者が `docker compose exec app npm run database:init / :seed / :reset` を能動的に叩く運用にする。

### .gitignore に含めるもの

- `node_modules/`
- `data/database.sqlite`, `data/database.sqlite-shm`, `data/database.sqlite-wal`

`data/.gitkeep` は残してディレクトリを保持する。

### レクチャーの文書構成

各レクチャーは **README.md と LECTURE.md の2ファイル** に分ける。

#### README.md（プロジェクト説明）

「動かすために必要な情報」を簡潔にまとめる。

1. レクチャーの概要（1〜2文）
2. 起動方法（Docker / ローカル両方）
3. アカウント（シードデータのログイン情報）
4. **このレクチャーで問題のあるファイル**（修正対象の表）
5. ディレクトリ構成（テンプレ参照で OK）
6. npm scripts 一覧

#### LECTURE.md（レクチャー本文）

学習者が順番に進める教材。次の3セクション構成で書く。

1. **TODO** — 番号付きの到達目標。`TODO 1`, `TODO 2` ... と説明側と対応させる
2. **学ぶこと** — TODO の目的（なぜそれをするのか）と、身につけたい観点
3. **説明** — TODO ごとに `### TODO N: ...` の見出しで手順を詳述

> 学習者は **目標 → 目的 → 方法** の順で読む。TODO を最初に提示することで「何を達成するか」を意識して読み進められる。

### コーディングルール

- JavaScript（ESM）で書く（TypeScript は使わない）
- 1ファイルが大きくなりすぎないようにする
- 変数名・関数名は分かりやすく
- コメントは「なぜ」を書く。「何をしているか」はコードを見れば分かる

### 問題コードの扱い

- 各レクチャーには **あえて問題のあるコード** を含める（学習用）
- 問題は `app/routes/*.js` や `scripts/seed.js` など、参加者が読みそうなファイルに配置する
- 修正対象の箇所に `// TODO:` などのヒントコメントを入れない（学習者が自力で見つけられるようにするため）
- 問題のあるファイル一覧は各レクチャーの README、修正手順は LECTURE.md に書く

### セキュリティ上の注意

- コマンドインジェクションのレクチャーでは、本物の危険なバイナリではなく **モック実装**（`bin/wkhtmltopdf` など）を使い、攻撃成立時の被害が限定されるようにする
- それでも `touch /tmp/PWNED` のような任意コマンド実行は再現するので、**Docker 内で動かすこと** を推奨する旨を README に書く

## アプリのドメイン

すべてのレクチャーで **社内ナレッジ共有ツール** を題材にする。各レクチャーは同一ドメインの異なる機能・画面を扱い、レクチャーごとに `01-environment/01-environment` をテンプレートとしてコピーしてから問題コードを仕込む形で作る。

### ドメインモデル（共通）

| モデル | カラム |
|---|---|
| User | id, name, email, password, role, created_at |
| Article | id, title, body, author_id, created_at |
| Comment | id, body, article_id, user_id, created_at |

各レクチャーで使うモデルはそのレクチャーに必要なものだけでよい。

### 各レクチャーとドメインの対応

| セクション | レクチャー | 対象機能 | 主に使うモデル |
|---|---|---|---|
| 01-environment | 01-environment | 記事の CRUD・コメント・管理画面・ダッシュボード | Article, Comment, User |
| 02-injection | 01-sqli | ログイン | User |
| 02-injection | 02-xss | 記事へのコメント表示 | Article, Comment |
| 02-injection | 03-command-injection | 記事の PDF エクスポート | Article |
| 03-auth | 01-no-authentication | 管理画面（ユーザー管理） | User |
| 03-auth | 02-weak-authentication | ログイン | User |
| 03-auth | 03-broken-authorization | ユーザー詳細（プロフィール） | User |
| 04-performance | 01-n-plus-one | ユーザー一覧と記事数 | User, Article |
| 04-performance | 02-large-data | 記事一覧 | Article |
| 04-performance | 03-cache | 集計ダッシュボード | User, Article, Comment |

## 各レクチャーの詳細仕様

### 01-environment / 01-environment（環境構築）

- ナレッジ共有ツールの完成形に近いベース実装。記事の CRUD、コメント、ユーザー、管理画面、ダッシュボードがすべて揃う
- **問題コードは含まない**。以降のレクチャーはこれをテンプレートにコピーして問題を仕込む
- Docker とローカル Node.js の両方で起動できる練習用

### 02-injection / 01-sqli（SQL インジェクション）

- ナレッジ共有ツールのログイン画面
- **問題コード：** SQL を文字列連結（テンプレートリテラル）で組み立てている
- **課題：**
  - SQL インジェクションでログインを突破できることを確認（`' OR '1'='1' --`）
  - プレースホルダ（`?` バインド）を使って修正
- **スコープ外（意図的）：** パスワードハッシュ化はこのレクチャーでは扱わない。`scripts/seed.js` のパスワードは平文のままだが、本レクチャーのテーマは SQLi に限定する（パスワード保存の問題は別レクチャーで扱う）。`app/lib/password.js` も置かない

### 02-injection / 02-xss（XSS / Stored XSS）

- 記事へのコメント表示機能
- **問題コード：** 新着バッジ（`<span>[New]</span>`）を文字列結合（`+`）でコメント本文に prepend し、まとめて `raw()` で描画している。バッジを HTML として描画したいために `raw()` を使うことが、結果としてユーザー入力のエスケープも外してしまう典型的な失敗パターン
- **課題：**
  - `<script>` タグや `<img onerror>` で XSS が起きることを確認
  - 文字列結合をやめ、タグ付きテンプレート `` html`...` `` で構造ごと組み立てる形に修正（`<span>` はテンプレート内に直接書き、`comment.body` は `${...}` で渡してエスケープを効かせる）
  - 入力時のサニタイズより **出力時のエスケープ** が原則であることを理解
- **スコープ外（対策済み）：** 記事本文の `marked.parse()` + `raw()` も理屈上は XSS リスクがあるが、各レクチャーの `articles.js` 冒頭で `marked.use({ renderer: { html: () => '' } })` を設定して Markdown 内の生 HTML を無効化済み。本レクチャーでは扱わない

### 02-injection / 03-command-injection（コマンドインジェクション）

- 記事の PDF エクスポート機能
- **問題コード：** `child_process.exec` のコマンド文字列に **記事タイトル** をそのまま埋め込んでいる
- 本物の `wkhtmltopdf` は使わず、`bin/wkhtmltopdf` というモックシェルスクリプトを呼び出す（PDF っぽい体裁のテキストファイルを生成）
- **課題：**
  - タイトルに `; touch /tmp/PWNED` などを仕込んだ記事を作って攻撃が成立することを確認
  - `exec` ではなく `execFile` + 引数配列に置き換え
  - 根本対策として、ユーザー入力をファイル名・コマンド引数として使わない設計（`article-${id}.pdf` など）
  - 発展：そもそも外部プロセスを呼ばずライブラリ（`puppeteer`, `pdfkit` など）で代替する選択肢

### 03-auth / 01-no-authentication（認証なし）

- ユーザー管理の管理画面
- **問題コード：** `app/routes/admin.js` 冒頭の `app.use('*', requireAdmin())` を **削除した状態** にしている。`requireAdmin` の import 行も外す
- **課題：**
  - 未ログインのまま `/admin` を開くと、ユーザー一覧と削除ボタンがそのまま見えてしまうことを確認（一般ユーザーでログインしても同じ）
  - `requireAdmin()` を再度差し込んで、未ログイン／一般ユーザーで `/auth/login` または `/` にリダイレクトされることを確認
- **学習ポイント：** 「ミドルウェアを当て忘れる」だけで管理機能が完全公開されることを体感する。`requireAuth` と `requireAdmin` の違い、`app.use('*', ...)` でまとめて当てる場合と `app.get(..., requireAdmin(), handler)` で個別に当てる場合の使い分けも触れる

### 03-auth / 02-weak-authentication（不十分な認証）

- ナレッジ共有ツールのログイン機能
- **問題コード：** ログイン状態を **クライアント Cookie の `user_id` 値だけ** で判定している。サーバー側セッションストアは使わない
  - `app/middleware/session.js` を「`getCookie(c, 'user_id')` を読み、数値ならそのユーザーを `c.set('user', ...)` する」だけのバージョンに差し替え
  - `app/middleware/auth.js` の `currentUser` も上記に合わせて簡略化（`requireAuth` / `requireAdmin` は残す）
  - `app/routes/auth.js` のログイン成功時に `setCookie(c, 'user_id', String(user.id), { path: '/' })` を発行する（`httpOnly` は **わざと外す**）
  - ログアウトは `deleteCookie(c, 'user_id')`
- **攻撃：** DevTools の Application タブで `user_id` Cookie を `1` に書き換えるだけで管理者になれる
- **課題：**
  - Cookie を書き換えるだけでログイン状態が乗っ取れることを確認
  - サーバーサイド Map のセッションストア（`session_id` ランダム UUID + `httpOnly` Cookie）に戻して、クライアントが書き換えても化けられないことを確認
- **学習ポイント：** `httpOnly` だけでは不十分（XSS で盗めなくなるが「サーバーが値を信じてしまう問題」とは別）／JWT・署名 Cookie・サーバー側セッション ID の違い／署名なし Cookie をログイン状態に使うと認証バイパスと CSRF の両方の入り口になる

### 03-auth / 03-broken-authorization（不十分な認可）

- ユーザープロフィール詳細画面
- **問題コード：** `app/routes/users.js` で `requireAuth` は使っているがリソース所有チェックがない。さらに SQL で `password` カラムまで SELECT し、表示 HTML に「メール」「内部 ID」「パスワードハッシュ（先頭16文字）」を出してしまっている
- **攻撃：** 一般ユーザーでログインしたあと `/users/1`（admin）や `/users/3` などを開くと、他人のメール・パスワードハッシュまで取得できる
- **課題：**
  - URL の `:id` を変えるだけで他人のセンシティブ情報が見えることを確認
  - 修正案①：自分のプロフィール以外は `name` と公開済み情報だけに絞る
  - 修正案②：`session.userId === Number(id) || user.role === 'admin'` で表示内容を分岐
  - **必要のないカラムを SELECT しない**（`password` を SQL の段階で取らない）＝最小権限
- **学習ポイント：** 認証（authentication）と認可（authorization）の区別。**水平権限**（同役割の他ユーザー）と **垂直権限**（一般 vs 管理者）の違い。OWASP「Broken Access Control」が連年トップに来る理由

### 04-performance / 01-n-plus-one（N+1 問題）

- 管理画面のユーザー一覧に「投稿記事数」列を追加した状態
- **問題コード：** ユーザー一覧取得後に **ループで各ユーザー分の COUNT クエリ** を発行している
  ```js
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id').all();
  for (const u of users) {
    u.article_count = db.prepare('SELECT COUNT(*) as c FROM articles WHERE author_id = ?').get(u.id).c;
  }
  ```
- **追加要素：** クエリ発行回数を可視化するため、`app/db.js` の `db.prepare` 呼び出しをラップして回数をカウントし、リクエスト前後で差分をログに出すミドルウェア（`app/middleware/queryLogger.js`）を追加。`/admin` を開くと `[queries] /admin: 31` のように出力される
- **課題：**
  - SQL ログを見てクエリ数が 30+1=31 本飛んでいることを確認
  - `LEFT JOIN articles ... GROUP BY users.id` でクエリ 1 本に集約 → ログが 2 本（ユーザー一覧 1 + 自身の COUNT 1 程度）まで縮むことを確認
- **学習ポイント：** N+1 は ORM を使っていても起きる（lazy load）／検出方法（DB スロークエリログ・APM・開発時のクエリログミドルウェア）／バルクロード（DataLoader 的）で塞ぐ別解

### 04-performance / 02-large-data（大量データ）

- 大量のナレッジ記事一覧を表示する画面
- **問題コード：** `app/routes/articles.js` の記事一覧ハンドラから **LIMIT/OFFSET と関連 UI を削除** した状態。`SELECT articles.*, users.name as author_name FROM articles JOIN users ON articles.author_id = users.id ORDER BY articles.created_at DESC` で全件取得し、全件 `${articles.map(...)}` で描画
- **シード：** このレクチャー固有で `scripts/seed.js` の記事生成ループを **5000 件** に増やしている（他レクチャーには影響なし）
- **観測：** `/articles` の初回ロードが数秒〜数十秒、レスポンスサイズも数 MB
- **課題：**
  - 一覧画面が重く、ブラウザのスクロールも辛いことを確認
  - `LIMIT ? OFFSET ?` を入れ、ページネーション UI を戻す（`01-environment` の articles.js を見て同じ形に）
  - 一覧では `body` が不要なので `SELECT id, title, author_id, created_at` に絞る（必要なカラムだけ取る）
- **学習ポイント：** OFFSET ページネーションの罠（OFFSET が大きいほど遅い、Keyset Pagination の紹介）／無限スクロールとの違い／`COUNT(*)` も重い場合があるので分けて取る

### 04-performance / 03-cache（キャッシュ）

- ナレッジ共有ツールの集計ダッシュボード（記事数、コメント数、ユーザー数、上位コメント記事など）
- **問題コード：** `app/routes/dashboard.js` に重い集計クエリを追加した状態。例えば `SELECT a.id, a.title, COUNT(DISTINCT c.user_id) as commenters FROM articles a LEFT JOIN comments c ON c.article_id = a.id GROUP BY a.id ORDER BY commenters DESC LIMIT 10` 系を 3 本並べる、もしくは教材として確実に体感させるため `await new Promise(r => setTimeout(r, 800))` を 1 か所挟む
- **計測：** ハンドラの先頭で `const t0 = Date.now()`、末尾で `console.log('[dashboard] ${Date.now() - t0}ms')` を出す
- **課題：**
  - `/dashboard` を連続で開くと毎回 700〜1000ms かかることを確認
  - `app/lib/cache.js` を新規作成（`Map` ベースの簡易キャッシュ：`get(key)` / `set(key, value, ttlMs)` / `clear()` / `getOrLoad(key, ttlMs, loader)`）
  - ダッシュボードを TTL 30 秒のキャッシュで包み、2 回目以降が10ms 未満になることを確認
- **学習ポイント：** キャッシュの3大難所 — (1) 無効化（書き込み時にどう壊すか）、(2) データ整合性（古いデータが見える期間）、(3) thundering herd（同時 TTL 切れで全員が DB 直撃）。インメモリ Map と本番の Redis/Memcached の違い、CDN/HTTP キャッシュ層との住み分け
