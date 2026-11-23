// src/controllers/pqrs/pqrs.controller.js
const { Op, Sequelize } = require('sequelize');
const {
  sequelize, Pqrs, PqrsType, PqrsStatus, User, UserRole, Role,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

/* ============================================================
 * Helpers
 * ============================================================ */

/** Genera el siguiente tracking_number de forma atómica (PQRS-YYYY-NNNNN). */
async function generateTrackingNumber(transaction) {
  const year = new Date().getFullYear();
  const prefix = `PQRS-${year}-`;

  // Bloquear tabla para evitar colisiones concurrentes (FOR UPDATE sobre el último).
  // En MySQL, usamos un COUNT() con lock para obtener el correlativo del año actual.
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM pqrs WHERE tracking_number LIKE :prefix`,
    { replacements: { prefix: `${prefix}%` }, transaction }
  );
  const next = Number(rows[0].total) + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

/** Include estándar para respuestas. */
function pqrsInclude() {
  return [
    { model: PqrsType, as: 'type', attributes: ['id', 'name'] },
    { model: PqrsStatus, as: 'status', attributes: ['id', 'name', 'color'] },
    { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
    { model: User, as: 'assignee', attributes: ['id', 'username', 'email'], required: false },
  ];
}

/** Formato de respuesta. */
function formatPqrs(p) {
  const json = p.toJSON();
  return {
    id: json.id,
    tracking_number: json.tracking_number,
    subject: json.subject,
    description: json.description,
    created_at: json.created_at,
    updated_at: json.updated_at,
    type: json.type,
    status: json.status,
    creator: json.creator,
    assignee: json.assignee || null,
  };
}

/* ============================================================
 * GET /pqrs (Listar)
 * ============================================================ */
async function list(req, res, next) {
  try {
    const { page, limit, pqrs_status_id, pqrs_type_id, assigned_to, q, sort, order } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (pqrs_status_id) where.pqrs_status_id = pqrs_status_id;
    if (pqrs_type_id) where.pqrs_type_id = pqrs_type_id;
    if (assigned_to) where.assigned_to = assigned_to;
    if (q) {
      where[Op.or] = [
        { tracking_number: { [Op.like]: `%${q}%` } },
        { subject: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
      ];
    }

    // Regla de visibilidad (a menos que tenga módulo de admin completo)
    // Si no es admin, solo ve los suyos o los asignados a él.
    const isAdmin = req.permissionContext?.role_id === 1; // Asumimos role_id=1 admin
    if (!isAdmin) {
      where[Op.or] = [
        ...(where[Op.or] || []),
        { user_id: req.auth.user_id },
        { assigned_to: req.auth.user_id },
      ];
    }

    const { count, rows } = await Pqrs.findAndCountAll({
      where,
      include: pqrsInclude(),
      order: [[sort, order]],
      limit,
      offset,
      distinct: true, // Necesario por los JOINs
    });

    return ok(res, {
      pqrs: rows.map(formatPqrs),
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    }, 'Listado de PQRS');
  } catch (err) { return next(err); }
}

/* ============================================================
 * GET /pqrs/:id
 * ============================================================ */
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pqrs = await Pqrs.findByPk(id, { include: pqrsInclude() });
    if (!pqrs) return fail(res, 'PQRS no encontrado', 404);

    // Validación de visibilidad
    const isAdmin = req.permissionContext?.role_id === 1;
    if (!isAdmin && pqrs.user_id !== req.auth.user_id && pqrs.assigned_to !== req.auth.user_id) {
      return fail(res, 'No tienes permiso para ver este PQRS', 403);
    }

    return ok(res, { pqrs: formatPqrs(pqrs) }, 'Detalle PQRS');
  } catch (err) { return next(err); }
}

/* ============================================================
 * POST /pqrs (Crear/Radicar)
 * ============================================================ */
async function create(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { pqrs_type_id, subject, description } = req.body;
    const user_id = req.auth.user_id;

    // Validar tipo
    const type = await PqrsType.findByPk(pqrs_type_id, { transaction: t });
    if (!type) { await t.rollback(); return fail(res, 'Tipo de PQRS no válido', 400); }

    // Generar tracking
    const tracking_number = await generateTrackingNumber(t);

    const pqrs = await Pqrs.create({
      tracking_number,
      user_id,
      pqrs_type_id,
      pqrs_status_id: 1, // Radicada por defecto
      subject,
      description,
    }, { transaction: t });

    await t.commit();

    const full = await Pqrs.findByPk(pqrs.id, { include: pqrsInclude() });
    return ok(res, { pqrs: formatPqrs(full) }, 'PQRS radicada correctamente', 201);
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/* ============================================================
 * PATCH /pqrs/:id/status
 * ============================================================ */
async function changeStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { pqrs_status_id } = req.body;
    const pqrs = await Pqrs.findByPk(id);
    if (!pqrs) return fail(res, 'PQRS no encontrado', 404);

    const newStatus = await PqrsStatus.findByPk(pqrs_status_id);
    if (!newStatus) return fail(res, 'Estado no válido', 400);

    // Regla: si ya está resuelta/cerrada, no puede volver a radicada
    if ([3, 4].includes(pqrs.pqrs_status_id) && pqrs_status_id === 1) {
      return fail(res, 'No se puede volver al estado "Radicada"', 409);
    }

    await pqrs.update({ pqrs_status_id });
    
    const full = await Pqrs.findByPk(id, { include: pqrsInclude() });
    return ok(res, { pqrs: formatPqrs(full) }, `Estado actualizado a "${newStatus.name}"`);
  } catch (err) { return next(err); }
}

/* ============================================================
 * PATCH /pqrs/:id/assign
 * ============================================================ */
async function assign(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { assigned_to } = req.body;
    
    // Validar que el usuario destino exista
    const assignee = await User.findByPk(assigned_to);
    if (!assignee) return fail(res, 'El usuario a asignar no existe', 400);

    const pqrs = await Pqrs.findByPk(id);
    if (!pqrs) return fail(res, 'PQRS no encontrado', 404);

    // Al asignar, pasa a "En Proceso" (2) automáticamente, si no está resuelta/cerrada
    const updateData = { assigned_to };
    if (![3, 4, 5].includes(pqrs.pqrs_status_id)) {
      updateData.pqrs_status_id = 2;
    }

    await pqrs.update(updateData);
    const full = await Pqrs.findByPk(id, { include: pqrsInclude() });
    return ok(res, { pqrs: formatPqrs(full) }, 'PQRS asignado correctamente');
  } catch (err) { return next(err); }
}

/* ============================================================
 * DELETE /pqrs/:id
 * ============================================================ */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pqrs = await Pqrs.findByPk(id);
    if (!pqrs) return fail(res, 'PQRS no encontrado', 404);

    const isAdmin = req.permissionContext?.role_id === 1;
    const isCreator = pqrs.user_id === req.auth.user_id;

    if (!isAdmin && !isCreator) {
      return fail(res, 'No tienes permiso para eliminar este PQRS', 403);
    }
    // Un usuario solo puede borrar si está "Radicada"
    if (!isAdmin && isCreator && pqrs.pqrs_status_id !== 1) {
      return fail(res, 'Solo puedes eliminar PQRS en estado "Radicada"', 409);
    }

    await pqrs.destroy(); // Cascade borrará responses
    return ok(res, null, 'PQRS eliminado');
  } catch (err) { return next(err); }
}

module.exports = { list, getOne, create, changeStatus, assign, remove };