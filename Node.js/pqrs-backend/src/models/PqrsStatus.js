module.exports = (sequelize, DataTypes) => {
  const PqrsStatus = sequelize.define('PqrsStatus', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
    color: { type: DataTypes.STRING(20) },
  }, { tableName: 'pqrs_status' });
  return PqrsStatus;
};
