---
docs: true
title: Docker コンテナで動かす (推奨)
sidebar:
  label: Docker コンテナ
  order: 1
---

# Docker コンテナで動かす

Docker と Docker Compose だけ入れておけば、ホスト OS の Node.js のバージョン合わせなしでハンズオンを進められます。

## インストール

### インストール済みかの確認

ターミナルで以下を実行してバージョンが表示されればインストール済みです。

```bash
docker --version
docker compose version
```

`command not found` と表示された場合はインストールが必要です。

### インストール方法

**macOS / Windows**

[Docker Desktop](https://www.docker.com/products/docker-desktop/) をダウンロードしてインストールしてください。インストール後は Docker Desktop アプリを起動した状態にしておきます（メニューバー／タスクトレイに鯨のアイコンが出ていれば起動中）。

**macOS（Homebrew を使う場合）**

```bash
brew install --cask docker
```

**Linux**

公式手順を参照してください: <https://docs.docker.com/engine/install/>

インストール後、再度 `docker --version` と `docker compose version` が動くことを確認してください。

## 起動方法

レクチャーのディレクトリ（例: `sections/03-injection/01-sqli/`）に移動してから、以下を実行します。起動後はブラウザで <http://localhost:3000> を開いてください。

### アプリケーションの起動

```bash
docker compose watch
```

ビルド・起動・ファイル監視を 1 コマンドで行います。ファイル編集で自動再起動、`package.json` / `Dockerfile` 変更で自動再ビルド。停止は `Ctrl+C`、削除は `docker compose down`（DB は `./data` に残ります）。初回はこの後にデータベースのセットアップが必要です。

### データベースのセットアップ

`docker compose watch` を動かしたまま、**別のターミナル**を開いて以下を実行します。

```bash
docker compose exec app npm run database:init    # テーブル作成（初回のみ）
docker compose exec app npm run database:seed    # 初期データ投入（追記式・既にデータがあればスキップ）
```

スキーマの作り直しなどで全データを消したい場合は次のコマンドを使います。

```bash
docker compose exec app npm run database:reset   # 全消し → シード再投入
```
