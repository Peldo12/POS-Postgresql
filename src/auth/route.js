const express = require('express');
const router = express.Router();

const control = require('./controller');

const validateBody = require('../common/middleware/validateBody');
const {
  createSchema,
  refreshSchema,
  loginSchema,
  forgotSchema,
  newPass,
} = require('./validator');

const {
  authenticate,
  authBody,
} = require('../common/middleware/authentication');

const limit = require('../common/middleware/limiter');
const { authLimit } = require('../config/rateLimitConfig');
const { fiveMin } = require('../config/rateLimitTime');

router.post(
  '/register',
  limit(authLimit),
  validateBody(createSchema),
  control.register
);

router.get('/verify', limit(authLimit), control.emailVerify);

router.post(
  '/re-verify',
  limit(authLimit),
  validateBody(loginSchema),
  control.resendEmailVerify
);

router.post(
  '/login',
  validateBody(loginSchema),
  limit(authLimit, fiveMin),
  control.login
);

router.get('/me', authenticate, control.me);

router.post('/refresh', validateBody(refreshSchema), authBody, control.token);

router.post('/logout', authBody, limit(authLimit), control.logout);

router.post(
  '/forgot',
  validateBody(forgotSchema),
  limit(authLimit),
  control.forgotPass
);

router.patch(
  '/reset',
  validateBody(newPass),
  limit(authLimit),
  control.resetPass
);

module.exports = router;
