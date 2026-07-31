const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const { username, role, email_verified_at } = req.user;
      if (!email_verified_at) throw new AppError(401, "Your email was not verified")
      if (!allowedRoles.includes(role)) {
        throw new AppError(403, "You're not allowed to perform this action");
      }
      next()
    } catch (e) {
      req.logger.error(`Failed authorization for user ${req.user?.username}`, {error: e})
      next(e)
    }
  }
}

function getAccess(role) {
  const result = 0
  switch (role) {
    case 'super_admin':
      result += 1
    case 'admin':
      result += 2
    case 'user':
      result += 4
      break
  }
  return result
}

module.exports = authorize