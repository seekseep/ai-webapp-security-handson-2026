---
title: SQL インジェクション
docs: true
---

# SQL インジェクション

ログインフォームに **SQL インジェクションが残っており、パスワードを知らずに任意のユーザーへ化けられてしまう** 状態を題材にします。

メールアドレス欄に `' OR '1'='1' --` を入れ、パスワード欄は適当な文字列を入れて送信するだけで、ログインが成立し、シードデータの先頭ユーザー (多くの場合は管理者) としてアプリ内に入れてしまいます。

該当箇所は [app/routes/auth.js](./app/routes/auth.js) のログインハンドラで、`SELECT * FROM users WHERE email = '${email}' AND password = '${password}'` のように、ユーザー入力を文字列としてそのまま SQL に埋め込んでいます。最終的に DB に渡るクエリの WHERE 句が「常に真」の条件に書き換えられ、パスワードの照合は SQL コメント (`--`) で打ち切られる、という OWASP Top 10 常連の代表例を、最も被害が分かりやすいログインバイパスで扱います。

## TODO

1. アプリを起動し、ログインフォームから **SQL インジェクションでログインを突破** できることを確認する
2. ログイン処理のコードを読み、**なぜ突破できたのか** を説明できるようにする
3. プレースホルダ（`?` バインド）を使った安全なクエリに修正し、再度同じ攻撃で突破できないことを確認する

## 学ぶこと

SQL インジェクションは **[OWASP](https://owasp.org/www-chapter-japan/) Top 10 の常連** で、入力値を文字列としてそのまま SQL に埋め込むと、攻撃者がクエリの意味を書き換えられてしまう脆弱性です。ログインバイパスはその代表例で、たった一行の入力でパスワードを知らずに管理者としてログインできてしまいます。

この章で身につけたい観点は次の2つです。

- **なぜ脆弱なのか**：文字列連結で SQL を組み立てると、クォートを閉じてコメントアウトするような入力でクエリ構造を壊せる
- **正しい直し方**：プレースホルダ（`?` バインド）を使うと、入力値はクエリ構造の一部として解釈されない

## 説明

### TODO 1: SQL インジェクションでログインを突破する

ログインフォーム（`/auth/login`）で、以下を入力して送信してください。

| 入力欄 | 値 |
|---|---|
| メールアドレス | `' OR '1'='1' --` |
| パスワード | （何でも良い） |

ログインに成功し、管理者としてアプリ内に入れてしまえば成功です。

> **メモ**：HTML5 の `type="email"` バリデーションで弾かれる場合は、DevTools で `type="text"` に書き換えて再送信してください。サーバー側に脆弱性があることを確認するための一時的な操作です。

### TODO 2: なぜ突破できたのかを説明する

該当箇所は [app/routes/auth.js](./app/routes/auth.js) の `app.post('/login', ...)` ハンドラです。

```js
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
const user = db.prepare(query).get();
```

入力した `' OR '1'='1' --` がそのまま埋め込まれると、最終的なクエリは以下になります。

```sql
SELECT * FROM users WHERE email = '' OR '1'='1' --' AND password = 'xxx'
```

- `' OR '1'='1'` で **常に真** の条件になり、すべてのユーザーがマッチ
- `--` 以降は SQL コメントとして無効化され、`AND password = ...` は実行されない
- 結果として、ユーザーテーブルの先頭行（多くの場合「管理者」）でログインが成立する

ポイントは、**入力値がクエリの「データ」ではなく「構造」として扱われている** ことです。

### TODO 3: プレースホルダで修正する

`?` バインドを使った形に書き換えます。

```js
const user = db.prepare(
  'SELECT * FROM users WHERE email = ? AND password = ?'
).get(email, password);
```

プレースホルダを使うと、`email` や `password` の中身がどんな文字列でも **クエリ構造の一部にはなりません**。SQLite ドライバが値として安全にバインドします。

修正後、もう一度 `' OR '1'='1' --` を試して、ログインに **失敗する** ことを確認してください。

---

## 補足: なぜ「入力値の検証」だけでは不十分なのか

「クォートをエスケープすれば良い」「危険な文字を弾けば良い」という防御は、漏れと誤検知の両方を生みます。攻撃手法のほうが進化が早く、ブラックリストは追いつきません。

**根本対策は「入力値を構造ではなくデータとして扱う」こと** です。プレースホルダはまさにそれを実現する仕組みなので、SQL を書くときは必ず使う、と覚えてください。

ORM を使っていても、Raw SQL を発行する箇所には同じ注意が必要です。

## 補足: ORM とは

ORM（[Object-Relational Mapping](https://aws.amazon.com/jp/what-is/object-relational-mapping/)）は、リレーショナルデータベースのテーブル / レコードと、プログラム上のクラス / オブジェクトを対応付けて、SQL を直接書かずにデータを読み書きできるようにする仕組みです。多くの ORM はパラメータを安全にバインドしてくれるので、通常の使い方では SQL インジェクションを防いでくれます。ただし Raw SQL を発行する API（`query` / `raw` / `execute` など）は ORM の保護の外なので、文字列連結で組み立てると同じ脆弱性が発生します。

主要言語ごとの代表的な ORM:

- **JavaScript / TypeScript (Node.js)**: Prisma、Drizzle、TypeORM、Sequelize
- **Python**: SQLAlchemy、Django ORM、Peewee
- **Ruby**: Active Record（Rails）、Sequel
- **PHP**: Eloquent（Laravel）、Doctrine
- **Java / Kotlin**: Hibernate（JPA）、MyBatis、Exposed
- **C# / .NET**: Entity Framework Core、Dapper
- **Go**: GORM、Ent、sqlc
- **Rust**: Diesel、SeaORM、SQLx

## 次の章へ

ログインの SQL インジェクションを直したら、次の章（XSS）に進みましょう。
