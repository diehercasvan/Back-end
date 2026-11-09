const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'taller_node',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función de inicialización (ejecutar una vez al arrancar)
const initDB = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      stock INT DEFAULT 0
    )
  `;
  await pool.query(query);
};

module.exports = { pool, initDB };