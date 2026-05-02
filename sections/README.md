---
docs: true
title: はじめに
sidebar:
  label: はじめに
  order: 0
---

# はじめに

このディレクトリには、ハンズオン教材のすべてのセクションとレクチャーが入っています。

教材は2階層で整理されています。

- **セクション** — テーマで束ねた親ディレクトリ（`02-auth/`, `03-injection/`, `04-performance/` など）
- **レクチャー** — 1つのハンズオン単位＝1つの動くアプリ（`03-injection/01-sqli/` など）

学習者はレクチャー単位でディレクトリに移動し、その `LECTURE.md` に沿って手を動かします。

## 一覧

### 環境構築

- [環境構築](./01-environment/LECTURE.md)

### 認証・認可

- [認証なし](./02-auth/01-no-authentication/LECTURE.md)
- [不十分な認証](./02-auth/02-weak-authentication/LECTURE.md)
- [不十分な認可](./02-auth/03-broken-authorization/LECTURE.md)

### インジェクション

- [SQL インジェクション](./03-injection/01-sqli/LECTURE.md)
- [XSS（Stored XSS）](./03-injection/02-xss/LECTURE.md)
- [コマンドインジェクション](./03-injection/03-command-injection/LECTURE.md)

### パフォーマンス

- [N+1 問題](./04-performance/01-n-plus-one/LECTURE.md)
- [大量データ](./04-performance/02-large-data/LECTURE.md)
- [キャッシュ](./04-performance/03-cache/LECTURE.md)

## 技術スタック

すべてのレクチャーは同じ最小スタックで動きます。

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

すべてのレクチャーで **社内ナレッジ共有ツール** を題材にします。各レクチャーは同じドメインの異なる機能・画面を扱います。

## 進め方

1. このリポジトリをクローン
2. 取り組むレクチャーのディレクトリ（例: `sections/01-environment/01-environment/`）に移動
3. そのレクチャーの **`README.md`** で起動方法・前提を確認
4. そのレクチャーの **`LECTURE.md`** に書かれている TODO を順番に進める
5. 終わったら次のレクチャーへ

各レクチャーは独立した npm プロジェクトとして動作します（`package.json` がレクチャーごとにあります）。

## 各レクチャーのディレクトリ構成（雛形）

すべてのレクチャーは以下の構成で統一されています。

```
sections/<section>/<lecture>/
├── package.json
├── Dockerfile
├── docker-compose.yml
├── README.md           プロジェクト説明（起動方法・構成）
├── LECTURE.md          レクチャー本文（TODO / 学ぶこと / 説明）
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

---

すべてのレクチャーは同じ npm scripts で動きます。起動方法は **Docker** と **ローカル Node.js** の2通りがあり、どちらか一方が動けば学習を進められます。

以下の手順は、**取り組むレクチャーのディレクトリに移動した状態**（例: `cd sections/03-injection/01-sqli`）で実行する前提で書いています。

## 環境構築

Docker かローカル Node.js のどちらかを選んでセットアップしてください。両方を入れる必要はありません。

### Docker

#### インストール済みかの確認

ターミナルで以下を実行してバージョンが表示されればインストール済みです。

```bash
docker --version
docker compose version
```

`command not found` と表示された場合はインストールが必要です。

#### インストール方法

**macOS / Windows**

[Docker Desktop](https://www.docker.com/products/docker-desktop/) をダウンロードしてインストールしてください。インストール後は Docker Desktop アプリを起動した状態にしておきます（メニューバー／タスクトレイに鯨のアイコンが出ていれば起動中）。

**macOS（Homebrew を使う場合）**

```bash
brew install --cask docker
```

**Linux**

公式手順を参照してください: <https://docs.docker.com/engine/install/>

インストール後、再度 `docker --version` と `docker compose version` が動くことを確認してください。

### Node.js

#### インストール済みかの確認

```bash
node --version
npm --version
```

Node.js は **v20 以上** を推奨します（`better-sqlite3` のビルド要件のため）。

#### インストール方法

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

レクチャーのディレクトリ（例: `sections/03-injection/01-sqli/`）に移動してから、Docker かローカル Node.js のどちらかで起動します。

起動後はブラウザで <http://localhost:3000> を開いてください。

### Docker

#### アプリケーションの起動

```bash
docker compose watch
```

`docker compose watch` はビルド・起動・ファイル監視を 1 コマンドでこなします。`app/`・`scripts/` を編集すると自動でコンテナを再起動し、`package.json`・`Dockerfile` を変更したときは自動で再ビルドします。初回はこのあとデータベースのセットアップが必要です。

> Mac の Docker Desktop ではホストの fs イベントがコンテナの inotify に伝わらず、bind mount + `node --watch` だけでは再起動が走らないことがあります。Compose Watch はホスト側で変更を検知してコンテナへ同期＋再起動するので、この問題を避けられます。

止めるときは `Ctrl+C`、コンテナごと削除したいときは `docker compose down` を使います。DB ファイルはホスト側 `./data` 配下に保存されるので、`docker compose down` してもデータは消えません。

#### データベースのセットアップ

`docker compose watch` を動かしたまま、**別のターミナル**を開いて以下を実行します。

```bash
docker compose exec app npm run database:init    # テーブル作成（初回のみ）
docker compose exec app npm run database:seed    # 初期データ投入（追記式・既にデータがあればスキップ）
```

スキーマの作り直しなどで全データを消したい場合は次のコマンドを使います。

```bash
docker compose exec app npm run database:reset   # 全消し → シード再投入
```

### ローカル Node.js

#### アプリケーションの起動

依存パッケージをインストールしてから開発サーバーを起動します。

```bash
npm install
npm run dev             # 開発サーバー起動（ファイル変更で自動再起動）
```

止めるときは `Ctrl+C` で停止します。

#### データベースのセットアップ

初回のみ、テーブル作成とシードデータ投入が必要です。`npm run dev` の前後どちらで実行しても構いません。

```bash
npm run database:init   # テーブル作成
npm run database:seed   # 初期データ投入
```

スキーマの作り直しなどで全データを消したい場合は次のコマンドを使います。

```bash
npm run database:reset  # 全消し → シード再投入
```

## スキーマを更新したとき（既存 DB を作り直す）

`scripts/init.js` は `CREATE TABLE IF NOT EXISTS` を使っているため、**既存の sqlite ファイルが残っているとテーブル定義の更新は反映されません**。`npm run database:reset` も行を消すだけで、テーブル定義自体は変えません。

リポジトリを更新してスキーマが変わったときは、各レクチャーの `data/database.sqlite*` を一度削除してから初期化をやり直してください。

```bash
# ローカル Node.js の場合
rm -f data/database.sqlite data/database.sqlite-shm data/database.sqlite-wal
npm run database:init
npm run database:seed
```

```bash
# Docker の場合
docker compose down
rm -f data/database.sqlite data/database.sqlite-shm data/database.sqlite-wal
docker compose watch
docker compose exec app npm run database:init
docker compose exec app npm run database:seed
```
