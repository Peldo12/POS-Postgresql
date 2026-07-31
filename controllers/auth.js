const bcrypt = require('bcryptjs')

const generateToken = require('../helpers/token')
const generateCrypto = require('../helpers/crypto')
const dateNow = require('../helpers/date')

const { userById } = require('../models/user')
const { userByUsernameOrEmail, userByIdentifier,  userByToken, registerUser, createOrUpdateToken, updateUserVerify, updateUserPass } = require('../models/auth')
const success = require('../helpers/response')
const sendEmail = require('../helpers/email')
const AppError = require('../utils/AppError')

/**
 * @desc register user
 * @route POST /api/auth/register
 * @access Public
 */
async function register(req, res, next) {
  try {
    const {username, email} = req.body
    const user = await userByUsernameOrEmail({username, email})
    if (user) {
      const params = []
      if (user.username === username) {
        params.push("Username")
      }
      if (user.email === email) {
        params.push("Email")
      }
      const current = params.length > 1 ? params.join(" & ") : params.join("");
      throw new AppError(409, `${current} already registered`)
    }
      
    const result = await registerUser({...req.body})
    const payload = {
      id: result.id,
      username: result.username,
      role: result.role
    }
      
    success({
      statusCode: 201,
      message: `User ${username} was registered`,
      data: {payload},
      res})
      
    sendEmail({
      email,
      subject: "Verify your email",
      html: `${process.env.EMAIL_VERIFY_URL}${result.emailToken}`
    })
      .then(() => {
        req.logger.info("Success send email token", {
          user: username,
          sended: dateNow("iso")
        })
      })
      .catch(err => {
        req.logger.error("Failed send email:", err)
      })
        
    req.logger.info(`User ${username} was added, email was sended to ${email}`, {
      user: username,
      created: dateNow("iso")
    })
      
    return
  } catch (e) {
    req.logger.error("Failed on register", {error: e})
    next(e)
  }
}

/**
 * @desc user login, generate token
 * @route POST /api/auth/login
 * @access Public
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body
    const found = await userByIdentifier(username)
    if (!found) throw new AppError(404, "Username or email not registered")
    if (found.deleted_at) throw new AppError(403, "Your account was deleted, contact admin")
    if (!found.email_verified_at) throw new AppError(401, "Your email not yet verified")
    const match = await bcrypt.compare(password, found.password)
    if (!match) throw new AppError(401, "Invalid Credentials")
      
    const payload = {
      id: found.id,
      username: found.username,
      email_verified_at: found.email_verified_at,
      role: found.role,
      login_at: dateNow(),
      generated_at: dateNow("iso")
    }
    const accessToken = generateToken({payload})
    const refreshToken = generateToken({
      payload,
      type: "refresh"
    })
      
    await createOrUpdateToken(found.id, refreshToken, "REFRESH_TOKEN")
      
    success({
      message: `Login successful, welcome ${found.username}`,
      data: {accessToken, refreshToken},
      res})
      
    req.logger.info(`User ${username} was login`, {
      user: username,
      login_at: dateNow("iso")
    })
  } catch (e) {
    req.logger.error("Failed on login", {error: e})
    next(e)
  }
}

/**
 * @desc verify email user
 * @route PUT /api/auth/verify?token=
 * @access registered user
 */
async function emailVerify(req, res, next) {
  try {
    const {token} = req.query
    if (!token) throw new AppError(400, "Token is required")
    
    const user = await userByToken("EMAIL_VERIFY", token)
    if (!user) throw new AppError(404, "Invalid verification token")
    if (user.used_at) throw new AppError(400, "Your token already been used")
    if (new Date(user.expired_at) < new Date()) throw new AppError(410, "Verification token has expired")
      
    const result = await updateUserVerify(user.user_id)
    success({
      message: "Your email has verified",
      data: {payload: result},
      res
    })
       
    req.logger.info(`User ${user.username} email was verified`, {
      user: user.username,
      verified_at: dateNow("iso")
    })
  } catch (e) {
    req.logger.error("Failed on verify email", {error: e})
    next(e)
  }
}

/**
 * @desc give user refresh token
 * @route GET /api/auth/me
 * @access Atleast verified email
 */
async function me(req, res, next) {
  try {
    const {id} = req.user
    const user = await userById(id)
    if (!user) throw new AppError(404, "Username not found") 
    if (user.deleted_at) throw new AppError(403, "Your account was deleted, contact admin")
    if (!user.token) throw new AppError(500, "Please login")    
    const {username, role, token} = user
    success({
      message: `Onboard is ${username}`,
      data: { payload: {username, role}, refreshToken: token },
      res
    })
      
    req.logger.info(`user ${username} request his/him profile`, {
      user: username,
      requested_at: dateNow("iso")
    })
  } catch (e) {
    req.logger.error("Failed on profile request", {error: e})
    next(e)
  }
}

/**
 * @desc give user access token
 * @route POST /api/auth/refresh
 * @access Atleast verified email
 */
async function token(req, res, next) {
  try {
    const {id} = req.user
    const {refreshToken} = req.body
    const user = await userById(id)
    if (!user) throw new AppError(404, "User not found")
    if (user.deleted_at) throw new AppError(403, "Your account was deleted, contact admin")
    if (!user.token) throw new AppError(500, "Please login first")
    if (user.token !== refreshToken) throw new AppError(403, "Refresh token mismatch")
      
    const payload = {
      id: user.id,
      username: user.username,
      email_verified_at: user.email_verified_at,
      role: user.role,
      login_at: user.last_login_at,
      generated_at: dateNow("iso")
    }
    const accessToken = generateToken({payload})
      
    success({
      message: "New access token generated",
      data: {accessToken},
      res
    })
      
    req.logger.info(`user ${user.username} request new accessToken`, {
      user: user.username,
      requested_at: dateNow("iso")
    })
  } catch (e) {
    req.logger.error("Failed on token request", {error: e})
    next(e)
  }
}

/**
 * @desc remove user refresh token
 * @route POST /api/auth/logout
 * @access Atleast user at login
 */
async function logout(req, res, next) {
  try {
    const {id} = req.user
    const user = await userById(id)
    if (!user) throw new AppError(404, "User not found")
    if (!user.token) throw new AppError(500, "Please login first")
      
    const ended = await createOrUpdateToken(id, null, "REFRESH_TOKEN")
    success({
      message: `User ${ended.user_id} has logout`,
      data: {payload: ended},
      res
    })
      
    req.logger.info(`user ${ended.user_id} has logout`, {
      user: ended.username,
      logout_at: dateNow("iso")
    })
  } catch (e) {
    req.logger.error("Failed on logout", {error: e})
    next(e)
  }
}

/**
 * @desc send reset pass to email
 * @route POST /api/auth/forgot
 * @access Atleast registered user
 */
async function forgotPass(req, res, next) {
  try {
    const user = await userByIdentifier(req.body.username)
    const {id, username, email, role} = user
    if (!user) throw new AppError(404, "Your account not found")
    if (user.deleted_at) throw new AppError(404, "Your account was deleted, contact admin")
      
    const payload = {
      id,
      username,
      role,
      generated_at: dateNow("iso")
    }
    const token = generateCrypto("password")
    const data = createOrUpdateToken(user.id, token, "PASSWORD_RESET")
      
    success({
      message: "Check your email",
      data: {payload},
      res
    })
      
    sendEmail({
      email: email,
      subject: "Reset your password",
      html: `${process.env.PASS_RESET_URL}${token}`
    })
      .then(() => {
        req.logger.info("Success send reset password token", {
          user: username,
          sended: dateNow("iso")
        })
      })
      .catch(err => {
        req.logger.error("Failed send email:", err)
      })
      
    req.logger.info(`User ${username} was request to reset password`, {
      user: username,
      requested_at: dateNow("iso")
    })
  } catch (error) {
    req.logger.error("Failed on forgot pass", {error})
    next(error)
  }
}

/**
 * @desc update user password
 * @route PATCH /api/auth/reset
 * @access Atleast registered user
 */
async function resetPass(req, res, next) {
  try {
    const {token} = req.query
    const {repeatPassword} = req.body
    const user = await userByToken("PASSWORD_RESET", token)
    if (!user) throw new AppError(404, "Invalid reset password token")
    if (user.used_at) throw new AppError(400, "Your token already been used")
    if (new Date(user.expired_at) < new Date()) throw new AppError(410, "Verification token has expired")
      
    const data = await updateUserPass(user.user_id, repeatPassword)
    success({
      message: "Your password was changed",
      data: {payload: data},
      res
    })
    req.logger.info(`User ${data.username} has changed her/him password`, {
      user: data.username,
      changed_at: dateNow("iso")
    })
  } catch (error) {
    req.logger.error("Failed on reset pass", {error})
    next(error)
  }
}

module.exports = { register, login, emailVerify, me, token, logout, forgotPass, resetPass }