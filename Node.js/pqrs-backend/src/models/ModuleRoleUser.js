module.exports = (sequelize, DataTypes) => {
  const ModuleRoleUser = sequelize.define('ModuleRoleUser', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_role_id: { type: DataTypes.INTEGER, allowNull: false },
    module_id: { type: DataTypes.INTEGER, allowNull: false },
    permission_id: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'module_role_user',
    indexes: [{ unique: true, fields: ['user_role_id', 'module_id', 'permission_id'] }],
  });
  return ModuleRoleUser;
};
