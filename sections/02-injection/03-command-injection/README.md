# 02-03 - コマンドインジェクション

ナレッジ共有ツールの **記事 PDF エクスポート機能** にコマンドインジェクションの脆弱性が仕込まれているサンプルアプリです。攻撃を実際に成立させてから、コードを修正するまでがこの章の課題です。

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

ブラウザで http://localhost:3000 にアクセスし、記事詳細ページの **「PDF でダウンロード」** ボタンを試してください。

## アカウント

| メールアドレス | パスワード | ロール |
|---|---|---|
| admin@example.com | admin123 | 管理者 |
| tanaka@example.com | password | 一般ユーザー |

## この章で問題のあるファイル

| ファイル | 問題 |
|---|---|
| `app/routes/articles.js` | PDF エクスポート時、記事タイトルをシェルコマンドに直接埋め込んでいる |

修正箇所には `// TODO:` コメントを入れています。

## モック wkhtmltopdf

実際の `wkhtmltopdf` はインストールが重いので、`bin/wkhtmltopdf` に **モック版のシェルスクリプト** を置いています。本物の PDF を生成しているわけではなく、PDF 風のテキストファイルを書き出すだけです。コマンドインジェクションの挙動は実物と同じです。

## 攻撃の試し方

1. ログインして任意のユーザーで記事を新規作成
2. タイトルに次のような文字列を入れる:

   ```text
   レポート"; touch /tmp/PWNED; echo "
   ```

3. 投稿後、その記事の「PDF でダウンロード」ボタンをクリック
4. `/tmp/PWNED` が作成されていれば、シェルから任意のコマンドを実行できている証拠

## ディレクトリ構成・技術構成

[01-environment/README.md](../../01-environment/README.md) と同じ構成です（加えて `bin/wkhtmltopdf` というモックバイナリがあります）。

## npm scripts

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバーを起動（`node --watch` で自動再起動） |
| `npm run database:init` | テーブルを作成 |
| `npm run database:seed` | シードデータを投入（既存データは削除して再投入） |
