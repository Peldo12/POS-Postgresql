const express = require('express')
const router = express.Router()

const { register, login, emailVerify, me, token, logout, forgotPass, resetPass } = require('./controller')

const validateBody = require('../common/middleware/validateBody')
const { 
  createSchema, refreshSchema, loginSchema, forgotSchema, newPass 
} = require("./validator")

const {
  authenticate, authBody
} = require('../common/middleware/authentication')

const limit = require('../common/middleware/limiter')
const { authLimit } = require('../config/rateLimitConfig')
const { fiveMin } = require('../config/rateLimitTime')

router.post(
  "/register",
  limit(authLimit),
  validateBody(createSchema),
  register
)

router.get(
  "/verify", 
  limit(authLimit),
  emailVerify
)

router.post(
  "/login",
  validateBody(loginSchema),
  limit(authLimit, fiveMin),
  login
)

router.get(
  "/me", 
  authenticate,
  me
)

router.post(
  "/refresh",
  validateBody(refreshSchema),
  authBody,
  token
)

router.post(
  "/logout", 
  authBody,
  limit(authLimit), 
  logout
)

router.post(
  "/forgot",
  validateBody(forgotSchema), 
  limit(authLimit), 
  forgotPass
)

router.patch(
  "/reset", 
  validateBody(newPass),
  limit(authLimit),
  resetPass
)

module.exports = router