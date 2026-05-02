---
docs: true
title: ホストマシン（Node.js）で動かす
sidebar:
  label: ホストマシン
  order: 2
---

# ホストマシン（Node.js）で動かす

ホスト OS に直接 Node.js をインストールして開発サーバーを起動するパターンです。Docker を使わない場合に選びます。

## インストール

### インストール済みかの確認

```bash
node --version
npm --version
```

Node.js は **v20 以上** を推奨します（`better-sqlite3` のビルド要件のため）。

### インストール方法

**macOS（Homebrew を使う場合）**

```bash
brew install node
```

**バージョン管理ツールを使う場合（推奨）**

複数の Node.js バージョンを切り替えたい場合は [Volta](https://volta.sh/) や [nvm](https://github.com/nvm-sh/nvm) が便利です。

```bash
# Volta の例
curl https://get.volta.sh | bash
volta install node@20
```

**公式インストーラー（Windows / macOS）**

[nodejs.org](https://nodejs.org/) から LTS 版をダウンロードしてインストールしてください。

インストール後、再度 `node --version` で v20 以上が表示されることを確認してください。

## 起動方法

レクチャーのディレクトリ（例: `sections/03-injection/01-sqli/`）に移動してから、以下を実行します。起動後はブラウザで <http://localhost:3000> を開いてください。

### アプリケーションの起動

依存パッケージをインストールしてから開発サーバーを起動します。

```bash
npm install
npm run dev             # 開発サーバー起動（ファイル変更で自動再起動）
```

止めるときは `Ctrl+C` で停止します。

### データベースのセットアップ

初回のみ、テーブル作成とシードデータ投入が必要です。`npm run dev` の前後どちらで実行しても構いません。

```bash
npm run database:init   # テーブル作成
npm run database:seed   # 初期データ投入
```

スキーマの作り直しなどで全データを消したい場合は次のコマンドを使います。

```bash
npm run database:reset  # 全消し → シード再投入
```
