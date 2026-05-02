---
docs: true
title: 開発ツール（VSCode / Chrome DevTools）
sidebar:
  label: 開発ツール
  order: 3
---

# 開発ツール（VSCode / Chrome DevTools）

ハンズオンを進めるうえで使うエディタとブラウザの開発者ツールについてまとめます。

## VSCode

エディタには [Visual Studio Code](https://code.visualstudio.com/) を推奨します。コード編集と同じウィンドウ内でターミナルを使えるので、起動コマンドの実行とソース閲覧を素早く切り替えられます。

### インストール方法

公式サイトからインストーラーをダウンロードするか、Homebrew でインストールします。

```bash
# macOS（Homebrew を使う場合）
brew install --cask visual-studio-code
```

### プロジェクトを開く

このリポジトリのルートで以下を実行するか、VSCode の **File → Open Folder** からリポジトリのフォルダを開きます。

```bash
code .
```

### ターミナルの起動

メニューの **Terminal → New Terminal**、またはショートカット `` Ctrl + ` ``（バッククォート）で VSCode 内にターミナルが開きます。開いたターミナルで `cd sections/03-injection/01-sqli` のようにレクチャーのディレクトリへ移動し、`npm run dev` などを実行してください。

複数のターミナル（例: `npm run dev` 用と `docker compose exec` 用）が必要な場合は、ターミナルパネル右上の `+` ボタンで追加できます。

## ブラウザの開発者ツール（Chrome DevTools）

ハンズオンでは、HTML の構造、リクエスト/レスポンス、Cookie、JavaScript の実行結果などをブラウザの開発者ツールで確認します。Google Chrome の **DevTools** を使う前提で進めます。

### Chrome のインストール

[Google Chrome](https://www.google.com/chrome/) をダウンロードしてインストールしてください（Homebrew の場合は `brew install --cask google-chrome`）。

### DevTools の開き方

ブラウザで <http://localhost:3000> を開いた状態で、次のいずれかを実行します。

- macOS: `Cmd + Option + I`
- Windows / Linux: `F12` または `Ctrl + Shift + I`
- ページ上で右クリック → **検証**

### よく使うタブ

| タブ | 用途 |
|---|---|
| Elements | レンダリング後の DOM・CSS を確認・編集 |
| Console | エラーログの確認、JavaScript の実行 |
| Network | 各リクエストのヘッダー・ボディ・ステータスコードを確認 |
| Application | Cookie・LocalStorage・SessionStorage の中身を確認 |

特に **Network タブ** はインジェクション系・認証系のレクチャーで頻出です。リクエスト一覧から個別のリクエストを選ぶと、送信したヘッダー・パラメータ・サーバーから返ってきた HTML をそのまま確認できます。
