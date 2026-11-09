const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../../data/productos.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Inicialización de la tabla
db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    stock INTEGER DEFAULT 0
  )
`);

module.exports = db;