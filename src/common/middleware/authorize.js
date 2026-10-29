const AppError = require('../utils/AppError');

function authorize(allowedRoles = []) {
  if (!Array.isArray(allowedRoles))
    throw new AppError(400, 'Wrong type allowed roles');
  if (!allowedRoles.length) throw new AppError(400, 'No allowed roles given');
  return (req, res, next) => {
    try {
      const { role, emailVerified } = req.user;
      if (!emailVerified)
        throw new AppError(401, 'Your email was not verified');

      if (!allowedRoles.includes(role))
        throw new AppError(403, "You're not allowed to perform this action");

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = authorize;
