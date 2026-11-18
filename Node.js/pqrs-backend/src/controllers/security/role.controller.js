// src/controllers/security/role.controller.js
const { Op } = require('sequelize');
const {
  sequelize, Role, UserRole, Module, Permission, RoleModulePermission,
} = require('../../models');
const { ok, fail } = require('../../utils/response');
const { buildPermissionMatrix } = require('../../services/role.service');

/* ============================================================
 * CRUD Roles
 * ============================================================ */

/** GET /roles */
async function list(req, res, next) {
  try {
    const roles = await Role.findAll({
      order: [['id', 'ASC']],
      include: [{
        model: UserRole, as: 'user_roles',
        attributes: ['id', 'status_id'],
      }],
    });

    const roleIds = roles.map((r) => r.id);
    const counts = await RoleModulePermission.findAll({
      where: { role_id: { [Op.in]: roleIds } },
      attributes: ['role_id', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['role_id'],
      raw: true,
    });
    const permCountByRole = Object.fromEntries(
      counts.map((c) => [c.role_id, Number(c.total)])
    );

    const data = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      user_role_count: r.user_roles.length,
      user_role_active_count: r.user_roles.filter((ur) => ur.status_id === 1).length,
      permission_count: permCountByRole[r.id] || 0,
    }));

    return ok(res, { roles: data }, 'Roles');
  } catch (err) { return next(err); }
}

/** GET /roles/:id */
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const grants = await RoleModulePermission.findAll({
      where: { role_id: id },
      include: [
        { model: Module, as: 'module', attributes: ['id', 'name'] },
        { model: Permission, as: 'permission', attributes: ['id', 'name'] },
      ],
      order: [['module_id', 'ASC'], ['permission_id', 'ASC']],
    });

    const permissions = grants.map((g) => ({
      rmp_id: g.id,
      module: g.module,
      permission: g.permission,
      created_at: g.created_at,
    }));

    return ok(res, { role, permissions }, 'Rol');
  } catch (err) { return next(err); }
}

/** POST /roles */
async function create(req, res, next) {
  try {
    const { name, description, is_active } = req.body;

    const exists = await Role.findOne({ where: { name } });
    if (exists) return fail(res, `Ya existe un rol con name="${name}"`, 409);

    const role = await Role.create({
      name,
      description: description ?? null,
      is_active: is_active ?? 1,
    });
    return ok(res, { role }, 'Rol creado', 201);
  } catch (err) { return next(err); }
}

/** PUT /roles/:id */
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    if (req.body.name && req.body.name !== role.name) {
      const dup = await Role.findOne({ where: { name: req.body.name } });
      if (dup) return fail(res, `Ya existe un rol con name="${req.body.name}"`, 409);
    }

    await role.update(req.body);
    return ok(res, { role }, 'Rol actualizado');
  } catch (err) { return next(err); }
}

/** DELETE /roles/:id */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const activeCount = await UserRole.count({
      where: { role_id: id, status_id: 1 },
    });
    if (activeCount > 0) {
      return fail(
        res,
        `No se puede eliminar: el rol tiene ${activeCount} asignación(es) activa(s). Desactívalas primero.`,
        409
      );
    }

    await role.destroy();
    return ok(res, null, 'Rol eliminado');
  } catch (err) { return next(err); }
}

/* ============================================================
 * Permisos del rol (role_module_permission)
 * ============================================================ */

/** GET /roles/:id/permissions */
async function listPermissions(req, res, next) {
  try {
    const id = Number(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const { modules, permissions, matrix } = await buildPermissionMatrix(id);
    const grants = await RoleModulePermission.findAll({
      where: { role_id: id },
      include: [
        { model: Module, as: 'module', attributes: ['id', 'name'] },
        { model: Permission, as: 'permission', attributes: ['id', 'name'] },
      ],
      order: [['module_id', 'ASC'], ['permission_id', 'ASC']],
    });

    return ok(res, {
      role,
      modules,
      permissions,
      matrix,
      grants: grants.map((g) => ({
        rmp_id: g.id,
        module: g.module,
        permission: g.permission,
      })),
    }, 'Permisos del rol');
  } catch (err) { return next(err); }
}

/** POST /roles/:id/permissions */
async function assignPermission(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { module_id, permission_id } = req.body;

    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const [mod, perm] = await Promise.all([
      Module.findByPk(module_id),
      Permission.findByPk(permission_id),
    ]);
    if (!mod) return fail(res, 'Módulo no existe', 400);
    if (!perm) return fail(res, 'Permiso no existe', 400);

    const [row, created] = await RoleModulePermission.findOrCreate({
      where: { role_id: id, module_id, permission_id },
      defaults: {},
    });

    return ok(res, {
      rmp_id: row.id,
      module: { id: mod.id, name: mod.name },
      permission: { id: perm.id, name: perm.name },
      created,
    }, created ? 'Permiso asignado al rol' : 'El rol ya tenía ese permiso', created ? 201 : 200);
  } catch (err) { return next(err); }
}

/** DELETE /roles/:id/permissions/:rmpId */
async function revokePermission(req, res, next) {
  try {
    const roleId = Number(req.params.id);
    const rmpId = Number(req.params.rmpId);

    const role = await Role.findByPk(roleId);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const row = await RoleModulePermission.findByPk(rmpId);
    if (!row) return fail(res, 'Permiso no encontrado', 404);
    if (row.role_id !== roleId) {
      return fail(res, 'Ese permiso no pertenece al rol indicado', 400);
    }

    await row.destroy();
    return ok(res, null, 'Permiso revocado del rol');
  } catch (err) { return next(err); }
}

module.exports = {
  list, getOne, create, update, remove,
  listPermissions, assignPermission, revokePermission,
};