module.exports = (sequelize, DataTypes) => {
  const PqrsType = sequelize.define('PqrsType', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
  }, { tableName: 'pqrs_type' });
  return PqrsType;
};
