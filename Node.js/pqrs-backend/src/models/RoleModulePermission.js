module.exports = (sequelize, DataTypes) => {
  const RoleModulePermission = sequelize.define('RoleModulePermission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    role_id: { type: DataTypes.INTEGER, allowNull: false },
    module_id: { type: DataTypes.INTEGER, allowNull: false },
    permission_id: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'role_module_permission',
    indexes: [{ unique: true, fields: ['role_id', 'module_id', 'permission_id'] }],
  });
  return RoleModulePermission;
};
