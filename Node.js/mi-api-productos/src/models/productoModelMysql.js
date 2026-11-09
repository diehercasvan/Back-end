const { pool } = require('../config/mysqlDb');

const getAll = async () => {
  const [rows] = await pool.query('SELECT * FROM productos');
  return rows;
};

const create = async (producto) => {
  const query = 'INSERT INTO productos(nombre, precio, stock) VALUES (?, ?, ?)';
    console.log('Consulta',query);
  const [result] = await pool.execute(query, [producto.nombre, producto.precio, producto.stock]);

  return { id: result.insertId, ...producto };
};

// ... Implementar getById, update y delete
module.exports = { getAll, create };