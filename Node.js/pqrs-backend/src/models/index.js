// src/models/index.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserStatus     = require('./UserStatus')(sequelize, DataTypes);
const DocumentType   = require('./DocumentType')(sequelize, DataTypes);
const Role           = require('./Role')(sequelize, DataTypes);
const Permission     = require('./Permission')(sequelize, DataTypes);
const Module         = require('./Module')(sequelize, DataTypes);
const PqrsType       = require('./PqrsType')(sequelize, DataTypes);
const PqrsStatus     = require('./PqrsStatus')(sequelize, DataTypes);
const User           = require('./User')(sequelize, DataTypes);
const UserRole       = require('./UserRole')(sequelize, DataTypes);
const RoleModulePermission = require('./RoleModulePermission')(sequelize, DataTypes);
const Profile        = require('./Profile')(sequelize, DataTypes);
const Pqrs           = require('./Pqrs')(sequelize, DataTypes);
const PqrsResponse   = require('./PqrsResponse')(sequelize, DataTypes);

// user ↔ user_status
User.belongsTo(UserStatus, { foreignKey: 'status_id', as: 'status' });
UserStatus.hasMany(User, { foreignKey: 'status_id', as: 'users' });

// user ↔ user_role
User.hasMany(UserRole, { foreignKey: 'user_id', as: 'user_roles' });
UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(UserRole, { foreignKey: 'role_id', as: 'user_roles' });
UserRole.belongsTo(UserStatus, { foreignKey: 'status_id', as: 'status' });
UserStatus.hasMany(UserRole, { foreignKey: 'status_id', as: 'user_roles' });

// role ↔ role_module_permission ↔ module / permission
RoleModulePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(RoleModulePermission, { foreignKey: 'role_id', as: 'permissions' });

RoleModulePermission.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
Module.hasMany(RoleModulePermission, { foreignKey: 'module_id', as: 'role_permissions' });

RoleModulePermission.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });
Permission.hasMany(RoleModulePermission, { foreignKey: 'permission_id', as: 'role_permissions' });

// profile ↔ user / document_type
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Profile.belongsTo(DocumentType, { foreignKey: 'document_type_id', as: 'document_type' });
DocumentType.hasMany(Profile, { foreignKey: 'document_type_id', as: 'profiles' });

// pqrs ↔ user (creador) / user (asignado) / pqrs_type / pqrs_status
Pqrs.belongsTo(User, { foreignKey: 'user_id', as: 'creator' });
User.hasMany(Pqrs, { foreignKey: 'user_id', as: 'created_pqrs' });
Pqrs.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
User.hasMany(Pqrs, { foreignKey: 'assigned_to', as: 'assigned_pqrs' });
Pqrs.belongsTo(PqrsType, { foreignKey: 'pqrs_type_id', as: 'type' });
PqrsType.hasMany(Pqrs, { foreignKey: 'pqrs_type_id', as: 'pqrs' });
Pqrs.belongsTo(PqrsStatus, { foreignKey: 'pqrs_status_id', as: 'status' });
PqrsStatus.hasMany(Pqrs, { foreignKey: 'pqrs_status_id', as: 'pqrs' });

// pqrs_response ↔ pqrs / user
Pqrs.hasMany(PqrsResponse, { foreignKey: 'pqrs_id', as: 'responses' });
PqrsResponse.belongsTo(Pqrs, { foreignKey: 'pqrs_id', as: 'pqrs' });
PqrsResponse.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
User.hasMany(PqrsResponse, { foreignKey: 'user_id', as: 'pqrs_responses' });

module.exports = {
  sequelize,
  UserStatus, DocumentType, Role, Permission, Module,
  PqrsType, PqrsStatus, User, UserRole,
  RoleModulePermission,
  Profile, Pqrs, PqrsResponse,
};
