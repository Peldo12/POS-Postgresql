const express = require('express');
const router = express.Router();

const control = require('./controller');
const validate = require('../common/middleware/validate');

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
  validate.body(createSchema),
  control.register
);

router.get('/verify', limit(authLimit), control.verify);

router.post(
  '/re-verify',
  limit(authLimit),
  validate.body(loginSchema),
  control.resendVerify
);

router.post(
  '/login',
  validate.body(loginSchema),
  limit(authLimit, fiveMin),
  control.login
);

router.get('/me', authenticate, control.me);

router.post('/refresh', validate.body(refreshSchema), authBody, control.token);

router.post(
  '/logout',
  authenticate,
  authBody,
  limit(authLimit),
  control.logout
);

router.post(
  '/forgot',
  validate.body(forgotSchema),
  limit(authLimit),
  control.forgotPass
);

router.patch(
  '/reset',
  validate.body(newPass),
  limit(authLimit),
  control.resetPass
);

module.exports = router;
