# 04-02 - 大量データ

記事一覧画面が **全件取得・全件描画** していて遅いサンプル。シードも 5000 件に増やしてある。

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
npm run database:seed   # 初期データ投入（5000 件のため数十秒〜程度かかります）
npm run dev             # 開発サーバー起動（ファイル変更で自動再起動）
```

ブラウザで http://localhost:3000 にアクセスしてください。

> **メモ**：シード件数を 5000 件に増やしているため、`npm run database:seed` の完了までに数十秒〜程度かかります。実行が止まっているように見えても、最後に件数ログが出るまで待ってください。

## アカウント

シードデータには以下のユーザーが含まれます。

| メールアドレス | パスワード | ロール |
|---|---|---|
| admin@example.com | admin123 | 管理者 |
| tanaka@example.com | password | 一般ユーザー |

## この章で問題のあるファイル

| ファイル | 問題 |
|---|---|
| `app/routes/articles.js` | 記事一覧で LIMIT/OFFSET なし、本文 `body` を含む全カラムを取得している |
| `scripts/seed.js` | 体感のために記事を 5000 件投入している（重さの前提） |

## ディレクトリ構成・技術構成

[01-environment/01-environment/README.md](../../01-environment/01-environment/README.md) と同じ構成です。アプリ本体・スクリプト・データの配置はそちらを参照してください。

## npm scripts

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバーを起動（`node --watch` で自動再起動） |
| `npm run database:init` | テーブルを作成 |
| `npm run database:seed` | シードデータを投入（既存データは削除して再投入。5000 件のため数十秒〜程度かかります） |
