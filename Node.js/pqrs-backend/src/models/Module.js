module.exports = (sequelize, DataTypes) => {
  const Module = sequelize.define('Module', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    route: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    icon: { type: DataTypes.STRING(50) },
    description: { type: DataTypes.STRING(255) },
    is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  }, { tableName: 'module' });
  return Module;
};
