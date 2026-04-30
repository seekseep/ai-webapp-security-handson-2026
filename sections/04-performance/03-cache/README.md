# 04-03 - キャッシュ

集計ダッシュボードが毎回同じ重い処理を実行しているサンプルアプリです。アプリ層のメモリキャッシュを導入して直すまでがこの章の課題です。

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
| `app/routes/dashboard.js` | 5 本の集計クエリ + 800ms 相当の待ちが毎リクエスト走る |

メモ：本レクチャーでの修正手順では `app/lib/cache.js` を **新規作成** する。本リポジトリにはまだ存在しない。

## ディレクトリ構成・技術構成

[01-environment/01-environment/README.md](../../01-environment/01-environment/README.md) と同じ構成です。アプリ本体・スクリプト・データの配置はそちらを参照してください。

## npm scripts

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバーを起動（`node --watch` で自動再起動） |
| `npm run database:init` | テーブルを作成 |
| `npm run database:seed` | シードデータを投入（既存データは削除して再投入） |
