# AI Webapp Security ハンズオン 2026

Web アプリケーションのセキュリティ／パフォーマンスを **手を動かして学ぶ** ハンズオンリポジトリです。

各レクチャーのディレクトリには **意図的に問題が仕込まれた** Web アプリが入っています。アプリを起動して問題を体験し、コードを読んで原因を見つけ、修正するまでが各レクチャーの流れです。

## 対象者

AI を使って Web アプリを作れるようにはなったが、生成されたコードの中身や安全性に不安がある初学者〜中級者。

## 用語：セクションとレクチャー

教材は2階層で整理しています。

- **セクション** — テーマで束ねた親ディレクトリ（`02-auth/`, `03-injection/`, `04-performance/` など）
- **レクチャー** — 1つのハンズオン単位＝1つの動くアプリ（`03-injection/01-sqli/` など）

学習者はレクチャー単位でディレクトリに移動し、その `LECTURE.md` に沿って手を動かします。

## 技術スタック

すべてのレクチャーは同じ最小スタックで動きます。

| 分類 | 採用技術 |
|---|---|
| 言語・ランタイム | Node.js（JavaScript ESM） |
| Web フレームワーク | [Hono](https://hono.dev/) + [@hono/node-server](https://www.npmjs.com/package/@hono/node-server) |
| テンプレート | `hono/html`（テンプレートリテラル） |
| データベース | SQLite + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)（ORM なし、生 SQL） |
| Markdown | [marked](https://marked.js.org/) |
| スタイル | プレーン CSS（フロントエンド JS は使わない） |
| 開発支援 | `node --watch` |
| コンテナ | Docker / Docker Compose |

すべてのレクチャーで **社内ナレッジ共有ツール** を題材にします。各レクチャーは同じドメインの異なる機能・画面を扱います。

## セクションとレクチャーの一覧

### 01-environment — 環境構築

| レクチャー | テーマ |
|---|---|
| [01-environment](./sections/01-environment/01-environment/) | 環境構築・全体像の把握 |

### 02-auth — 認証・認可

| レクチャー | テーマ |
|---|---|
| [01-no-authentication](./sections/02-auth/01-no-authentication/) | 認証なし |
| [02-weak-authentication](./sections/02-auth/02-weak-authentication/) | 不十分な認証 |
| [03-broken-authorization](./sections/02-auth/03-broken-authorization/) | 不十分な認可 |

### 03-injection — インジェクション

| レクチャー | テーマ |
|---|---|
| [01-sqli](./sections/03-injection/01-sqli/) | SQL インジェクション |
| [02-xss](./sections/03-injection/02-xss/) | XSS（Stored XSS） |
| [03-command-injection](./sections/03-injection/03-command-injection/) | コマンドインジェクション |

### 04-performance — パフォーマンス

| レクチャー | テーマ |
|---|---|
| [01-n-plus-one](./sections/04-performance/01-n-plus-one/) | N+1 問題 |
| [02-large-data](./sections/04-performance/02-large-data/) | 大量データ |
| [03-cache](./sections/04-performance/03-cache/) | キャッシュ |

各レクチャーの作成状況は [TODO.md](./TODO.md) で管理しています。

## 進め方

1. このリポジトリをクローン
2. 取り組むレクチャーのディレクトリ（例: `sections/01-environment/01-environment/`）に移動
3. そのレクチャーの **`README.md`** で起動方法・前提を確認
4. そのレクチャーの **`LECTURE.md`** に書かれている TODO を順番に進める
5. 終わったら次のレクチャーへ

各レクチャーは独立した npm プロジェクトとして動作します（`package.json` がレクチャーごとにあります）。

## 各レクチャーのディレクトリ構成（雛形）

すべてのレクチャーは以下の構成で統一されています。

```
sections/<section>/<lecture>/
├── package.json
├── Dockerfile
├── docker-compose.yml
├── README.md           プロジェクト説明（起動方法・構成）
├── LECTURE.md          レクチャー本文（TODO / 学ぶこと / 説明）
├── app/                アプリケーション本体
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   ├── middleware/
│   ├── components/
│   ├── lib/
│   └── public/
├── scripts/
│   ├── init.js         テーブル作成
│   └── seed.js         シードデータ投入
└── data/
    └── database.sqlite （実行後に生成）
```

## 共通の起動コマンド

各レクチャーのディレクトリに移動してから、以下のいずれかで起動します。

### Docker

```bash
docker compose up --build
```

サーバーだけが立ち上がります。**初回は別ターミナルでデータベースの初期化が必要です**。

```bash
docker compose exec app npm run database:init    # テーブル作成（初回のみ）
docker compose exec app npm run database:seed    # 初期データ投入（追記式・既にデータがあればスキップ）
docker compose exec app npm run database:reset   # 全消し → シード再投入
```

DB ファイルはホスト側 `./data` 配下に保存されるので、`docker compose down` してもデータは消えません。

### ローカル Node.js

```bash
npm install
npm run database:init   # テーブル作成
npm run database:seed   # 初期データ投入
npm run dev             # 開発サーバー起動
```

ブラウザで http://localhost:3000 を開いてください。

## スキーマを更新したとき（既存 DB を作り直す）

`scripts/init.js` は `CREATE TABLE IF NOT EXISTS` を使っているため、**既存の sqlite ファイルが残っているとテーブル定義の更新は反映されません**。`npm run database:reset` も行を消すだけで、テーブル定義自体は変えません。

リポジトリを更新してスキーマが変わったときは、各レクチャーの `data/database.sqlite*` を一度削除してから初期化をやり直してください。

```bash
# ローカル Node.js の場合
rm -f data/database.sqlite data/database.sqlite-shm data/database.sqlite-wal
npm run database:init
npm run database:seed
```

```bash
# Docker の場合
docker compose down
rm -f data/database.sqlite data/database.sqlite-shm data/database.sqlite-wal
docker compose up --build
docker compose exec app npm run database:init
docker compose exec app npm run database:seed
```

## ライセンス・注意事項

- 学習用リポジトリです。本番環境にデプロイしないでください
- 一部のレクチャーには **意図的にセキュリティ脆弱性** が含まれています
- 修正前のコードを実環境に流用するのは絶対に避けてください
