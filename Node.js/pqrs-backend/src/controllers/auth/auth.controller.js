// src/controllers/auth/auth.controller.js
const { Op } = require('sequelize');
const {
  User, UserRole, Role, UserStatus, Profile, DocumentType,
} = require('../../models');
const { comparePassword } = require('../../utils/password');
const { signToken } = require('../../utils/jwt');
const { ok, fail } = require('../../utils/response');

/**
 * Devuelve los roles ACTIVOS del usuario con sus datos de role.
 * @param {number} user_id
 */
async function getActiveUserRoles(user_id) {
  return UserRole.findAll({
    where: { user_id, status_id: 1 }, // 1 = active
    include: [{
      model: Role,
      as: 'role',
      attributes: ['id', 'name', 'description', 'is_active'],
      where: { is_active: 1 },
    }],
    order: [['id', 'ASC']],
  });
}

/**
 * Formato uniforme de un user_role para la respuesta.
 */
function formatUserRole(ur) {
  return {
    user_role_id: ur.id,
    role_id: ur.role_id,
    name: ur.role?.name || null,
    description: ur.role?.description || null,
  };
}

/**
 * POST /api/v1/auth/login
 * body: { username, password }
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    // Buscar usuario activo por username o email
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
        status_id: 1,
      },
      include: [{ model: UserStatus, as: 'status', attributes: ['id', 'name'] }],
    });
    if (!user) {
      return fail(res, 'Credenciales inválidas', 401);
    }

    // Verificar password
    const okPass = await comparePassword(password, user.password_hash);
    if (!okPass) {
      return fail(res, 'Credenciales inválidas', 401);
    }

    // Roles activos
    const userRoles = await getActiveUserRoles(user.id);
    if (userRoles.length === 0) {
      return fail(res, 'El usuario no tiene roles activos asignados', 403);
    }

    // Auto-selecciona el primer rol activo (el usuario podrá cambiarlo con select-role)
    const activeUserRole = userRoles[0];

    // Actualizar last_login
    user.last_login = new Date();
    await user.save();

    // Emitir JWT con user_id + user_role_id
    const token = signToken({
      user_id: user.id,
      user_role_id: activeUserRole.id,
    });

    return ok(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status?.name || null,
        last_login: user.last_login,
      },
      activeRole: formatUserRole(activeUserRole),
      availableRoles: userRoles.map(formatUserRole),
    }, 'Login exitoso');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/auth/me  (requiere Bearer)
 * Devuelve user + profile + activeRole + availableRoles
 */
async function me(req, res, next) {
  try {
    const { user_id, user_role_id } = req.auth;

    const user = await User.findByPk(user_id, {
      attributes: ['id', 'username', 'email', 'status_id', 'last_login', 'created_at'],
      include: [
        { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
        {
          model: Profile, as: 'profile',
          include: [{ model: DocumentType, as: 'document_type', attributes: ['id', 'name'] }],
        },
      ],
    });
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    // Validar que el user_role_id del token siga activo
    const activeUserRole = await UserRole.findOne({
      where: { id: user_role_id, user_id, status_id: 1 },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'description'] }],
    });
    if (!activeUserRole) {
      return fail(res, 'El rol activo del token ya no es válido. Vuelve a iniciar sesión.', 401);
    }

    const userRoles = await getActiveUserRoles(user_id);

    return ok(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status?.name || null,
        last_login: user.last_login,
        created_at: user.created_at,
      },
      profile: user.profile || null,
      activeRole: formatUserRole(activeUserRole),
      availableRoles: userRoles.map(formatUserRole),
    }, 'Perfil del usuario');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/select-role  (requiere Bearer)
 * body: { user_role_id }
 * Reemite JWT con el nuevo user_role_id.
 */
async function selectRole(req, res, next) {
  try {
    const { user_id } = req.auth;
    const { user_role_id } = req.body;

    const target = await UserRole.findOne({
      where: { id: user_role_id, user_id, status_id: 1 },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'description', 'is_active'] }],
    });
    if (!target || !target.role || target.role.is_active !== 1) {
      return fail(res, 'El rol solicitado no está disponible para este usuario', 400);
    }

    const token = signToken({ user_id, user_role_id: target.id });

    return ok(res, {
      token,
      activeRole: formatUserRole(target),
    }, 'Rol activo actualizado');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/auth/roles  (requiere Bearer)
 * Lista roles activos del usuario autenticado.
 */
async function listRoles(req, res, next) {
  try {
    const { user_id } = req.auth;
    const userRoles = await getActiveUserRoles(user_id);
    return ok(res, { roles: userRoles.map(formatUserRole) }, 'Roles disponibles');
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me, selectRole, listRoles };