module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
    is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  }, { tableName: 'role' });
  return Role;
};
