# 01 - 環境構築

ナレッジ共有ツールのアプリです。

記事の投稿・閲覧・コメント、ユーザー登録、管理画面、ダッシュボードを備えた SSR Web アプリで、Node.js + Hono + SQLite で動作します。

## 技術構成

| 分類 | 採用技術 | 用途 |
|---|---|---|
| 言語・ランタイム | Node.js（JavaScript ESM） | サーバーサイド実行環境 |
| Web フレームワーク | [Hono](https://hono.dev/) + [@hono/node-server](https://www.npmjs.com/package/@hono/node-server) | ルーティング・HTTP サーバー |
| テンプレート | `hono/html`（テンプレートリテラル） | サーバーサイドレンダリング |
| データベース | SQLite + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | ORM を使わず生 SQL を書く |
| Markdown | [marked](https://marked.js.org/) | 記事本文の HTML 変換 |
| スタイル | プレーン CSS | フロントエンド JS は使わない |
| 開発支援 | `node --watch` | ファイル変更時の自動再起動 |
| コンテナ | Docker / Docker Compose | 起動環境の統一 |

### 設計方針

- **SSR のみ**：フロントエンド JS は使わず、サーバーが HTML を組み立てる
- **ORM なし**：`better-sqlite3` でプレースホルダ（`?` バインド）を使った生 SQL
- **静的ファイルは CSS と画像のみ**：`/public` 以下を `serveStatic` で配信
- **セッション管理**：Cookie ベースのシンプルな実装（`app/middleware/session.js`）

## 起動方法

### Docker の場合

```bash
docker compose up --build
```

サーバーだけが立ち上がります。**初回起動時は別ターミナルでデータベースの初期化が必要です**。

```bash
docker compose exec app npm run database:init    # テーブル作成（初回のみ）
docker compose exec app npm run database:seed    # 初期データ投入（追記式・データがあればスキップ）
docker compose exec app npm run database:reset   # 全消し → シード再投入
```

DB ファイルはホスト側 `./data` に保存されるので、`docker compose down` してもデータは消えません。

### ローカル Node.js の場合

```bash
npm install
npm run database:init   # テーブル作成
npm run database:seed   # 初期データ投入
npm run dev             # 開発サーバー起動（ファイル変更で自動再起動）
```

ブラウザで http://localhost:3000 にアクセスしてください。

### アカウント

シードデータには以下のユーザーが含まれます（合計30人）。

| メールアドレス | パスワード | ロール |
|---|---|---|
| admin@example.com | admin123 | 管理者 |
| tanaka@example.com | password | 一般ユーザー |
| suzuki@example.com | password | 一般ユーザー |
| user1@example.com 〜 user27@example.com | password | 一般ユーザー |


## ディレクトリ構成

```
/
├── package.json
├── Dockerfile
├── docker-compose.yml
├── app/                    アプリケーション本体
│   ├── server.js           サーバー起動・ルート登録
│   ├── db.js               データベース接続
│   ├── middleware/
│   │   ├── session.js      セッション管理
│   │   └── auth.js         認証・認可ミドルウェア
│   ├── routes/
│   │   ├── articles.js     記事の一覧・作成・編集・削除・コメント
│   │   ├── auth.js         ログイン・新規登録・ログアウト
│   │   ├── admin.js        管理画面
│   │   ├── users.js        ユーザープロフィール
│   │   └── dashboard.js    ダッシュボード
│   ├── components/
│   │   └── layout.js       共通レイアウト
│   ├── lib/
│   │   └── password.js     パスワードのハッシュ化・検証
│   └── public/
│       └── style.css       スタイルシート
├── scripts/
│   ├── init.js             テーブル作成スクリプト
│   └── seed.js             シードデータ投入スクリプト
└── data/
    └── database.sqlite     SQLite データベース（実行後に生成）
```

## 機能一覧

- **記事一覧・投稿・編集・削除** — ログインすると記事を投稿できます
- **コメント** — 記事の詳細ページでコメントを投稿できます
- **ユーザープロフィール** — ユーザー名をクリックするとプロフィールが見られます
- **管理画面** — 管理者アカウントでログインすると、ヘッダーに「管理画面」リンクが表示されます
- **ダッシュボード** — 記事数・ユーザー数などの集計情報が見られます
- **新規登録・ログイン・ログアウト**

## npm scripts

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバーを起動（`node --watch` で自動再起動） |
| `npm run database:init` | テーブルを作成 |
| `npm run database:seed` | シードデータを投入（追記式・既にデータがあればスキップ） |
| `npm run database:reset` | 全データを削除してからシードを再投入 |
