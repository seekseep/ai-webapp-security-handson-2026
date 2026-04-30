import db from '../app/db.js';

// TODO: パスワードを平文のまま保存している点も問題

// 既存データを削除して seed を再実行可能にする
db.exec('DELETE FROM comments');
db.exec('DELETE FROM articles');
db.exec('DELETE FROM users');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users', 'articles', 'comments')");

const insertUser = db.prepare(
  'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
);

// 固定ユーザー（READMEのログイン表で使用）
insertUser.run('管理者', 'admin@example.com', 'admin123', 'admin');
insertUser.run('田中太郎', 'tanaka@example.com', 'password', 'user');
insertUser.run('鈴木花子', 'suzuki@example.com', 'password', 'user');

// ダミーユーザーを追加で27人（合計30人）
const lastNames = ['佐藤', '高橋', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '木村', '林', '斎藤', '清水', '山口', '池田', '阿部', '森', '橋本', '石川', '前田', '藤田', '岡田', '長谷川', '近藤', '石井', '坂本'];
const firstNames = ['翔太', '陽菜', '蓮', '美咲', '大輔', '葵', '健太', '結衣', '直樹', '優', '拓海', '彩', '亮', '愛', '雄大', '七海', '誠', '萌', '海斗', '香織', '一郎', '由香', '裕', '美穂', '智之', '麻衣', '剛'];
for (let i = 0; i < 27; i++) {
  const name = lastNames[i] + firstNames[i];
  const email = `user${i + 1}@example.com`;
  insertUser.run(name, email, 'password', 'user');
}

const insertArticle = db.prepare(
  'INSERT INTO articles (title, body, author_id) VALUES (?, ?, ?)'
);

// 固定記事
insertArticle.run('はじめての記事', 'これはサンプルの記事です。環境構築が成功しました！', 1);
insertArticle.run('Markdownの書き方', '# 見出し\n\n本文をここに書きます。', 2);
insertArticle.run('チーム開発のコツ', 'コードレビューを積極的に行いましょう。', 3);

// ダミー記事を追加で197件（合計200件）
const articleTemplates = [
  {
    title: 'TypeScript の strict モードを後から有効にした話',
    body: '## 背景\n\n5万行ほどの JavaScript プロジェクトに TypeScript を導入したあと、しばらく `strict: false` で運用していました。型エラーが多すぎて止められなかったためです。\n\n## やったこと\n\n1. `strictNullChecks` だけ先に有効化\n2. ファイル単位で `// @ts-strict` コメントを使い、新規ファイルから順次対応\n3. CI で `tsc --noEmit` を走らせて差し戻し\n\n## 結果\n\n半年かけて完全 strict 化できました。**一気にやらない**のが大事だったと思います。',
  },
  {
    title: 'React の useEffect 依存配列を本気で考える',
    body: '依存配列に何を入れるか、いつも迷いますよね。基本は **副作用が読んでいる値はすべて入れる** が正解です。\n\n- props や state はもちろん入れる\n- `useCallback` でラップした関数も入れる\n- 入れなくていいのは `useRef` と setState 関数だけ\n\nESLint の `react-hooks/exhaustive-deps` を有効にしておけば、ほぼ自動でチェックできます。例外的に依存を外したいときは、その理由をコメントで残しましょう。',
  },
  {
    title: 'Node.js のメモリリークを Heap Snapshot で追った',
    body: '本番のメモリ使用量が右肩上がりになる問題を調査しました。\n\n## 手順\n\n1. `--inspect` フラグで Node を起動\n2. Chrome DevTools の Memory タブで Heap Snapshot を3回取得\n3. 比較で増え続けているオブジェクトを特定\n\n結果、グローバルな Map にキャッシュしたまま削除していないのが原因でした。LRU キャッシュに置き換えて解決。',
  },
  {
    title: 'Docker Compose の depends_on は起動順しか保証しない',
    body: '`depends_on` を指定すれば DB が起動してからアプリが立ち上がる、と思っていませんか？\n\n実は **コンテナの起動順** しか保証しません。DB プロセスが accept できる状態になるのを待ってくれるわけではないので、アプリ側で接続リトライが必要です。\n\nヘルスチェック付きの `depends_on` を使うと、`condition: service_healthy` で待機できます。',
  },
  {
    title: 'GitHub Actions のキャッシュで CI を半分にした',
    body: '## Before\n\n毎回 `npm ci` で 90 秒かかっていました。\n\n## After\n\n`actions/setup-node` の `cache: npm` を有効にしただけで 30 秒に短縮。さらに、ビルド成果物を `actions/cache` で保持することで全体の CI 時間が **8分 → 4分** になりました。\n\nキャッシュキーは `package-lock.json` のハッシュにすると安全です。',
  },
  {
    title: 'PostgreSQL のインデックスは EXPLAIN で確認する',
    body: 'クエリが遅いとき、まずやるのは `EXPLAIN ANALYZE` です。\n\n- `Seq Scan` が出ていたら全件走査\n- `Index Scan` でも `Filter` が大量にあれば実は効いていない\n- `Bitmap Heap Scan` は中規模のヒット時に有効\n\n複合インデックスの順序も大事で、**WHERE で頻繁に絞り込む列を先頭** に置くのが基本です。',
  },
  {
    title: 'OAuth 2.0 と OpenID Connect の違いを整理する',
    body: '混同されがちですが役割が違います。\n\n- **OAuth 2.0**: 認可（リソースへのアクセス権を委譲する）\n- **OpenID Connect**: 認証（ユーザーが誰かを確認する）\n\nOIDC は OAuth 2.0 の上に「ID トークン」を載せた拡張です。「ログイン」目的なら OIDC を使うべきで、API のアクセストークンだけ欲しいなら OAuth 2.0 で十分です。',
  },
  {
    title: 'JWT を Cookie に入れるか LocalStorage に入れるか',
    body: '結論: **HttpOnly な Cookie** に入れるのが基本的に安全です。\n\n## LocalStorage のリスク\n\nXSS 脆弱性があると JS から読めてしまうため、トークンが盗まれます。\n\n## Cookie のリスク\n\nCSRF があるので、`SameSite=Lax` または `Strict` を必ず設定。さらに `Secure` 属性で HTTPS 必須にしましょう。',
  },
  {
    title: 'CSS の `gap` でマージン地獄から解放される',
    body: 'Flexbox / Grid の `gap` プロパティを使うと、子要素のマージン管理から解放されます。\n\n```css\n.list {\n  display: flex;\n  gap: 16px;\n}\n```\n\n以前は `> * + *` セレクタや `:not(:last-child)` で頑張っていましたが、もう不要です。Safari でも 14.1 以降サポートされているので安心して使えます。',
  },
  {
    title: 'SQL インジェクション対策はプレースホルダで十分',
    body: '基本は **文字列連結で SQL を組み立てない** これだけです。\n\n```js\n// NG\ndb.exec(`SELECT * FROM users WHERE email = \'${email}\'`);\n\n// OK\ndb.prepare(\'SELECT * FROM users WHERE email = ?\').get(email);\n```\n\nプレースホルダ（`?` バインド）を使えば、入力値はクエリ構造の一部として解釈されません。ORM を使っていても、Raw SQL を書く部分には注意が必要です。',
  },
  {
    title: 'XSS 対策の基本は出力時のエスケープ',
    body: '入力時のサニタイズではなく、**出力時のエスケープ** が基本です。\n\n- HTML コンテキスト: `<`, `>`, `&`, `"`, `\'` をエスケープ\n- 属性値: クオートで囲んで属性用エスケープ\n- JavaScript 文字列: `\\u` 形式でエスケープ\n- URL: `encodeURIComponent`\n\nテンプレートエンジン（Hono JSX, React など）は自動でエスケープしますが、`dangerouslySetInnerHTML` や `raw()` を使うとバイパスされるので注意。',
  },
  {
    title: 'CSRF トークンを毎回検証する',
    body: 'Cookie セッションを使う場合、**書き込み系のリクエストには必ず CSRF トークン検証** が必要です。\n\n## 実装パターン\n\n1. ログイン時にランダムトークンをセッションに保存\n2. フォームに hidden input として埋め込む\n3. POST 受信時にセッションのトークンと比較\n\n`SameSite=Strict` Cookie でも防げますが、古いブラウザ対応や iframe 連携を考えると CSRF トークンと併用するのが堅実です。',
  },
  {
    title: 'パスワードハッシュは bcrypt か argon2',
    body: '`SHA-256` でハッシュ化、はもう古いです。\n\n- **bcrypt**: 実績あり、コスト調整可、依存少ない\n- **argon2**: 最新、メモリハード、推奨\n\nどちらも内部でソルトを生成・保存するので、自前でソルト管理する必要はありません。コスト（rounds）は **検証に 100ms 程度** かかる値が目安です。',
  },
  {
    title: 'Git のコミットメッセージは Why を書く',
    body: 'What はコードを見れば分かります。コミットメッセージに書くべきは **なぜそう変えたか** です。\n\n## 良い例\n\n> Cookie の SameSite を Lax に変更\n>\n> Strict だと外部リンクからの遷移で再ログインが必要になり、UX が悪化したため。CSRF トークンは別途検証しているのでセキュリティ的にも問題なし。\n\n6ヶ月後の自分や、blame した同僚が一番喜びます。',
  },
  {
    title: 'コードレビューでは「なぜ」を聞く',
    body: '指摘より先に質問するのがコツです。\n\n- ❌「ここは早期 return にすべき」\n- ⭕「この分岐の入れ子、早期 return にしない理由はありますか？」\n\n理由があれば学べるし、なければ自然に修正の方向に進みます。レビューは正解の押し付けではなく、**コードについての対話** です。',
  },
  {
    title: 'リファクタリングはテストを書いてから',
    body: 'テストがない状態でリファクタリングするのは綱渡りです。\n\n## 推奨手順\n\n1. 現状の振る舞いを Characterization Test として固める\n2. 小さく構造を変えて、テストを毎回走らせる\n3. テストが赤くなったら即ロールバック\n\n「動いてるから触らない」より「動いてるうちにテストを書く」が結果的に楽です。',
  },
  {
    title: 'モノレポは pnpm workspace + Turborepo が手軽',
    body: '小〜中規模のモノレポなら、Nx より軽量な構成がおすすめです。\n\n- `pnpm workspace`: パッケージ間のシンボリックリンク管理\n- `Turborepo`: タスクのキャッシュ・並列実行\n\n`turbo.json` で依存関係を定義しておけば、変更があったパッケージだけビルド・テストされます。CI 時間が劇的に縮みます。',
  },
  {
    title: 'ESLint と Prettier の責務分離',
    body: 'よく混同されますが役割が違います。\n\n- **ESLint**: コード品質（バグ・アンチパターン検出）\n- **Prettier**: 見た目（インデント・改行・クオート）\n\n`eslint-config-prettier` を使うと、Prettier と競合する ESLint ルールを無効化できます。フォーマット系は Prettier に任せて、ESLint は品質に集中させるのがクリーンです。',
  },
  {
    title: 'AWS Lambda のコールドスタート対策',
    body: 'Lambda のコールドスタートは、関数のサイズと初期化処理に比例します。\n\n## 効く対策\n\n- **Provisioned Concurrency**: 確実だがコストが上がる\n- **デプロイサイズ削減**: tree-shaking、不要な依存削除\n- **初期化の遅延**: ハンドラー外での重い処理を避ける\n\nNode.js なら 100ms 台、Java なら数秒かかることもあるので、レイテンシ要件が厳しいなら言語選択も再考が必要です。',
  },
  {
    title: 'GraphQL の N+1 問題と DataLoader',
    body: 'リゾルバを素直に書くと N+1 クエリが発生します。\n\n```js\n// NG: ユーザー数だけクエリが飛ぶ\nposts.map(p => db.users.findById(p.authorId))\n```\n\n`DataLoader` を使うと、同一イベントループ内のリクエストをバッチ化してくれます。1クエリで済むので、ユーザー1000人でも無問題。GraphQL を実用化するなら必須のライブラリです。',
  },
  {
    title: 'REST API のステータスコードを正しく使う',
    body: '何でも 200 で返すのは API としてイマイチです。\n\n- `200`: 成功（GET、更新成功）\n- `201`: 作成成功（POST で新規作成）\n- `204`: 成功・レスポンスボディなし\n- `400`: クライアントエラー（バリデーション失敗）\n- `401`: 未認証\n- `403`: 権限なし\n- `404`: リソースなし\n- `409`: 競合（重複登録など）\n- `422`: リクエストは正しいが処理できない\n\nクライアントが分岐しやすくなります。',
  },
  {
    title: 'Redis をキャッシュとして使うときの TTL 設計',
    body: 'TTL なしのキャッシュは、ただのメモリリークです。\n\n## 基本方針\n\n- 短め（数分）にして、頻繁に再取得\n- ホット情報は長め（1時間）+ 明示的な invalidate\n- ロングテールはランダムに ±10% 揺らす（同時失効を防ぐ）\n\n`SETEX` または `SET key value EX seconds` で TTL 付き保存できます。',
  },
  {
    title: 'マイクロサービスは早すぎると地獄',
    body: 'モノリスを過小評価して、最初からマイクロサービスで作ると失敗します。\n\n## モノリスで困るタイミング\n\n- ビルドが10分超え\n- デプロイ単位が大きすぎて怖い\n- チーム間の機能境界が明確になってきた\n\n境界が見えるまでは、**モジュラーモノリス** で内部を疎結合にしておくのが現実的です。',
  },
  {
    title: 'アクセシビリティは alt と label から',
    body: '完璧を目指すと挫折するので、まず以下だけ。\n\n- 画像に `alt`（装飾画像なら `alt=""`）\n- フォーム要素に `<label>` を関連付け\n- 見出しを正しい階層で（h1 → h2 → h3）\n- ボタンは `<button>`、リンクは `<a>`\n\nここまでで多くのスクリーンリーダー利用者が読めるようになります。`aria-*` は最後の手段です。',
  },
  {
    title: 'CSS 設計は BEM より CSS Modules',
    body: 'グローバル CSS の命名地獄から抜け出すには、CSS Modules や CSS-in-JS が手早いです。\n\n- BEM: 規約だけで実現できるが、人間が間違える\n- CSS Modules: ビルド時にユニーク化、衝突しない\n- Tailwind: ユーティリティで完結、デザイントークン化しやすい\n\nプロジェクトの規模と好みで選びましょう。',
  },
  {
    title: 'Go の goroutine リークに気をつける',
    body: '`go` で起動した goroutine が終了せず残り続けるのが goroutine リークです。\n\n## 典型例\n\n- channel から受信したまま、誰も送らない\n- `context` を渡していない長時間処理\n\n対策としては、**必ず `context.Context` を引数で受け取る** ことと、**select 文で `<-ctx.Done()` を監視する** ことです。',
  },
  {
    title: 'Rust の所有権は最初は写経で慣れる',
    body: '所有権・借用・ライフタイム、3つを同時に理解しようとすると挫折します。\n\n## おすすめ順\n\n1. The Book を写経（4章まで）\n2. CLI ツールを作る（rustlings でも可）\n3. 借用検査エラーを見たら、まず `clone()` で逃げる\n4. 慣れてきたら参照で書き直す\n\nコンパイラのエラーメッセージが世界一親切な言語なので、エラー文を読むのが上達の近道です。',
  },
  {
    title: 'Kubernetes の Liveness と Readiness を混同しない',
    body: '両方ヘルスチェックですが、目的が違います。\n\n- **Liveness**: 失敗したら **Pod を再起動**\n- **Readiness**: 失敗したら **トラフィックを送らない**\n\nDB 接続待ちなどで Liveness を失敗させると、無限再起動ループに入ります。起動チェックは Readiness、運用中の死活監視は Liveness、と使い分けましょう。',
  },
  {
    title: 'デザインシステムは小さく始める',
    body: '最初から「100コンポーネント揃えるぞ」と意気込むと頓挫します。\n\n## 順番\n\n1. **トークン**（色・スペース・フォント）を Figma と CSS 変数で定義\n2. Button, Input, Card など、頻出5つから実装\n3. プロダクトで実際に使い、フィードバックで改善\n\n使われていない汎用コンポーネントは、ただの負債です。',
  },
  {
    title: 'スクラムのデイリーは「進捗報告会」ではない',
    body: 'マネージャーへの報告会になっているデイリーをよく見ます。本来は **チーム自身が課題を見つけて調整する場** です。\n\n## 良いデイリー\n\n- 15分以内\n- 全員立っている（短くなる）\n- 「ブロッカーは？」を毎回聞く\n- 詳細議論はデイリー後に別ミーティング\n\nダラダラ続くなら設計から見直したほうが早いです。',
  },
  {
    title: '1on1 は雑談ではなく、相手の時間',
    body: '1on1 で「困ってることある？」と聞いて「特に…」で終わるなら、設計が悪いです。\n\n## 効くフォーマット\n\n- 議題は **メンバーが先に書く**（Notion など共有ドキュメント）\n- マネージャーは聞く 7 割、話す 3 割\n- キャリアの話を月1で必ず入れる\n\n進捗確認なら別の場で十分です。1on1 はメンバーの時間に投資する場と割り切りましょう。',
  },
  {
    title: 'パフォーマンス改善は計測が9割',
    body: '勘でのチューニングはほぼハズレます。\n\n## 計測ツール\n\n- フロント: Chrome DevTools Performance / Lighthouse\n- API: APM（Datadog, New Relic）\n- DB: スロークエリログ、`EXPLAIN ANALYZE`\n\nボトルネックを **数値で特定してから** 直すのが鉄則。「速そう」「遅そう」で始めると、効かない場所を磨いて時間を溶かします。',
  },
  {
    title: 'WebSocket は再接続前提で設計する',
    body: 'WebSocket 接続は意外と切れます。Wi-Fi 切替、スリープ復帰、プロキシのタイムアウトなど。\n\n## 必須機能\n\n- 自動再接続(指数バックオフ)\n- ハートビート(30秒ごと ping)\n- 切断中のメッセージキューイング\n\nライブラリを使うなら `socket.io` か `Phoenix Channels` が再接続周りまで面倒見てくれます。',
  },
  {
    title: 'PWA でオフライン対応する最小構成',
    body: '## 必須3点\n\n1. `manifest.json`(アイコン・名前・start_url)\n2. Service Worker(オフラインキャッシュ)\n3. HTTPS(localhost は除く)\n\nWorkbox を使うと Service Worker の実装が劇的に楽になります。いきなり全機能オフライン化を目指さず、**読み取り系から段階的に** 対応するのがおすすめです。',
  },
  {
    title: 'SEO は技術より「コンテンツが正義」',
    body: 'メタタグや構造化データを完璧にしても、コンテンツがゴミならランクは上がりません。\n\n## 順番\n\n1. ユーザーが検索する語彙でコンテンツを書く\n2. ページタイトル・h1 に含める\n3. 内部リンクで関連ページをつなぐ\n4. **その後** 構造化データ・OGP\n\nSEO は技術 1 割、コンテンツ 9 割。これは10年経っても変わりません。',
  },
  {
    title: 'ペアプロは「教える」場ではない',
    body: 'ジュニアに教える時間として使われがちですが、本来は **ふたりで考えて良いコードを書く** ためのものです。\n\n## 続ける工夫\n\n- 25分ごとに役割交代(Pomodoro)\n- ドライバーは手だけ、ナビゲーターが思考\n- 集中が切れたら素直に休憩\n\n2時間以上は疲弊するので、午前か午後に切るのが現実的です。',
  },
  {
    title: 'API のバージョニング戦略',
    body: '## 主要パターン\n\n- URL パス: `/v1/users`(最も明示的)\n- ヘッダー: `Accept: application/vnd.app.v1+json`(URL がきれい)\n- クエリ: `/users?version=1`(あまり推奨されない)\n\n破壊的変更を避けるのが理想ですが、難しい場合は **新エンドポイント追加 → 旧エンドポイント Deprecation 通知 → 半年後に削除** の流れで進めます。',
  },
  {
    title: 'ログは「あとから検索できる形」で出す',
    body: 'console.log を散らすだけのログは、運用で役に立ちません。\n\n## 構造化ログの基本\n\n- JSON 形式で出力\n- `timestamp`, `level`, `message`, `traceId` を必ず含む\n- 個人情報・トークンはマスク\n\nDatadog や CloudWatch Logs Insights で検索しやすくなります。**`error.stack` は文字列ではなく構造化** して入れるのがコツです。',
  },
  {
    title: 'フィーチャーフラグで本番デプロイを安全にする',
    body: 'リリースとデプロイを分離するのがフィーチャーフラグの本質です。\n\n## メリット\n\n- 本番にコードを出した状態で、社内だけ有効化\n- 問題があれば数秒で OFF\n- A/B テスト・段階リリースが可能\n\n注意点として、**フラグは負債** です。リリース完了したら必ず削除する運用ルールを決めましょう。',
  },
  {
    title: 'インデックスを貼りすぎない',
    body: '「とりあえずインデックス」は、**書き込みが遅くなる落とし穴** があります。\n\n- INSERT/UPDATE/DELETE 時にインデックスも更新される\n- ストレージ容量も食う\n- 統計情報の更新コスト\n\nクエリログでよく使われる WHERE 句・JOIN 条件を分析してから、必要最小限を貼りましょう。`pg_stat_user_indexes` で使われていないインデックスを定期的に棚卸しできます。',
  },
];

for (let i = 0; i < 197; i++) {
  const tpl = articleTemplates[i % articleTemplates.length];
  const round = Math.floor(i / articleTemplates.length) + 1;
  const title = round === 1 ? tpl.title : `${tpl.title}（再掲 ${round}）`;
  const authorId = (i % 30) + 1;
  insertArticle.run(title, tpl.body, authorId);
}

const insertComment = db.prepare(
  'INSERT INTO comments (body, article_id, user_id) VALUES (?, ?, ?)'
);
insertComment.run('参考になりました！', 1, 2);
insertComment.run('わかりやすい記事ですね。', 1, 3);
insertComment.run('もっと詳しく知りたいです。', 2, 1);

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
const articleCount = db.prepare('SELECT COUNT(*) as c FROM articles').get().c;
console.log(`シードデータを投入しました（users: ${userCount}, articles: ${articleCount}）`);
db.close();
