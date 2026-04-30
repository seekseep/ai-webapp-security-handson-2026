import db from '../app/db.js';
import { hashPassword } from '../app/lib/password.js';

// 既存データを削除して seed を再実行可能にする
db.exec('DELETE FROM comments');
db.exec('DELETE FROM articles');
db.exec('DELETE FROM users');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users', 'articles', 'comments')");

const insertUser = db.prepare(
  'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
);

insertUser.run('管理者', 'admin@example.com', hashPassword('admin123'), 'admin');
insertUser.run('田中太郎', 'tanaka@example.com', hashPassword('password'), 'user');

const insertArticle = db.prepare(
  'INSERT INTO articles (title, body, author_id) VALUES (?, ?, ?)'
);

const articles = [
  {
    title: 'はじめての記事',
    body: 'これはサンプルの記事です。環境構築が成功しました！',
    authorId: 1,
  },
  {
    title: 'Markdownの書き方',
    body: '# 見出し\n\n本文をここに書きます。',
    authorId: 2,
  },
  {
    title: 'チーム開発のコツ',
    body: 'コードレビューを積極的に行いましょう。',
    authorId: 2,
  },
  {
    title: 'TypeScript の strict モードを後から有効にした話',
    body: '## 背景\n\n5万行ほどの JavaScript プロジェクトに TypeScript を導入したあと、しばらく `strict: false` で運用していました。型エラーが多すぎて止められなかったためです。\n\n## やったこと\n\n1. `strictNullChecks` だけ先に有効化\n2. ファイル単位で `// @ts-strict` コメントを使い、新規ファイルから順次対応\n3. CI で `tsc --noEmit` を走らせて差し戻し\n\n## 結果\n\n半年かけて完全 strict 化できました。**一気にやらない**のが大事だったと思います。',
    authorId: 1,
  },
  {
    title: 'React の useEffect 依存配列を本気で考える',
    body: '依存配列に何を入れるか、いつも迷いますよね。基本は **副作用が読んでいる値はすべて入れる** が正解です。\n\n- props や state はもちろん入れる\n- `useCallback` でラップした関数も入れる\n- 入れなくていいのは `useRef` と setState 関数だけ\n\nESLint の `react-hooks/exhaustive-deps` を有効にしておけば、ほぼ自動でチェックできます。例外的に依存を外したいときは、その理由をコメントで残しましょう。',
    authorId: 2,
  },
  {
    title: 'Node.js のメモリリークを Heap Snapshot で追った',
    body: '本番のメモリ使用量が右肩上がりになる問題を調査しました。\n\n## 手順\n\n1. `--inspect` フラグで Node を起動\n2. Chrome DevTools の Memory タブで Heap Snapshot を3回取得\n3. 比較で増え続けているオブジェクトを特定\n\n結果、グローバルな Map にキャッシュしたまま削除していないのが原因でした。LRU キャッシュに置き換えて解決。',
    authorId: 1,
  },
  {
    title: 'Docker Compose の depends_on は起動順しか保証しない',
    body: '`depends_on` を指定すれば DB が起動してからアプリが立ち上がる、と思っていませんか？\n\n実は **コンテナの起動順** しか保証しません。DB プロセスが accept できる状態になるのを待ってくれるわけではないので、アプリ側で接続リトライが必要です。\n\nヘルスチェック付きの `depends_on` を使うと、`condition: service_healthy` で待機できます。',
    authorId: 2,
  },
  {
    title: 'SQL インジェクション対策はプレースホルダで十分',
    body: '基本は **文字列連結で SQL を組み立てない** これだけです。\n\n```js\n// NG\ndb.exec(`SELECT * FROM users WHERE email = \'${email}\'`);\n\n// OK\ndb.prepare(\'SELECT * FROM users WHERE email = ?\').get(email);\n```\n\nプレースホルダ（`?` バインド）を使えば、入力値はクエリ構造の一部として解釈されません。ORM を使っていても、Raw SQL を書く部分には注意が必要です。',
    authorId: 1,
  },
  {
    title: 'XSS 対策の基本は出力時のエスケープ',
    body: '入力時のサニタイズではなく、**出力時のエスケープ** が基本です。\n\n- HTML コンテキスト: `<`, `>`, `&`, `"`, `\'` をエスケープ\n- 属性値: クオートで囲んで属性用エスケープ\n- JavaScript 文字列: `\\u` 形式でエスケープ\n- URL: `encodeURIComponent`\n\nテンプレートエンジン（Hono JSX, React など）は自動でエスケープしますが、`dangerouslySetInnerHTML` や `raw()` を使うとバイパスされるので注意。',
    authorId: 1,
  },
  {
    title: 'パスワードハッシュは bcrypt か argon2',
    body: '`SHA-256` でハッシュ化、はもう古いです。\n\n- **bcrypt**: 実績あり、コスト調整可、依存少ない\n- **argon2**: 最新、メモリハード、推奨\n\nどちらも内部でソルトを生成・保存するので、自前でソルト管理する必要はありません。コスト（rounds）は **検証に 100ms 程度** かかる値が目安です。',
    authorId: 2,
  },
];

for (const a of articles) {
  insertArticle.run(a.title, a.body, a.authorId);
}

const insertComment = db.prepare(
  'INSERT INTO comments (body, article_id, user_id) VALUES (?, ?, ?)'
);
insertComment.run('参考になりました！', 1, 2);
insertComment.run('もっと詳しく知りたいです。', 2, 1);

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
const articleCount = db.prepare('SELECT COUNT(*) as c FROM articles').get().c;
console.log(`シードデータを投入しました（users: ${userCount}, articles: ${articleCount}）`);
db.close();
