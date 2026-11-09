module.exports = (sequelize, DataTypes) => {
  const PqrsResponse = sequelize.define('PqrsResponse', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    pqrs_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_internal: { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 0 },
  }, {
    tableName: 'pqrs_response',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });
  return PqrsResponse;
};
