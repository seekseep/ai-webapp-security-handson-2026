# TODO

各レクチャーの作成状況を管理するファイルです。レクチャーは「セクション → レクチャー」の2階層で並べています。

## レクチャーの作成状況

### 01-environment

| レクチャー | テーマ | ステータス |
|---|---|---|
| [01-environment](./sections/01-environment/01-environment/) | 環境構築・全体像の把握 | ✅ 用意済み |

### 02-injection

| レクチャー | テーマ | ステータス |
|---|---|---|
| [01-sqli](./sections/02-injection/01-sqli/) | SQL インジェクション | ✅ 用意済み |
| [02-xss](./sections/02-injection/02-xss/) | XSS（Stored XSS） | ✅ 用意済み |
| [03-command-injection](./sections/02-injection/03-command-injection/) | コマンドインジェクション | ✅ 用意済み |

### 03-auth

| レクチャー | テーマ | ステータス |
|---|---|---|
| [01-no-authentication](./sections/03-auth/01-no-authentication/) | 認証なし | ✅ 用意済み |
| [02-weak-authentication](./sections/03-auth/02-weak-authentication/) | 不十分な認証 | ✅ 用意済み |
| [03-broken-authorization](./sections/03-auth/03-broken-authorization/) | 不十分な認可 | ✅ 用意済み |

### 04-performance

| レクチャー | テーマ | ステータス |
|---|---|---|
| [01-n-plus-one](./sections/04-performance/01-n-plus-one/) | N+1 問題 | ✅ 用意済み |
| [02-large-data](./sections/04-performance/02-large-data/) | 大量データ | ✅ 用意済み |
| [03-cache](./sections/04-performance/03-cache/) | キャッシュ | ✅ 用意済み |

## ステータスの凡例

- ✅ 用意済み — README / LECTURE / 動くアプリが揃っている
- 🚧 作成中 — 着手しているが未完成
- ⏳ 未着手 — まだ作業を始めていない

## 作成時のチェックリスト

各レクチャーを新しく作るときは、以下を満たすこと。

- [ ] `01-environment/01-environment` と同じディレクトリ構成（`app/`, `scripts/`, `data/`, `package.json`, `Dockerfile`, `docker-compose.yml`）
- [ ] `README.md`（プロジェクト説明・起動方法・問題のあるファイル一覧）
- [ ] `LECTURE.md`（TODO / 学ぶこと / 説明 の3セクション構成）
- [ ] 該当機能に意図的な脆弱性／問題が仕込まれている
- [ ] `npm run database:init` / `npm run database:seed` / `npm run dev` が動作する
- [ ] Docker Compose でも起動する
