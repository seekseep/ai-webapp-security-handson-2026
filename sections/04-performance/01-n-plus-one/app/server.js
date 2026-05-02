import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { sessionMiddleware } from './middleware/session.js';
import { currentUser } from './middleware/auth.js';
import { queryLogger } from './middleware/queryLogger.js';
import articles from './routes/articles.js';
import auth from './routes/auth.js';
import admin from './routes/admin.js';
import users from './routes/users.js';
import dashboard from './routes/dashboard.js';

const app = new Hono();

// 静的ファイル配信
app.use('/assets/*', serveStatic({ root: './app' }));

// クエリ本数を計測してログ出力
app.use('*', queryLogger());

// セッション管理
app.use('*', sessionMiddleware());

// ログインユーザーの取得
app.use('*', currentUser());

// トップページ → 記事一覧
app.get('/', (c) => c.redirect('/articles'));

// ルート登録
app.route('/articles', articles);
app.route('/auth', auth);
app.route('/admin', admin);
app.route('/users', users);
app.route('/dashboard', dashboard);

// サーバー起動
serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`サーバーが起動しました: http://localhost:${info.port}`);
});
