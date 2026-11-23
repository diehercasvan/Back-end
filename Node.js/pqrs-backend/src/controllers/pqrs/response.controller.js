// src/controllers/pqrs/response.controller.js
const {
  Pqrs, PqrsResponse, User,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

/* ============================================================
 * Helpers
 * ============================================================ */

/** Include estándar. */
function responseInclude() {
  return [
    {
      model: User, as: 'author',
      attributes: ['id', 'username', 'email'],
    },
  ];
}

/** Formato de respuesta. */
function formatResponse(r) {
  const json = r.toJSON();
  return {
    id: json.id,
    message: json.message,
    is_internal: !!json.is_internal,
    created_at: json.created_at,
    author: json.author,
  };
}

/**
 * Verifica si el usuario autenticado puede ver / responder este PQRS.
 * Devuelve el PQRS si puede, o un objeto de error si no.
 */
async function getPqrsIfAllowed(pqrsId, auth, permissionContext) {
  const pqrs = await Pqrs.findByPk(pqrsId);
  if (!pqrs) return { error: { status: 404, message: 'PQRS no encontrado' } };

  const isAdmin = permissionContext?.role_id === 1;
  const isCreator = pqrs.user_id === auth.user_id;
  const isAssignee = pqrs.assigned_to === auth.user_id;

  if (!isAdmin && !isCreator && !isAssignee) {
    return { error: { status: 403, message: 'No tienes permiso para interactuar con este PQRS' } };
  }

  return { pqrs, isAdmin, isCreator, isAssignee };
}

/* ============================================================
 * GET /pqrs/:id/responses
 * ============================================================ */
async function list(req, res, next) {
  try {
    const pqrsId = Number(req.params.id);
    const { error, pqrs, isAdmin, isCreator, isAssignee } =
      await getPqrsIfAllowed(pqrsId, req.auth, req.permissionContext);

    if (error) return fail(res, error.message, error.status);

    const where = { pqrs_id: pqrsId };

    // Regla: el ciudadano (creador) NUNCA ve notas internas.
    // Admin y asignado ven todo.
    const isStaff = isAdmin || isAssignee;
    if (!isStaff) {
      where.is_internal = 0;
    }

    const responses = await PqrsResponse.findAll({
      where,
      include: responseInclude(),
      order: [['created_at', 'ASC']],
    });

    return ok(res, {
      pqrs_id: pqrs.id,
      tracking_number: pqrs.tracking_number,
      total: responses.length,
      responses: responses.map(formatResponse),
    }, 'Hilo de respuestas');
  } catch (err) { return next(err); }
}

/* ============================================================
 * POST /pqrs/:id/responses
 * ============================================================ */
async function create(req, res, next) {
  try {
    const pqrsId = Number(req.params.id);
    const { message, is_internal } = req.body;
    const { error, pqrs, isAdmin, isCreator, isAssignee } =
      await getPqrsIfAllowed(pqrsId, req.auth, req.permissionContext);

    if (error) return fail(res, error.message, error.status);

    // Regla: solo staff (admin o asignado) puede crear notas internas.
    // El ciudadano no puede marcar is_internal=1.
    const isStaff = isAdmin || isAssignee;
    if (is_internal && !isStaff) {
      return fail(res, 'Solo el personal asignado o un administrador pueden crear notas internas', 403);
    }

    // Regla de negocio: no se puede responder a un PQRS cerrado.
    if (pqrs.pqrs_status_id === 4) {
      return fail(res, 'No se puede responder a un PQRS cerrado', 409);
    }

    const response = await PqrsResponse.create({
      pqrs_id: pqrsId,
      user_id: req.auth.user_id,
      message,
      is_internal: is_internal ? 1 : 0,
    });

    const full = await PqrsResponse.findByPk(response.id, { include: responseInclude() });
    return ok(res, { response: formatResponse(full) }, 'Respuesta creada', 201);
  } catch (err) { return next(err); }
}

module.exports = { list, create };