// src/middlewares/validate.middleware.js
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // reemplaza con el valor ya validado/coercionado
      return next();
    } catch (err) {
      return next(err); // el errorHandler ya sabe manejar ZodError
    }
  };
}

module.exports = { validate };