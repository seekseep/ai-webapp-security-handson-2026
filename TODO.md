# TODO

各章の作成状況を管理するファイルです。

## 章の作成状況

| 章 | テーマ | ステータス |
|---|---|---|
| [01-environment](./sections/01-environment/) | 環境構築・全体像の把握 | ✅ 用意済み |
| [02-injection/01-sqli](./sections/02-injection/01-sqli/) | SQL インジェクション | ✅ 用意済み |
| [02-injection/02-xss](./sections/02-injection/02-xss/) | XSS（Stored XSS） | ✅ 用意済み |
| [02-injection/03-command-injection](./sections/02-injection/03-command-injection/) | コマンドインジェクション | ✅ 用意済み |
| 03-auth/01-no-authentication | 認証なし | ⏳ 未着手 |
| 03-auth/02-weak-authentication | 不十分な認証 | ⏳ 未着手 |
| 03-auth/03-broken-authorization | 不十分な認可 | ⏳ 未着手 |
| 04-performance/01-n-plus-one | N+1 問題 | ⏳ 未着手 |
| 04-performance/02-large-data | 大量データ | ⏳ 未着手 |
| 04-performance/03-cache | キャッシュ | ⏳ 未着手 |

## ステータスの凡例

- ✅ 用意済み — README / LECTURE / 動くアプリが揃っている
- 🚧 作成中 — 着手しているが未完成
- ⏳ 未着手 — まだ作業を始めていない

## 作成時のチェックリスト

各章を新しく作るときは、以下を満たすこと。

- [ ] 01-environment と同じディレクトリ構成（`app/`, `scripts/`, `data/`, `package.json`, `Dockerfile`, `docker-compose.yml`）
- [ ] `README.md`（プロジェクト説明・起動方法・問題のあるファイル一覧）
- [ ] `LECTURE.md`（TODO / 学ぶこと / 説明 の3セクション構成）
- [ ] 該当機能に意図的な脆弱性／問題が仕込まれている
- [ ] 修正箇所に `// TODO:` コメント
- [ ] `npm run database:init` / `npm run database:seed` / `npm run dev` が動作する
- [ ] Docker Compose でも起動する
