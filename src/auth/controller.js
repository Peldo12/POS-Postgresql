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
    const payload = await service.register(req.body);

    success({
      statusCode: 201,
      message: `User ${username} was registered`,
      data: { payload },
      res,
    });

    req.logger.info(
      `User ${username} was added, email was sended to ${email}`,
      {
        user: username,
        created: dateNow('iso'),
      }
    );
  } catch (error) {
    req.logger.error('Failed on register', { error });
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

    const result = await service.verifyEmail(token);

    success({
      message: 'Your email has verified',
      data: { payload: result },
      res,
    });

    req.logger.info(`User ${user.username} email was verified`, {
      user: user.username,
      verified_at: dateNow('iso'),
    });
  } catch (error) {
    req.logger.error('Failed on verify email', { error });
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
    const { message } = await service.resendVerification(req.body);

    success({
      message,
      res,
    });

    req.logger.info(`User ${username} resend verify email `, {
      user: username,
      send_at: dateNow('iso'),
    });
  } catch (error) {
    req.logger.error('Failed on resend verify email', { error });
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
    const { accessToken, refreshToken } = await service.login(req.body);

    success({
      message: `Login successful, welcome ${username}`,
      data: { accessToken, refreshToken },
      res,
    });

    req.logger.info(`User ${username} was login`, {
      user: username,
      login_at: dateNow('iso'),
    });
  } catch (error) {
    req.logger.error('Failed on login', { error });
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

    const { message } = await service.forgotPassword({ username });

    success({
      message,
      res,
    });

    req.logger.info(`User ${username} was request to reset password`, {
      user: username,
      requested_at: dateNow('iso'),
    });
  } catch (error) {
    req.logger.error('Failed on forgot pass', { error });
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
    const data = await service.resetPassword({
      token,
      password: repeatPassword,
    });

    success({
      message: 'Your password was changed',
      data: { payload: data },
      res,
    });
    req.logger.info(`User ${data.username} has changed her/him password`, {
      user: data.username,
      changed_at: dateNow('iso'),
    });
  } catch (error) {
    req.logger.error('Failed on reset pass', { error });
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

    const { user, accessToken } = await service.refreshToken({
      userId: id,
      refreshToken,
    });

    success({
      message: 'New access token generated',
      data: { accessToken },
      res,
    });

    req.logger.info(`user ${user.username} request new accessToken`, {
      user: user.username,
      requested_at: dateNow('iso'),
    });
  } catch (error) {
    req.logger.error('Failed on token request', { error });
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
    const { username, role } = user;

    success({
      message: `Onboard is ${username}`,
      data: { payload: { username, role } },
      res,
    });

    req.logger.info(`user ${username} request his/him profile`, {
      user: username,
      requested_at: dateNow('iso'),
    });
  } catch (error) {
    req.logger.error('Failed on profile request', { error });
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

    const { user_id, username } = await service.createToken({
      id,
      token: null,
      type: 'REFRESH_TOKEN',
    });

    success({
      message: 'You has logout',
      res,
    });

    req.logger.info(`user ${user_id} has logout`, {
      user: username,
      logout_at: dateNow('iso'),
    });
  } catch (error) {
    req.logger.error('Failed on logout', { error });
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
