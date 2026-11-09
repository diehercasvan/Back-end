module.exports = (sequelize, DataTypes) => {
  const UserStatus = sequelize.define('UserStatus', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
  }, { tableName: 'user_status' });
  return UserStatus;
};
