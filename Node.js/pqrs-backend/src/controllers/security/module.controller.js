// src/controllers/security/module.controller.js
const { Op } = require('sequelize');
const {
  Module, RoleModulePermission, Role,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

/**
 * Formato de respuesta con conteos por rol.
 */
function formatModule(mod, counts) {
  return {
    id: mod.id,
    name: mod.name,
    route: mod.route,
    icon: mod.icon,
    description: mod.description,
    is_active: mod.is_active,
    created_at: mod.created_at,
    updated_at: mod.updated_at,
    permission_count: counts?.permission_count ?? 0,
    role_count: counts?.role_count ?? 0,
  };
}

/** GET /modules */
async function list(req, res, next) {
  try {
    const { q, is_active } = req.query;
    const where = {};
    if (q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
      ];
    }
    if (is_active !== undefined) where.is_active = Number(is_active);

    const modules = await Module.findAll({
      where, order: [['id', 'ASC']],
    });

    // Conteos por módulo: filas en role_module_permission y roles distintos
    const counts = await RoleModulePermission.findAll({
      attributes: [
        'module_id',
        'permission_id',
        'role_id',
      ],
      raw: true,
    });

    const byModule = new Map();
    const rolesByModule = new Map();
    for (const c of counts) {
      byModule.set(c.module_id, (byModule.get(c.module_id) || 0) + 1);
      if (!rolesByModule.has(c.module_id)) rolesByModule.set(c.module_id, new Set());
      rolesByModule.get(c.module_id).add(c.role_id);
    }

    const data = modules.map((m) => formatModule(m, {
      permission_count: byModule.get(m.id) || 0,
      role_count: rolesByModule.get(m.id)?.size || 0,
    }));

    return ok(res, { modules: data }, 'Módulos');
  } catch (err) { return next(err); }
}

/** GET /modules/:id */
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const mod = await Module.findByPk(id);
    if (!mod) return fail(res, 'Módulo no encontrado', 404);

    // Permisos asignados agrupados por rol
    const grants = await RoleModulePermission.findAll({
      where: { module_id: id },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
      ],
    });

    const byRole = new Map();
    for (const g of grants) {
      if (!byRole.has(g.role_id)) {
        byRole.set(g.role_id, {
          role: g.role,
          permission_ids: [],
          rmp_ids: [],
        });
      }
      byRole.get(g.role_id).permission_ids.push(g.permission_id);
      byRole.get(g.role_id).rmp_ids.push(g.id);
    }

    return ok(res, {
      module: formatModule(mod, {
        permission_count: grants.length,
        role_count: byRole.size,
      }),
      assignments_by_role: Array.from(byRole.values()),
    }, 'Módulo');
  } catch (err) { return next(err); }
}

/** POST /modules */
async function create(req, res, next) {
  try {
    const { name, route, icon, description, is_active } = req.body;

    const dupName = await Module.findOne({ where: { name } });
    if (dupName) return fail(res, `Ya existe un módulo con name="${name}"`, 409);

    const dupRoute = await Module.findOne({ where: { route } });
    if (dupRoute) return fail(res, `Ya existe un módulo con route="${route}"`, 409);

    const mod = await Module.create({
      name,
      route,
      icon: icon ?? null,
      description: description ?? null,
      is_active: is_active ?? 1,
    });
    return ok(res, { module: formatModule(mod) }, 'Módulo creado', 201);
  } catch (err) { return next(err); }
}

/** PUT /modules/:id */
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const mod = await Module.findByPk(id);
    if (!mod) return fail(res, 'Módulo no encontrado', 404);

    if (req.body.name && req.body.name !== mod.name) {
      const dup = await Module.findOne({ where: { name: req.body.name } });
      if (dup) return fail(res, `Ya existe un módulo con name="${req.body.name}"`, 409);
    }
    if (req.body.route && req.body.route !== mod.route) {
      const dup = await Module.findOne({ where: { route: req.body.route } });
      if (dup) return fail(res, `Ya existe un módulo con route="${req.body.route}"`, 409);
    }

    await mod.update(req.body);
    return ok(res, { module: formatModule(mod) }, 'Módulo actualizado');
  } catch (err) { return next(err); }
}

/** DELETE /modules/:id */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const mod = await Module.findByPk(id);
    if (!mod) return fail(res, 'Módulo no encontrado', 404);

    // Protección: no eliminar si tiene permisos asignados a roles
    const grants = await RoleModulePermission.count({ where: { module_id: id } });
    if (grants > 0) {
      return fail(
        res,
        `No se puede eliminar: el módulo tiene ${grants} permiso(s) asignado(s) a roles. Revócalos primero.`,
        409
      );
    }

    await mod.destroy();
    return ok(res, null, 'Módulo eliminado');
  } catch (err) { return next(err); }
}

module.exports = { list, getOne, create, update, remove };