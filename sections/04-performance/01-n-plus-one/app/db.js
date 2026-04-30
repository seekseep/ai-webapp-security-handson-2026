import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// クエリ数の計測（レクチャー教材用）。
// db.prepare をラップして、Statement に対する get/run/all などを発行カウンタに加算する。
let queryCounter = 0;
const originalPrepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const stmt = originalPrepare(sql);
  for (const method of ['run', 'get', 'all', 'iterate']) {
    if (typeof stmt[method] === 'function') {
      const original = stmt[method].bind(stmt);
      stmt[method] = (...args) => {
        queryCounter++;
        return original(...args);
      };
    }
  }
  return stmt;
};

export function getQueryCount() {
  return queryCounter;
}

export default db;
