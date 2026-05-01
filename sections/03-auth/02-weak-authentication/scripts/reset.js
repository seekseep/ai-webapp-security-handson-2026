import db from '../app/db.js';

db.exec('DELETE FROM comments');
db.exec('DELETE FROM articles');
db.exec('DELETE FROM users');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users', 'articles', 'comments')");

console.log('全データを削除しました。npm run database:seed で再投入できます。');
db.close();
