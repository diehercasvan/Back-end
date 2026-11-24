// src/services/user.service.js
const {
  User, UserRole, Role, UserStatus, Profile, DocumentType,
} = require('../models');

/** Include estándar para "detalle de usuario". */
function userDetailInclude() {
  return [
    { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
    {
      model: Profile, as: 'profile',
      include: [{ model: DocumentType, as: 'document_type', attributes: ['id', 'name'] }],
    },
    {
      model: UserRole, as: 'user_roles',
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'description'] },
        { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
      ],
    },
  ];
}

/** Formato de respuesta compacto. */
function formatUser(user) {
  const json = user.toJSON();
  return {
    id: json.id,
    username: json.username,
    email: json.email,
    last_login: json.last_login,
    created_at: json.created_at,
    updated_at: json.updated_at,
    status: json.status?.name || null,          // string
    status_id: json.status_id,                  // ← también el id
    profile: json.profile || null,
    roles: (json.user_roles || []).map((ur) => ({
      user_role_id: ur.id,
      role_id: ur.role_id,
      name: ur.role?.name || null,
      description: ur.role?.description || null,
      status: ur.status?.name || null,          // string
      status_id: ur.status_id,
      is_active: ur.status_id === 1,
    })),
  };
}

module.exports = { userDetailInclude, formatUser };