# AGENTS.md - プロジェクト方針

## プロジェクト概要

Node.js + SQLite で動く、Webアプリケーションのセキュリティ／パフォーマンス学習用ハンズオンリポジトリ。

勉強会参加者が1つのリポジトリをクローンし、各章のディレクトリに移動してアプリを起動し、問題のあるコードを見つけて修正する形式。

### 対象者

AIで Web アプリを作れるようになったが、コードの中身や安全性に不安がある初学者〜中級者。

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
- **全章 SSR 方式。** 参加者が読むコードはサーバー側のみ。フロントエンド JS は使わない
- **テンプレートは全章 `hono/html`** のタグ付きテンプレートリテラル。`${...}` は自動エスケープされる
- **XSS の章だけ：** 自動エスケープを `raw()` で意図的にバイパスして脆弱性を作る。「便利な抜け穴がそのまま XSS になる」ことを学ぶ教材
- 静的ファイル（CSS、画像）は `@hono/node-server/serve-static` で配信
- セッション管理が必要な章では Cookie ベースで自前実装（`app/middleware/session.js`）

### SQLite（better-sqlite3）の方針

- ORM は使わない。`better-sqlite3` で直接 SQL を書く
- 初学者が SQL の中身を理解しやすくするため
- SQL インジェクションの章では文字列連結／テンプレートリテラルで SQL を組み立てる問題コードを書き、修正時にプレースホルダ（`?` バインド）に置き換える
- DB 接続時に `journal_mode = WAL`、`foreign_keys = ON` を設定する

## ディレクトリ構成

```text
/README.md              リポジトリ全体の説明
/AGENTS.md              本ファイル（プロジェクト方針）
/TODO.md                各章の作成状況管理
/sections/
  01-environment/
    01-environment/
      package.json
      Dockerfile
      docker-compose.yml
      README.md         プロジェクト説明（起動方法・構成・問題のあるファイル）
      LECTURE.md        レクチャー（TODO / 学ぶこと / 説明）
      app/              アプリケーション本体
      scripts/          DB スクリプト（init.js, seed.js）
      data/             SQLite ファイル置き場（実行後に生成）
  02-injection/
    01-sqli/
    02-xss/
    03-command-injection/
  03-auth/
    01-no-authentication/
    02-weak-authentication/
    03-broken-authorization/
  04-performance/
    01-n-plus-one/
    02-large-data/
    03-cache/
```

各章の `app/` 配下は次の構成に統一する。

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

## 各章の共通ルール

### package.json のスクリプト

各章の **section root** に `package.json` を置く。

```json
{
  "name": "<chapter>",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch app/server.js",
    "database:init": "node scripts/init.js",
    "database:seed": "node scripts/seed.js"
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
- `scripts/seed.js` — シードデータ投入。冒頭で既存データを `DELETE` してから再投入し、何度実行しても同じ状態にする

### 起動方法（2通り）

**Docker の場合：**

```bash
docker compose up --build
```

`init → seed → server` の順に自動実行される。

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
CMD ["sh", "-c", "node scripts/init.js && node scripts/seed.js && node app/server.js"]
```

### .gitignore に含めるもの

- `node_modules/`
- `data/database.sqlite`, `data/database.sqlite-shm`, `data/database.sqlite-wal`

`data/.gitkeep` は残してディレクトリを保持する。

### 章の文書構成

各章は **README.md と LECTURE.md の2ファイル** に分ける。

#### README.md（プロジェクト説明）

「動かすために必要な情報」を簡潔にまとめる。

1. 章の概要（1〜2文）
2. 起動方法（Docker / ローカル両方）
3. アカウント（シードデータのログイン情報）
4. **この章で問題のあるファイル**（修正対象の表）
5. ディレクトリ構成（テンプレ参照で OK）
6. npm scripts 一覧

#### LECTURE.md（レクチャー）

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

- 各章には **あえて問題のあるコード** を含める（学習用）
- 問題は `app/routes/*.js` や `scripts/seed.js` など、参加者が読みそうなファイルに配置する
- 修正対象の箇所に `// TODO:` などのヒントコメントを入れない（学習者が自力で見つけられるようにするため）
- 問題のあるファイル一覧は各章の README、修正手順は LECTURE.md に書く

### セキュリティ上の注意

- コマンドインジェクションの章では、本物の危険なバイナリではなく **モック実装**（`bin/wkhtmltopdf` など）を使い、攻撃成立時の被害が限定されるようにする
- それでも `touch /tmp/PWNED` のような任意コマンド実行は再現するので、**Docker 内で動かすこと** を推奨する旨を README に書く

## アプリのドメイン

すべての章で **社内ナレッジ共有ツール** を題材にする。各章は同一ドメインの異なる機能・画面を扱い、章ごとに 01-environment をテンプレートとしてコピーしてから問題コードを仕込む形で作る。

### ドメインモデル（共通）

| モデル | カラム |
|---|---|
| User | id, name, email, password, role, created_at |
| Article | id, title, body, author_id, created_at |
| Comment | id, body, article_id, user_id, created_at |

各章で使うモデルはその章に必要なものだけでよい。

### 各章とドメインの対応

| 章 | 対象機能 | 主に使うモデル |
|---|---|---|
| 01-environment | 記事の CRUD・コメント・管理画面・ダッシュボード | Article, Comment, User |
| 02-injection/01-sqli | ログイン | User |
| 02-injection/02-xss | 記事へのコメント表示 | Article, Comment |
| 02-injection/03-command-injection | 記事の PDF エクスポート | Article |
| 03-auth/01-no-authentication | 管理画面（ユーザー管理） | User |
| 03-auth/02-weak-authentication | ログイン | User |
| 03-auth/03-broken-authorization | ユーザー詳細（プロフィール） | User |
| 04-performance/01-n-plus-one | ユーザー一覧と記事数 | User, Article |
| 04-performance/02-large-data | 記事一覧 | Article |
| 04-performance/03-cache | 集計ダッシュボード | User, Article, Comment |

## 各章の詳細仕様

### 01-environment（環境構築）

- ナレッジ共有ツールの完成形に近いベース実装。記事の CRUD、コメント、ユーザー、管理画面、ダッシュボードがすべて揃う
- **問題コードは含まない**。以降の章はこれをテンプレートにコピーして問題を仕込む
- Docker とローカル Node.js の両方で起動できる練習用

### 02-injection/01-sqli（SQL インジェクション）

- ナレッジ共有ツールのログイン画面
- **問題コード：** SQL を文字列連結（テンプレートリテラル）で組み立てている
- **課題：**
  - SQL インジェクションでログインを突破できることを確認（`' OR '1'='1' --`）
  - プレースホルダ（`?` バインド）を使って修正
- **スコープ外（意図的）：** パスワードハッシュ化はこの章では扱わない。`scripts/seed.js` のパスワードは平文のままだが、本章のテーマは SQLi に限定する（パスワード保存の問題は別章で扱う）。`app/lib/password.js` も置かない

### 02-injection/02-xss（XSS / Stored XSS）

- 記事へのコメント表示機能
- **問題コード：** 新着バッジ（`<span>[New]</span>`）を文字列結合（`+`）でコメント本文に prepend し、まとめて `raw()` で描画している。バッジを HTML として描画したいために `raw()` を使うことが、結果としてユーザー入力のエスケープも外してしまう典型的な失敗パターン
- **課題：**
  - `<script>` タグや `<img onerror>` で XSS が起きることを確認
  - 文字列結合をやめ、タグ付きテンプレート `` html`...` `` で構造ごと組み立てる形に修正（`<span>` はテンプレート内に直接書き、`comment.body` は `${...}` で渡してエスケープを効かせる）
  - 入力時のサニタイズより **出力時のエスケープ** が原則であることを理解
- **スコープ外（対策済み）：** 記事本文の `marked.parse()` + `raw()` も理屈上は XSS リスクがあるが、各章の `articles.js` 冒頭で `marked.use({ renderer: { html: () => '' } })` を設定して Markdown 内の生 HTML を無効化済み。本章では扱わない

### 02-injection/03-command-injection（コマンドインジェクション）

- 記事の PDF エクスポート機能
- **問題コード：** `child_process.exec` のコマンド文字列に **記事タイトル** をそのまま埋め込んでいる
- 本物の `wkhtmltopdf` は使わず、`bin/wkhtmltopdf` というモックシェルスクリプトを呼び出す（PDF っぽい体裁のテキストファイルを生成）
- **課題：**
  - タイトルに `; touch /tmp/PWNED` などを仕込んだ記事を作って攻撃が成立することを確認
  - `exec` ではなく `execFile` + 引数配列に置き換え
  - 根本対策として、ユーザー入力をファイル名・コマンド引数として使わない設計（`article-${id}.pdf` など）
  - 発展：そもそも外部プロセスを呼ばずライブラリ（`puppeteer`, `pdfkit` など）で代替する選択肢

### 03-auth/01-no-authentication（認証なし）

- ユーザー管理の管理画面
- **問題コード：** `/admin` に誰でもアクセスできる
- **課題：**
  - 未ログインで管理画面にアクセスできることを確認
  - ログイン状態を確認するミドルウェアを追加

### 03-auth/02-weak-authentication（不十分な認証）

- ナレッジ共有ツールのログイン機能
- **問題コード：** クライアント側の hidden 値や Cookie の値だけでログイン済み判定している
- **課題：**
  - Cookie を書き換えるだけでログインできることを確認
  - サーバー側セッションで認証状態を管理

### 03-auth/03-broken-authorization（不十分な認可）

- ユーザープロフィール詳細画面
- **問題コード：** ログインしていれば `/users/:id` で他人の情報を見られる
- **課題：**
  - 他人の ID を指定すると情報を見られることを確認
  - セッションの `userId` と `c.req.param('id')` を比較して修正
  - 管理者ロールの扱いも考える

### 04-performance/01-n-plus-one（N+1問題）

- ユーザー一覧と記事数の表示
- **問題コード：** ユーザー一覧取得後にループ内で記事数を1件ずつ取得
- **課題：**
  - SQL ログを見てクエリ数が多いことを確認
  - JOIN または GROUP BY で一括取得

### 04-performance/02-large-data（大量データ）

- 大量のナレッジ記事一覧を表示する画面
- **問題コード：** 全件取得して全件表示
- **課題：**
  - 件数が増えると遅くなることを確認
  - LIMIT/OFFSET でページングする
  - 必要なカラムだけ取得する

### 04-performance/03-cache（キャッシュ）

- ナレッジ共有ツールの集計ダッシュボード（記事数、コメント数、ユーザー数など）
- **問題コード：** 毎回同じ集計処理を実行
- **課題：**
  - 毎回遅いことを確認
  - メモリキャッシュを導入する
  - キャッシュの有効期限を設定する
  - キャッシュの注意点も LECTURE.md に書く
