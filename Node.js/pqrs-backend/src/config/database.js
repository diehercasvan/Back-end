// src/config/database.js
const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(
  env.DB_NAME,
  env.DB_USER,
  env.DB_PASSWORD,
  {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: env.DB_DIALECT,
    logging: env.DB_LOGGING ? console.log : false,
    timezone: '+00:00',
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      freezeTableName: true,
    },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
);

module.exports = sequelize;