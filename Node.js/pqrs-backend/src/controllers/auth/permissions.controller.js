// src/controllers/auth/permissions.controller.js
const {
  UserRole, Role, RoleModulePermission, Module, Permission,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

/**
 * GET /auth/permissions
 * Devuelve los permisos del rol activo del usuario autenticado.
 */
async function myPermissions(req, res, next) {
  try {
    const { user_role_id } = req.auth;
    const ur = await UserRole.findOne({
      where: { id: user_role_id, status_id: 1 },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    });
    if (!ur) return fail(res, 'El rol activo del token ya no es válido', 401);

    const rows = await RoleModulePermission.findAll({
      where: { role_id: ur.role_id },
      include: [
        { model: Module, as: 'module', attributes: ['id', 'name', 'route', 'icon'] },
        { model: Permission, as: 'permission', attributes: ['id', 'name'] },
      ],
      order: [
        [{ model: Module, as: 'module' }, 'id', 'ASC'],
        [{ model: Permission, as: 'permission' }, 'id', 'ASC'],
      ],
    });

    // Agrupar por módulo
    const byModule = new Map();
    const flat = [];
    for (const r of rows) {
      const mName = r.module.name;
      const pName = r.permission.name;
      if (!byModule.has(mName)) {
        byModule.set(mName, {
          module: { id: r.module.id, name: mName, route: r.module.route, icon: r.module.icon },
          permissions: [],
        });
      }
      byModule.get(mName).permissions.push(pName);
      flat.push(`${mName}.${pName}`);
    }

    return ok(res, {
      role_id: ur.role_id,
      role_name: ur.role?.name,
      user_role_id: ur.id,
      modules: Array.from(byModule.values()),
      flat,
    }, 'Permisos del rol activo');
  } catch (err) { return next(err); }
}

module.exports = { myPermissions };