const jwt = require('jsonwebtoken')

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) throw new Error("Token required")
    
    const [scheme, token] = authHeader.split(" ")
    
    if (scheme !== "Bearer") throw new Error("Wrong token format")

    if (!token) throw new Error("Token not Found")
    
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET)
    req.user = decoded
    next()
  } catch (e) {
    const err = new Error(e.message || "Unauthorized")
    err.statusCode = 401
    next(err)
  }
}

function authBody(req, res, next) {
  try {
    const {refreshToken} = req.body
    if (!refreshToken) throw new Error("Refresh Token is required")
    
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET)
    req.user = decoded
    next()
  } catch (e) {
    next(e)
  }
}

function authParams(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) throw new Error("Token required")
    
    const [scheme, token] = authHeader.split(" ")
    if (scheme !== "Bearer") throw new Error("Wrong token format")
    if (!token) throw new Error("Token not Found")
    
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET)
    
    req.user = decoded
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = { authenticate, authBody }