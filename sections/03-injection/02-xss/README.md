# 02-02 - XSS（Stored XSS）

ナレッジ共有ツールの **コメント機能** に Stored XSS の脆弱性が仕込まれているサンプルアプリです。攻撃用のコメントを投稿してから、コードを修正するまでがこの章の課題です。

レクチャーの内容は [LECTURE.md](./LECTURE.md) を参照してください。

## 起動方法

### Docker の場合

```bash
docker compose watch
```

サーバーが起動し、`app/`・`scripts/` の変更を検知して自動でコンテナを再起動します。**初回起動時は別ターミナルでデータベースの初期化が必要です**。

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

## アカウント

| メールアドレス | パスワード | ロール |
|---|---|---|
| admin@example.com | admin123 | 管理者 |
| tanaka@example.com | password | 一般ユーザー |

## この章で問題のあるファイル

| ファイル | 問題 |
|---|---|
| `app/routes/articles.js` | 新着バッジ表示のために HTML を文字列結合し、ユーザー入力ごと `raw()` で描画している（Stored XSS） |

## ディレクトリ構成・技術構成

[01-environment/01-environment/README.md](../../01-environment/01-environment/README.md) と同じ構成です。アプリ本体・スクリプト・データの配置はそちらを参照してください。

## npm scripts

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバーを起動（`node --watch` で自動再起動） |
| `npm run database:init` | テーブルを作成 |
| `npm run database:seed` | シードデータを投入（追記式・既にデータがあればスキップ） |
| `npm run database:reset` | 全データを削除してからシードを再投入 |
