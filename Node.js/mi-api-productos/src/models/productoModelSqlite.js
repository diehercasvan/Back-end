const db = require('../config/sqliteDb');

const getAll = async () => {
  return db.prepare('SELECT * FROM productos').all();
};

const create = async (producto) => {
  const stmt = db.prepare('INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)');
  const info = stmt.run(producto.nombre, producto.precio, producto.stock);
  return { id: info.lastInsertRowid, ...producto };
};

// ... Implementar getById, update y delete
module.exports = { getAll, create };