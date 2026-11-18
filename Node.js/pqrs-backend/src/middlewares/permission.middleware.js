// src/middlewares/permission.middleware.js
const { Module, Permission, RoleModulePermission, UserRole } = require('../models');
const { fail } = require('../utils/response');

const cache = { modules: new Map(), permissions: new Map() };

async function resolveIds(moduleName, permissionName) {
  let moduleId = cache.modules.get(moduleName);
  let permissionId = cache.permissions.get(permissionName);

  if (!moduleId) {
    const mod = await Module.findOne({
      where: { name: moduleName, is_active: 1 },
      attributes: ['id'],
    });
    if (mod) { moduleId = mod.id; cache.modules.set(moduleName, moduleId); }
  }
  if (!permissionId) {
    const perm = await Permission.findOne({
      where: { name: permissionName }, attributes: ['id'],
    });
    if (perm) { permissionId = perm.id; cache.permissions.set(permissionName, permissionId); }
  }
  return { moduleId, permissionId };
}

function permissionRequired(moduleName, permissionName) {
  return async (req, res, next) => {
    try {
      const { user_role_id } = req.auth || {};
      if (!user_role_id) return fail(res, 'No hay rol activo en el token', 401);

      const { moduleId, permissionId } = await resolveIds(moduleName, permissionName);
      if (!moduleId) return fail(res, `Módulo "${moduleName}" no existe o está inactivo`, 500);
      if (!permissionId) return fail(res, `Permiso "${permissionName}" no existe`, 500);

      const ur = await UserRole.findOne({
        where: { id: user_role_id, status_id: 1 },
        attributes: ['id', 'role_id'],
      });
      if (!ur) return fail(res, 'El rol activo del token ya no es válido', 401);

      const grant = await RoleModulePermission.findOne({
        where: { role_id: ur.role_id, module_id: moduleId, permission_id: permissionId },
        attributes: ['id'],
      });

      if (!grant) {
        return fail(res,
          `Acceso denegado. Tu rol activo no tiene el permiso "${permissionName}" sobre "${moduleName}".`,
          403);
      }

      req.permissionContext = {
        role_id: ur.role_id, module_id: moduleId, module_name: moduleName,
        permission_id: permissionId, permission_name: permissionName,
      };
      return next();
    } catch (err) { return next(err); }
  };
}

module.exports = { permissionRequired };
