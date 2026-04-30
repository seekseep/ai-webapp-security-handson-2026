# 04-01 - N+1 問題

ナレッジ共有ツールの **管理画面のユーザー一覧** に N+1 クエリの問題が仕込まれているサンプルアプリです。各ユーザーごとの投稿記事数を出すために、ユーザー数ぶんのクエリをループで発行しています。実際にどれだけの SQL が走っているかが分かるように、リクエスト単位でクエリ本数をログに出すロガーを同梱しています。

レクチャーの内容は [LECTURE.md](./LECTURE.md) を参照してください。

## 起動方法

### Docker の場合

```bash
docker compose up --build
```

### ローカル Node.js の場合

```bash
npm install
npm run database:init   # テーブル作成
npm run database:seed   # 初期データ投入
npm run dev             # 開発サーバー起動（ファイル変更で自動再起動）
```

ブラウザで http://localhost:3000 にアクセスしてください。

## アカウント

シードデータには以下のユーザーが含まれます。

| メールアドレス | パスワード | ロール |
|---|---|---|
| admin@example.com | admin123 | 管理者 |
| tanaka@example.com | password | 一般ユーザー |

## この章で問題のあるファイル

| ファイル | 問題 |
|---|---|
| `app/routes/admin.js` | ユーザー一覧取得後、ループで1件ずつ COUNT クエリを発行している |

## 教材として追加されているファイル

| ファイル | 役割 |
|---|---|
| `app/middleware/queryLogger.js` | リクエストごとに発行された SQL の本数を `[queries] METHOD path: N` の形でログ出力 |
| `app/db.js` | `db.prepare` をラップして、`get` / `run` / `all` / `iterate` 呼び出しごとにクエリ数を加算 |

## ディレクトリ構成・技術構成

[01-environment/01-environment/README.md](../../01-environment/01-environment/README.md) と同じ構成です。アプリ本体・スクリプト・データの配置はそちらを参照してください。

## npm scripts

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバーを起動（`node --watch` で自動再起動） |
| `npm run database:init` | テーブルを作成 |
| `npm run database:seed` | シードデータを投入（既存データは削除して再投入） |
