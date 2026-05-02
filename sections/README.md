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

- [環境構築](./01-environment/01-environment/LECTURE.md)

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

## 環境構築・実行方法

実行方法は **Docker** と **ホストマシン（Node.js）** の2通りがあります。どちらか一方で動けば学習を進められます。エディタとブラウザの開発者ツールは共通です。

- [Docker コンテナで動かす](./DOCKER.md) — Docker Desktop / Docker Compose のインストール・起動・DB セットアップ
- [ホストマシン（Node.js）で動かす](./HOST.md) — Node.js のインストール・起動・DB セットアップ
- [開発ツール（VSCode / Chrome DevTools）](./TOOLS.md) — エディタとブラウザの開発者ツールの使い方
