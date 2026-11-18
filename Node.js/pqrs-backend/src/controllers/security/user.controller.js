// src/controllers/security/user.controller.js
const { Op } = require('sequelize');
const {
  sequelize, User, UserRole, Role, UserStatus, Profile, DocumentType,
} = require('../../models');
const { hashPassword } = require('../../utils/password');
const { ok, fail } = require('../../utils/response');
const { userDetailInclude, formatUser } = require('../../services/user.service');

/* ============================================================
 * Helpers internos
 * ============================================================ */

async function findUserOr404(id, res) {
  const user = await User.findByPk(id, { include: userDetailInclude() });
  if (!user) {
    fail(res, 'Usuario no encontrado', 404);
    return null;
  }
  return user;
}

/**
 * Asegura que exista un user_role activo para (user_id, role_id).
 * Si existe inactivo, lo reactiva.
 */
async function ensureUserRoleActive(user_id, role_id, { transaction } = {}) {
  const existing = await UserRole.findOne({
    where: { user_id, role_id },
    transaction,
  });
  if (existing) {
    if (existing.status_id !== 1) {
      await existing.update({ status_id: 1 }, { transaction });
    }
    return { user_role: existing, created: false };
  }
  const created = await UserRole.create(
    { user_id, role_id, status_id: 1 },
    { transaction }
  );
  return { user_role: created, created: true };
}

/* ============================================================
 * Endpoints
 * ============================================================ */

/** GET /users */
async function list(req, res, next) {
  try {
    const { q, status_id, role_id } = req.query;
    const where = {};
    if (q) {
      where[Op.or] = [
        { username: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
      ];
    }
    if (status_id) where.status_id = Number(status_id);

    const include = userDetailInclude();
    if (role_id) {
      // filtra usuarios que tengan ese rol (activo o no)
      include[2] = {
        ...include[2],
        where: { role_id: Number(role_id) },
        required: true,
      };
    }

    const users = await User.findAll({
      where, include,
      order: [['id', 'ASC']],
    });

    return ok(res, { users: users.map(formatUser) }, 'Usuarios');
  } catch (err) { return next(err); }
}

/** GET /users/:id */
async function getOne(req, res, next) {
  try {
    const user = await findUserOr404(Number(req.params.id), res);
    if (!user) return;
    return ok(res, { user: formatUser(user) }, 'Usuario');
  } catch (err) { return next(err); }
}

/** POST /users */
async function create(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { username, email, password, status_id, role_id, profile } = req.body;

    // Duplicados de username / email / documento
    const dup = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
      transaction: t,
    });
    if (dup) {
      await t.rollback();
      return fail(res, `Ya existe un usuario con username o email igual`, 409);
    }
    const dupDoc = await Profile.findOne({
      where: { document_number: profile.document_number },
      transaction: t,
    });
    if (dupDoc) {
      await t.rollback();
      return fail(res, 'Ya existe un perfil con ese document_number', 409);
    }

    // Rol debe existir
    const role = await Role.findByPk(role_id, { transaction: t });
    if (!role) { await t.rollback(); return fail(res, 'role_id no existe', 400); }

    // Estado por defecto = 1 (active)
    const finalStatusId = status_id ?? 1;
    const status = await UserStatus.findByPk(finalStatusId, { transaction: t });
    if (!status) { await t.rollback(); return fail(res, 'status_id no existe', 400); }

    // Crear User
    const password_hash = await hashPassword(password);
    const user = await User.create({
      username, email: email ?? null, password_hash, status_id: finalStatusId,
    }, { transaction: t });

    // Crear Profile
    await Profile.create({
      user_id: user.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      address: profile.address ?? null,
      phone: profile.phone ?? null,
      document_type_id: profile.document_type_id,
      document_number: profile.document_number,
      photo_url: profile.photo_url ?? null,
      birth_date: profile.birth_date ?? null,
    }, { transaction: t });

    // Crear UserRole activo
    await UserRole.create(
      { user_id: user.id, role_id, status_id: 1 },
      { transaction: t }
    );

    await t.commit();

    // Recargar con includes
    const full = await User.findByPk(user.id, { include: userDetailInclude() });
    return ok(res, { user: formatUser(full) }, 'Usuario creado', 201);
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/** PUT /users/:id */
async function update(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const user = await User.findByPk(id, { transaction: t });
    if (!user) { await t.rollback(); return fail(res, 'Usuario no encontrado', 404); }

    const { username, email, status_id } = req.body;

    if (username && username !== user.username) {
      const dup = await User.findOne({ where: { username }, transaction: t });
      if (dup) { await t.rollback(); return fail(res, 'username ya en uso', 409); }
    }
    if (email && email !== user.email) {
      const dup = await User.findOne({ where: { email }, transaction: t });
      if (dup) { await t.rollback(); return fail(res, 'email ya en uso', 409); }
    }
    if (status_id) {
      const s = await UserStatus.findByPk(status_id, { transaction: t });
      if (!s) { await t.rollback(); return fail(res, 'status_id no existe', 400); }
    }

    await user.update(
      {
        ...(username !== undefined && { username }),
        ...(email !== undefined && { email }),
        ...(status_id !== undefined && { status_id }),
      },
      { transaction: t }
    );

    await t.commit();
    const full = await User.findByPk(id, { include: userDetailInclude() });
    return ok(res, { user: formatUser(full) }, 'Usuario actualizado');
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/** PATCH /users/:id/status */
async function changeStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { status_id } = req.body;
    const user = await User.findByPk(id);
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    const s = await UserStatus.findByPk(status_id);
    if (!s) return fail(res, 'status_id no existe', 400);

    await user.update({ status_id });
    const full = await User.findByPk(id, { include: userDetailInclude() });
    return ok(res, { user: formatUser(full) }, `Estado cambiado a "${s.name}"`);
  } catch (err) { return next(err); }
}

/** PATCH /users/:id/password */
async function changePassword(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { new_password } = req.body;
    const user = await User.findByPk(id);
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    const password_hash = await hashPassword(new_password);
    await user.update({ password_hash });
    return ok(res, null, 'Contraseña actualizada');
  } catch (err) { return next(err); }
}

/** DELETE /users/:id */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (id === req.auth.user_id) {
      return fail(res, 'No puedes eliminar tu propio usuario', 400);
    }
    const user = await User.findByPk(id);
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    // Al borrar el User, ON DELETE CASCADE limpia profile, user_role, pqrs, responses
    await user.destroy();
    return ok(res, null, 'Usuario eliminado');
  } catch (err) { return next(err); }
}

/* ============================================================
 * Roles del usuario
 * ============================================================ */

/** GET /users/:id/roles */
async function listRoles(req, res, next) {
  try {
    const id = Number(req.params.id);
    const user = await User.findByPk(id);
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    const rows = await UserRole.findAll({
      where: { user_id: id },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'description'] },
        { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
      ],
      order: [['id', 'ASC']],
    });
    return ok(res, {
      roles: rows.map((ur) => ({
        user_role_id: ur.id,
        role_id: ur.role_id,
        name: ur.role?.name,
        description: ur.role?.description,
        status: ur.status?.name,
        is_active: ur.status_id === 1,
      })),
    }, 'Roles del usuario');
  } catch (err) { return next(err); }
}

/** POST /users/:id/roles */
async function assignRole(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const { role_id } = req.body;

    const user = await User.findByPk(id, { transaction: t });
    if (!user) { await t.rollback(); return fail(res, 'Usuario no encontrado', 404); }

    const role = await Role.findByPk(role_id, { transaction: t });
    if (!role) { await t.rollback(); return fail(res, 'role_id no existe', 400); }

    const { user_role, created } = await ensureUserRoleActive(id, role_id, { transaction: t });
    await t.commit();

    return ok(res, {
      user_role_id: user_role.id,
      role_id: user_role.role_id,
      created,
    }, created ? 'Rol asignado' : 'Rol reactivado', created ? 201 : 200);
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/** DELETE /users/:id/roles/:urId (desactiva, no borra) */
async function revokeRole(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const urId = Number(req.params.urId);

    const ur = await UserRole.findByPk(urId);
    if (!ur) return fail(res, 'Asignación no encontrada', 404);
    if (ur.user_id !== userId) {
      return fail(res, 'Esa asignación no pertenece al usuario', 400);
    }
    if (ur.status_id !== 1) {
      return ok(res, null, 'La asignación ya estaba inactiva');
    }

    // No permitir quedarse sin ningún rol activo (protege al usuario de quedar huérfano)
    const activeCount = await UserRole.count({
      where: { user_id: userId, status_id: 1 },
    });
    if (activeCount <= 1) {
      return fail(res, 'No puedes desactivar el último rol activo del usuario', 409);
    }

    await ur.update({ status_id: 2 });
    return ok(res, null, 'Asignación de rol desactivada');
  } catch (err) { return next(err); }
}

module.exports = {
  list, getOne, create, update, changeStatus, changePassword, remove,
  listRoles, assignRole, revokeRole,
};