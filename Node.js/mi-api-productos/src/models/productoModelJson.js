const { leerDatos, escribirDatos } = require('../config/jsonDb');

/**
 * Retorna todos los productos.
 */
const getAll = async () => {
  const productos = await leerDatos();
  return productos;
};

/**
 * Retorna un producto por su id (string, porque en JSON usamos timestamp).
 */
const getById = async (id) => {
  const productos = await leerDatos();
  return productos.find((p) => p.id === String(id)) || null;
};

/**
 * Crea un producto con id basado en timestamp.
 */
const create = async (producto) => {
  if (!producto || typeof producto !== 'object' || Array.isArray(producto)) {
    const err = new Error('Se esperaba un objeto con nombre y precio');
    err.status = 400;
    throw err;
  }

  const { nombre, precio, stock } = producto;

  if (!nombre || precio === undefined) {
    const err = new Error('nombre y precio son obligatorios');
    err.status = 400;
    throw err;
  }

  const productos = await leerDatos();

  const nuevo = {
    id: Date.now().toString(),
    nombre,
    precio: Number(precio),
    stock: Number(stock ?? 0),
  };

  productos.push(nuevo);
  await escribirDatos(productos);

  return nuevo;
};

/**
 * Actualiza un producto existente por id.
 */
const update = async (id, datos) => {
  const productos = await leerDatos();
  const index = productos.findIndex((p) => p.id === String(id));

  if (index === -1) {
    return null;
  }

  const actualizado = {
    ...productos[index],
    ...datos,
    id: productos[index].id, // el id no se puede cambiar
  };

  productos[index] = actualizado;
  await escribirDatos(productos);

  return actualizado;
};

/**
 * Elimina un producto por id.
 */
const remove = async (id) => {
  const productos = await leerDatos();
  const filtrados = productos.filter((p) => p.id !== String(id));

  if (filtrados.length === productos.length) {
    return false; // no se eliminó nada
  }

  await escribirDatos(filtrados);
  return true;
};

module.exports = { getAll, getById, create, update, remove };