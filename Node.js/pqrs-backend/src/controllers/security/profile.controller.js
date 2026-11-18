// src/controllers/security/profile.controller.js
const { Op } = require('sequelize');
const {
  Profile, User, UserStatus, DocumentType,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

function profileInclude() {
  return [
    { model: User, as: 'user', attributes: ['id', 'username', 'email', 'status_id', 'last_login'] },
    { model: DocumentType, as: 'document_type', attributes: ['id', 'name', 'description'] },
  ];
}

function formatProfile(p) {
  const json = p.toJSON();
  return {
    id: json.id,
    user_id: json.user_id,
    first_name: json.first_name,
    last_name: json.last_name,
    full_name: `${json.first_name} ${json.last_name}`.trim(),
    address: json.address,
    phone: json.phone,
    document_type: json.document_type,
    document_number: json.document_number,
    photo_url: json.photo_url,
    birth_date: json.birth_date,
    created_at: json.created_at,
    updated_at: json.updated_at,
    user: json.user || null,
  };
}

/* ============================================================
 * Listado y detalle (requieren Perfiles+view)
 * ============================================================ */

/** GET /profiles */
async function list(req, res, next) {
  try {
    const { q, document_type_id } = req.query;
    const where = {};
    if (document_type_id) where.document_type_id = Number(document_type_id);

    let userWhere;
    if (q) {
      userWhere = {
        [Op.or]: [
          { username: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
        ],
      };
    }

    const profiles = await Profile.findAll({
      where,
      include: [
        {
          model: User, as: 'user',
          attributes: ['id', 'username', 'email', 'status_id', 'last_login'],
          where: userWhere,
          required: !!userWhere,
        },
        { model: DocumentType, as: 'document_type', attributes: ['id', 'name'] },
      ],
      order: [['id', 'ASC']],
    });

    return ok(res, { profiles: profiles.map(formatProfile) }, 'Perfiles');
  } catch (err) { return next(err); }
}

/** GET /profiles/:id */
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const profile = await Profile.findByPk(id, { include: profileInclude() });
    if (!profile) return fail(res, 'Perfil no encontrado', 404);
    return ok(res, { profile: formatProfile(profile) }, 'Perfil');
  } catch (err) { return next(err); }
}

/** GET /users/:id/profile */
async function getByUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const profile = await Profile.findOne({
      where: { user_id: userId },
      include: profileInclude(),
    });
    if (!profile) return fail(res, 'El usuario no tiene perfil', 404);
    return ok(res, { profile: formatProfile(profile) }, 'Perfil del usuario');
  } catch (err) { return next(err); }
}

/* ============================================================
 * "me" — perfil del usuario autenticado (sin permiso de módulo)
 * ============================================================ */

/** GET /profiles/me */
async function getMine(req, res, next) {
  try {
    const userId = req.auth.user_id;
    const profile = await Profile.findOne({
      where: { user_id: userId },
      include: profileInclude(),
    });
    if (!profile) return fail(res, 'Tu usuario no tiene perfil configurado', 404);
    return ok(res, { profile: formatProfile(profile) }, 'Mi perfil');
  } catch (err) { return next(err); }
}

/** PUT /profiles/me */
async function updateMine(req, res, next) {
  try {
    const userId = req.auth.user_id;
    const profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) return fail(res, 'Tu usuario no tiene perfil configurado', 404);

    const updates = req.body;

    // Un usuario común no puede cambiar su propio documento (regla de negocio)
    if (updates.document_number && updates.document_number !== profile.document_number) {
      return fail(res, 'No puedes cambiar tu número de documento por esta vía', 403);
    }
    if (updates.document_type_id && updates.document_type_id !== profile.document_type_id) {
      return fail(res, 'No puedes cambiar tu tipo de documento por esta vía', 403);
    }

    await profile.update(updates);
    const full = await Profile.findByPk(profile.id, { include: profileInclude() });
    return ok(res, { profile: formatProfile(full) }, 'Mi perfil actualizado');
  } catch (err) { return next(err); }
}

/* ============================================================
 * Edición por admin (requiere Perfiles+edit)
 * ============================================================ */

/** PUT /users/:id/profile */
async function updateByUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) return fail(res, 'El usuario no tiene perfil', 404);

    const { document_number, document_type_id, ...rest } = req.body;

    // Si cambia el documento, validar duplicado
    if (document_number && document_number !== profile.document_number) {
      const dup = await Profile.findOne({ where: { document_number } });
      if (dup) return fail(res, 'document_number ya está en uso', 409);
    }
    if (document_type_id) {
      const dt = await DocumentType.findByPk(document_type_id);
      if (!dt) return fail(res, 'document_type_id no existe', 400);
    }

    await profile.update({
      ...rest,
      ...(document_number !== undefined && { document_number }),
      ...(document_type_id !== undefined && { document_type_id }),
    });

    const full = await Profile.findByPk(profile.id, { include: profileInclude() });
    return ok(res, { profile: formatProfile(full) }, 'Perfil actualizado');
  } catch (err) { return next(err); }
}

module.exports = {
  list, getOne, getByUser, getMine, updateMine, updateByUser,
};