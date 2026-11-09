module.exports = (sequelize, DataTypes) => {
  const Pqrs = sequelize.define('Pqrs', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tracking_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    pqrs_type_id: { type: DataTypes.INTEGER, allowNull: false },
    pqrs_status_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    assigned_to: { type: DataTypes.INTEGER, allowNull: true },
    subject: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
  }, { tableName: 'pqrs' });
  return Pqrs;
};
