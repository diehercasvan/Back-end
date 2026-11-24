// src/controllers/auth/index.js
module.exports = {
  ...require('./auth.controller'),
  ...require('./permissions.controller'),   // ← NUEVO
};