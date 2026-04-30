# 03-01 - 認証なし

ナレッジ共有ツールの **管理画面 (`/admin`)** に認証ミドルウェアが当たっておらず、ログインしていなくてもユーザー一覧の閲覧やユーザー削除ができてしまうサンプルアプリです。脆弱性を体験してから、コードを修正するまでがこの章の課題です。

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
| `app/routes/admin.js` | 管理画面に認証ミドルウェアが当たっていない |

## ディレクトリ構成・技術構成

[01-environment/01-environment/README.md](../../01-environment/01-environment/README.md) と同じ構成です。アプリ本体・スクリプト・データの配置はそちらを参照してください。

## npm scripts

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバーを起動（`node --watch` で自動再起動） |
| `npm run database:init` | テーブルを作成 |
| `npm run database:seed` | シードデータを投入（既存データは削除して再投入） |
