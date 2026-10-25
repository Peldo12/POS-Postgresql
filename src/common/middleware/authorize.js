const AppError = require('../utils/AppError');

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const { role, emailVerified } = req.user;
      if (!emailVerified)
        throw new AppError(401, 'Your email was not verified');

      if (!allowedRoles.includes(role))
        throw new AppError(403, "You're not allowed to perform this action");

      next();
    } catch (error) {
      req.logger.error(error.message, { stack: error.stack });
      next(error);
    }
  };
}

module.exports = authorize;
