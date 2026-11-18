// src/services/role.service.js
const { Module, Permission, RoleModulePermission } = require('../models');

/**
 * Devuelve modules y permissions ordenados para construir la matriz.
 */
async function getCatalogsForMatrix() {
  const [modules, permissions] = await Promise.all([
    Module.findAll({ order: [['id', 'ASC']] }),
    Permission.findAll({ order: [['id', 'ASC']] }),
  ]);
  return { modules, permissions };
}

/**
 * Devuelve los role_module_permission del rol como Set de "module_id-permission_id"
 * y un Map para recuperar el id de cada fila.
 */
async function getRoleGrantsSet(role_id) {
  const rows = await RoleModulePermission.findAll({
    where: { role_id },
    attributes: ['id', 'module_id', 'permission_id'],
    order: [['module_id', 'ASC'], ['permission_id', 'ASC']],
  });
  const granted = new Set();
  const byPair = new Map();
  for (const r of rows) {
    const key = `${r.module_id}-${r.permission_id}`;
    granted.add(key);
    byPair.set(key, r.id);
  }
  return { granted, byPair, rows };
}

/**
 * Construye la matriz modules × permissions con estado granted/denied.
 */
async function buildPermissionMatrix(role_id) {
  const [{ modules, permissions }, { granted, byPair }] = await Promise.all([
    getCatalogsForMatrix(),
    getRoleGrantsSet(role_id),
  ]);

  const matrix = modules.map((m) => ({
    module: { id: m.id, name: m.name, route: m.route, icon: m.icon },
    permissions: permissions.map((p) => {
      const key = `${m.id}-${p.id}`;
      return {
        permission: { id: p.id, name: p.name },
        granted: granted.has(key),
        rmp_id: byPair.get(key) || null,
      };
    }),
  }));

  return { modules, permissions, matrix };
}

module.exports = {
  getCatalogsForMatrix,
  getRoleGrantsSet,
  buildPermissionMatrix,
};