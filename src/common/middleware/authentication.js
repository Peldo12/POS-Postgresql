const jwt = require('jsonwebtoken');
const { verifyJWT } = require('../helpers/jwt');
function headers(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error('Token required');

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer') throw new Error('Wrong token format');
    if (!token) throw new Error('Token still empty');

    const decoded = verifyJWT({ token });
    req.user = decoded;
    next();
  } catch (e) {
    const err = new Error(e.message || 'Unauthorized');
    err.statusCode = 401;
    next(err);
  }
}

function body(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new Error('Refresh Token is required');

    const decoded = verifyJWT({ token: refreshToken, type: 'refresh' });
    req.user = decoded;
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { headers, body };
