const Database = require('better-sqlite3');
const db = new Database('leads.db');

db.prepare(`CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parentName TEXT, childName TEXT, contact TEXT, format TEXT, timezone TEXT,
  problem TEXT, city TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT, reply TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

module.exports = db;
