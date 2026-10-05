const bcrypt = require('bcryptjs');

const service = require('./service');
const generateToken = require('../common/helpers/token');
const generateCrypto = require('../common/helpers/crypto');
const dateNow = require('../common/helpers/date');
const success = require('../common/helpers/response');
const sendEmail = require('../common/helpers/email');
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
    const user = await service.getByNameOrEmail({
      username,
      email,
    });

    if (user) {
      const params = [];
      if (user.username === username) {
        params.push('Username');
      }
      if (user.email === email) {
        params.push('Email');
      }
      const current = params.length > 1 ? params.join(' & ') : params.join('');
      throw new AppError(409, `${current} already registered`);
    }

    const result = await service.register({ ...req.body });
    const payload = {
      username: result.username,
      role: result.role_id,
    };

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
  } catch (e) {
    req.logger.error('Failed on register', { error: e });
    next(e);
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
    const { username, password } = req.body;
    const found = await service.getByIdentifier(username);
    if (!found) throw new AppError(404, 'Username or email not registered');
    if (found.deleted_at)
      throw new AppError(403, 'Your account was deleted, contact admin');
    if (!found.email_verified_at)
      throw new AppError(401, 'Your email not yet verified');
    const match = await bcrypt.compare(password, found.password);
    if (!match) throw new AppError(401, 'Invalid Credentials');

    const payload = {
      id: found.id,
      username: found.username,
      email_verified_at: found.email_verified_at,
      role: found.role,
      login_at: dateNow(),
      generated_at: dateNow('iso'),
    };
    const accessToken = generateToken({ payload });
    const refreshToken = generateToken({
      payload,
      type: 'refresh',
    });

    await service.createToken({
      id: found.id,
      token: refreshToken,
      type: 'REFRESH_TOKEN',
    });

    success({
      message: `Login successful, welcome ${found.username}`,
      data: { accessToken, refreshToken },
      res,
    });

    req.logger.info(`User ${username} was login`, {
      user: username,
      login_at: dateNow('iso'),
    });
  } catch (e) {
    req.logger.error('Failed on login', { error: e });
    next(e);
  }
}

/**
 * @desc verify email user
 * @route PUT /api/auth/verify?token=
 * @require query { token }
 * @access registered user
 */
async function emailVerify(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) throw new AppError(400, 'Token is required');

    const found = await service.byToken(`email-token:${token}`);
    if (!found) throw new AppError(400, 'Invalid or expired token');
    const user = await service.getByIdentifier(found);

    if (user.deleted_at)
      throw new AppError(403, 'Your account was deleted, contact admin');
    if (user.email_verified_at)
      throw new AppError(401, 'Your email already verified');

    const result = await service.verifyEmail(user.id);
    await service.removeToken(`email-token:${token}`);

    success({
      message: 'Your email has verified',
      data: { payload: result },
      res,
    });
    console.log({ found, user, result });

    req.logger.info(`User ${user.username} email was verified`, {
      user: user.username,
      verified_at: dateNow('iso'),
    });
  } catch (e) {
    req.logger.error('Failed on verify email', { error: e });
    next(e);
  }
}

/**
 * @desc resend verify email user
 * @route POST /api/auth/re-verify
 * @require body { username, password }
 * @access registered user
 */
async function resendEmailVerify(req, res, next) {
  try {
    const { username, password } = req.body;
    const found = await service.getByIdentifier(username);
    if (!found) throw new AppError(404, 'Username or email not registered');
    if (found.deleted_at)
      throw new AppError(403, 'Your account was deleted, contact admin');
    if (found.email_verified_at)
      throw new AppError(401, 'Your email already verified');

    const match = await bcrypt.compare(password, found.password);
    if (!match) throw new AppError(401, 'Invalid Credentials');

    const token = await generateCrypto('email');
    await service.saveToken({
      key: `email-token:${token}`,
      value: found.id,
      payload: {
        EX: 60 * 60 * 1000,
      },
    });

    await service.sendToken({
      token,
      email: found.email,
      subject: 'Verify your email',
      type: 'email',
    });

    success({
      message: 'Verification email has resend',
      res,
    });

    req.logger.info(`User ${found.username} resend verify email `, {
      user: found.username,
      send_at: dateNow('iso'),
    });
  } catch (e) {
    req.logger.error('Failed on resend verify email', { error: e });
    next(e);
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
    const user = await service.getById({ userId: id });

    if (!user) throw new AppError(404, 'Username not found');
    if (user.deleted_at)
      throw new AppError(403, 'Your account was deleted, contact admin');
    if (!user.token) throw new AppError(500, 'Please login');

    const { username, role, token } = user;
    success({
      message: `Onboard is ${username}`,
      data: { payload: { username, role }, refreshToken: token },
      res,
    });

    req.logger.info(`user ${username} request his/him profile`, {
      user: username,
      requested_at: dateNow('iso'),
    });
  } catch (e) {
    req.logger.error('Failed on profile request', { error: e });
    next(e);
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

    const user = await service.getById({ userId: id });

    if (!user) throw new AppError(404, 'User not found');
    if (user.deleted_at)
      throw new AppError(403, 'Your account was deleted, contact admin');
    if (!user.token) throw new AppError(500, 'Please login first');
    if (user.token !== refreshToken)
      throw new AppError(403, 'Refresh token mismatch');

    const payload = {
      id: user.id,
      username: user.username,
      email_verified_at: user.email_verified_at,
      role: user.role,
      login_at: user.last_login_at,
      generated_at: dateNow('iso'),
    };
    const accessToken = generateToken({ payload });

    success({
      message: 'New access token generated',
      data: { accessToken },
      res,
    });

    req.logger.info(`user ${user.username} request new accessToken`, {
      user: user.username,
      requested_at: dateNow('iso'),
    });
  } catch (e) {
    req.logger.error('Failed on token request', { error: e });
    next(e);
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
    const user = await service.getById({ userId: id });
    if (!user) throw new AppError(404, 'User not found');
    if (!user.token) throw new AppError(500, 'Please login first');

    const ended = await service.createToken({
      id,
      token: null,
      type: 'REFRESH_TOKEN',
    });

    success({
      message: `User ${ended.user_id} has logout`,
      data: { payload: { username: user.username, status: 'logout' } },
      res,
    });

    req.logger.info(`user ${ended.user_id} has logout`, {
      user: ended.username,
      logout_at: dateNow('iso'),
    });
  } catch (e) {
    req.logger.error('Failed on logout', { error: e });
    next(e);
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

    const user = await service.getByIdentifier(username);
    if (!user) throw new AppError(404, 'Requested account not registered');
    if (user.deleted_at)
      throw new AppError(404, 'Your account was deleted, contact admin');

    const { id, email, role } = user;
    const payload = {
      username,
      role,
      generated_at: dateNow('iso'),
    };
    const token = generateCrypto('password');

    const key = `pass-token:${token}`;
    await service.saveToken({
      key,
      value: id,
      payload: {
        EX: 15 * 60 * 1000,
        NX: true,
      },
    });

    await service.sendToken({
      key,
      email,
      subject: 'Reset your password',
      type: 'pass',
    });

    success({
      message: 'Check your email',
      data: { payload },
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
    const found = await service.byToken(`pass-token:${token}`);
    if (!found) throw new AppError(400, 'Invalid or expired token');

    const user = await service.getByIdentifier(found);
    if (user.deleted_at)
      throw new AppError(403, 'Your account was deleted, contact admin');
    if (!user.email_verified_at)
      throw new AppError(401, 'Your email not verified');

    const data = await service.resetPass({
      userId: user.id,
      password: repeatPassword,
      token,
    });
    if (!data) throw new AppError(500, 'Server problem');

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

module.exports = {
  register,
  login,
  emailVerify,
  resendEmailVerify,
  me,
  token,
  logout,
  forgotPass,
  resetPass,
};
