# AI Webapp Security ハンズオン 2026

Web アプリケーションのセキュリティ／パフォーマンスを **手を動かして学ぶ** ハンズオンリポジトリです。

各章のディレクトリには **意図的に問題が仕込まれた** Web アプリが入っています。アプリを起動して問題を体験し、コードを読んで原因を見つけ、修正するまでが各章の流れです。

## 対象者

AI を使って Web アプリを作れるようにはなったが、生成されたコードの中身や安全性に不安がある初学者〜中級者。

## 技術スタック

すべての章は同じ最小スタックで動きます。

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

すべての章で **社内ナレッジ共有ツール** を題材にします。各章は同じドメインの異なる機能・画面を扱います。

## 章の構成

| 章 | テーマ |
|---|---|
| [01-environment](./sections/01-environment/) | 環境構築・全体像の把握 |
| [02-injection/01-sqli](./sections/02-injection/01-sqli/) | SQL インジェクション |
| 02-injection/02-xss | XSS（Stored XSS） |
| 02-injection/03-command-injection | コマンドインジェクション |
| 03-auth/01-no-authentication | 認証なし |
| 03-auth/02-weak-authentication | 不十分な認証 |
| 03-auth/03-broken-authorization | 不十分な認可 |
| 04-performance/01-n-plus-one | N+1 問題 |
| 04-performance/02-large-data | 大量データ |
| 04-performance/03-cache | キャッシュ |

各章の作成状況は [TODO.md](./TODO.md) で管理しています。

## 進め方

1. このリポジトリをクローン
2. 各章のディレクトリ（例: `sections/01-environment/`）に移動
3. その章の **`README.md`** で起動方法・前提を確認
4. その章の **`LECTURE.md`** に書かれている TODO を順番に進める
5. 終わったら次の章へ

各章は独立した npm プロジェクトとして動作します（`package.json` が章ごとにあります）。

## 各章のディレクトリ構成（雛形）

すべての章は以下の構成で統一されています。

```
sections/<chapter>/
├── package.json
├── Dockerfile
├── docker-compose.yml
├── README.md           プロジェクト説明（起動方法・構成）
├── LECTURE.md          レクチャー（TODO / 学ぶこと / 説明）
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

各章のディレクトリに移動してから、以下のいずれかで起動します。

### Docker

```bash
docker compose up --build
```

### ローカル Node.js

```bash
npm install
npm run database:init   # テーブル作成
npm run database:seed   # 初期データ投入
npm run dev             # 開発サーバー起動
```

ブラウザで http://localhost:3000 を開いてください。

## ライセンス・注意事項

- 学習用リポジトリです。本番環境にデプロイしないでください
- 一部の章には **意図的にセキュリティ脆弱性** が含まれています
- 修正前のコードを実環境に流用するのは絶対に避けてください
