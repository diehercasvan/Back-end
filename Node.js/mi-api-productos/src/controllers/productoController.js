// Cambiar esta línea según el momento del taller:
 //const Producto = require('../models/productoModelJson');
 //const Producto = require('../models/productoModelSqlite');
const Producto = require('../models/productoModelMysql');

const listar = async (req, res) => {
  try {
    const productos = await Producto.getAll();
   
    res.json(productos);
  } catch (error) {
    
     console.error('❌ Error en listar:', error.message); // 👈 ¿existe esta línea?
    res.status(500).json({ error: error.message });    
  }
};

const crear = async (req, res) => {
  try {
   
    const nuevo = await Producto.create(req.body);
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear producto' });
  }
};

module.exports = { listar, crear };