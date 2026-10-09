const service = require('./service');
const dateNow = require('../common/helpers/date');
const success = require('../common/helpers/response');
const AppError = require('../common/utils/AppError');

/**
 * @desc register user
 * @route POST /api/auth/register
 * @require body { username, email, password }
 * @access Public
 */
async function register(req, res, next) {
  try {
    const { username, email } = req.body;
    const { userId } = await service.register(req.body);

    success({
      statusCode: 201,
      message: `Registration successful, check ${email} to verify`,
      res,
    });

    req.logger.info('User registered', {
      userId,
      username,
      action: 'register',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc verify email user
 * @route PUT /api/auth/verify?token=
 * @require query { token }
 * @access registered user
 */
async function verify(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) throw new AppError(400, 'Token is required');

    const { userId, username } = await service.verifyEmail(token);

    success({
      message: 'Your email has verified',
      res,
    });

    req.logger.info('An email was verified', {
      userId,
      username,
      action: 'verify',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc resend verify email user
 * @route POST /api/auth/re-verify
 * @require body { username, password }
 * @access registered user
 */
async function resendVerify(req, res, next) {
  try {
    const { username } = req.body;
    const { userId, message } = await service.resendVerification(req.body);

    success({
      message,
      res,
    });

    req.logger.info('Email verify was resend', {
      userId,
      username,
      action: 'resend',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc user login, generate token
 * @route POST /api/auth/login
 * @require body { username/email, password }
 * @access Public
 */
async function login(req, res, next) {
  try {
    const { username } = req.body;
    const { userId, accessToken, refreshToken } = await service.login(req.body);

    success({
      message: `Login successful, welcome ${username}`,
      data: { accessToken, refreshToken },
      res,
    });

    req.logger.info('User was login', {
      userId,
      username,
      action: 'login',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc send reset pass to email
 * @route POST /api/auth/forgot
 * @require body { username/email }
 * @access Atleast registered user
 */
async function forgotPass(req, res, next) {
  try {
    const { username } = req.body;
    if (!username) throw new AppError(400, 'No username has given');

    const { userId, message } = await service.forgotPassword({ username });

    success({
      message,
      res,
    });

    req.logger.info('Request reset password', {
      userId,
      username,
      action: 'forgot',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc update user password
 * @route PATCH /api/auth/reset
 * @require body { password, repeatPassword }
 * @access Atleast registered user
 */
async function resetPass(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) throw new AppError(400, 'Token is required');
    const { repeatPassword } = req.body;
    const { userId, username } = await service.resetPassword({
      token,
      password: repeatPassword,
    });

    success({
      message: 'Your password was changed',
      res,
    });
    req.logger.info('User changed password', {
      userId,
      username,
      action: 'reset',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc give user access token
 * @route POST /api/auth/refresh
 * @require body { refreshToken }
 * @access Atleast verified email
 */
async function token(req, res, next) {
  try {
    const { id } = req.user;
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError(400, 'No token has given');

    const { userId, username, accessToken } = await service.refreshToken({
      userId: id,
      refreshToken,
    });

    success({
      message: 'New access token generated',
      data: { accessToken },
      res,
    });

    req.logger.info('User request accessToken', {
      userId,
      username,
      action: 'refresh',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc give user refresh token
 * @route GET /api/auth/me
 * @require headers Authorization Bearer { token }
 * @access Atleast verified email
 */
async function me(req, res, next) {
  try {
    const { id } = req.user;
    const { user } = await service.getById({ userId: id });
    const { username } = user;

    success({
      message: 'User still onboard',
      res,
    });

    req.logger.info('User request profile', {
      userId: id,
      username,
      action: 'profile',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

/**
 * @desc remove user refresh token
 * @route POST /api/auth/logout
 * @require Authorization Bearer { token }, body { refreshToken }
 * @access Atleast user at login
 */
async function logout(req, res, next) {
  try {
    const { id } = req.user;
    await service.getById({ userId: id });

    const { username } = await service.createToken({
      id,
      token: null,
      type: 'REFRESH_TOKEN',
    });

    success({
      message: 'You has logout',
      res,
    });

    req.logger.info('User logout', {
      userId: id,
      username,
      action: 'logout',
    });
  } catch (error) {
    req.logger.error(error.message, { stack: error.stack });
    next(error);
  }
}

module.exports = {
  register,
  login,
  verify,
  resendVerify,
  me,
  token,
  logout,
  forgotPass,
  resetPass,
};
