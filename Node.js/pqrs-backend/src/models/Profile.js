module.exports = (sequelize, DataTypes) => {
  const Profile = sequelize.define('Profile', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    first_name: { type: DataTypes.STRING(50), allowNull: false },
    last_name: { type: DataTypes.STRING(50), allowNull: false },
    address: { type: DataTypes.STRING(255) },
    phone: { type: DataTypes.STRING(20) },
    document_type_id: { type: DataTypes.INTEGER, allowNull: false },
    document_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    photo_url: { type: DataTypes.STRING(255) },
    birth_date: { type: DataTypes.DATEONLY },
  }, { tableName: 'profile' });
  return Profile;
};
