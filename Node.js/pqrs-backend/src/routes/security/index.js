// src/routes/security/index.js
module.exports = {
  catalog: require('./catalog.routes'),
  role: require('./role.routes'),
  user: require('./user.routes'),
  profile: require('./profile.routes'),
  module: require('./module.routes'),
};