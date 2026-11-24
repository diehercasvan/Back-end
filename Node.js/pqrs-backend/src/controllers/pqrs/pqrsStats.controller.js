// src/controllers/pqrs/pqrsStats.controller.js
const { Op } = require('sequelize');
const {
  Pqrs, PqrsStatus, PqrsType, User,
} = require('../../models');
const { ok } = require('../../utils/response');

/**
 * GET /pqrs/stats
 * Estadísticas para el dashboard (filtradas según rol activo).
 */
async function stats(req, res, next) {
  try {
    const isAdmin = req.permissionContext?.role_id === 1;
    const isManager = req.permissionContext?.role_id === 3;
    const userId = req.auth.user_id;

    // Filtro base según rol
    const baseWhere = {};
    if (!isAdmin && !isManager) {
      // Usuario regular: solo ve sus propios PQRS (creados o asignados)
      baseWhere[Op.or] = [{ user_id: userId }, { assigned_to: userId }];
    }

    // Total
    const total = await Pqrs.count({ where: baseWhere });

    // Por estado
    const statuses = await PqrsStatus.findAll({ order: [['id', 'ASC']] });
    const by_status = await Promise.all(statuses.map(async (s) => ({
      status: s.name,
      color: s.color,
      count: await Pqrs.count({
        where: { ...baseWhere, pqrs_status_id: s.id },
      }),
    })));

    // Asignados a mí (solo staff)
    const assigned_to_me = isAdmin || isManager
      ? await Pqrs.count({ where: { assigned_to: userId } })
      : 0;

    // Últimos 5
    const recent = await Pqrs.findAll({
      where: baseWhere,
      include: [
        { model: PqrsStatus, as: 'status', attributes: ['id', 'name', 'color'] },
        { model: PqrsType, as: 'type', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    return ok(res, {
      total,
      by_status,
      assigned_to_me,
      recent: recent.map((p) => ({
        id: p.id,
        tracking_number: p.tracking_number,
        subject: p.subject,
        created_at: p.created_at,
        status: p.status,
        type: p.type,
        creator: p.creator,
      })),
    }, 'Estadísticas PQRS');
  } catch (err) { return next(err); }
}

module.exports = { stats };