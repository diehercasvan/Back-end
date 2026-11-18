// src/controllers/security/index.js
module.exports = {
  catalog: require('./catalog.controller'),
  role: require('./role.controller'),
  user: require('./user.controller'),
  profile: require('./profile.controller'),
  module: require('./module.controller'),
};