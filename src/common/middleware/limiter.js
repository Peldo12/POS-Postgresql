const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')

const basicConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const ip = ipKeyGenerator(req, res)
    return ip + (req.body.username || "")
  },
  skip: (req, res) => {
    return req.user && req.user.role === 'super_admin'
  }
}

const limit = (maxRequest = 30, windowMs = 60 * 60 * 1000) => {
  return rateLimit({
    windowMs: windowMs,
    max: maxRequest,
    ...basicConfig,
    handler: (req, res, next, options) => {
      req.logger.warn(`IP ${req.user.username || req.ip} has reach out limit request on route ${req.originalUrl}`)
      res.status(options.statusCode).json({
        status: "fail",
        message: "Too many request, try again later",
        retryAfter: `${options.windowMs / 1000}s`
      })
    },
  })
}

module.exports = limit
