const express = require('express');
const router = express.Router();
const { authenticate, limit, validate } = require('../config/routeConfig');

const control = require('./controller');

const {
  createSchema,
  refreshSchema,
  loginSchema,
  forgotSchema,
  newPass,
} = require('./validator');

router.post(
  '/register',
  limit(60),
  validate.body(createSchema),
  control.register
);

router.get('/verify', limit(60), control.verify);

router.post(
  '/re-verify',
  limit(60),
  validate.body(loginSchema),
  control.resendVerify
);

router.post('/login', validate.body(loginSchema), limit(60), control.login);

router.get('/me', authenticate.headers, control.me);

router.post(
  '/refresh',
  validate.body(refreshSchema),
  authenticate.body,
  control.getToken
);

router.post('/logout', authenticate.headers, limit(60), control.logout);

router.post(
  '/forgot',
  validate.body(forgotSchema),
  limit(60),
  control.forgotPass
);

router.patch('/reset', validate.body(newPass), limit(60), control.resetPass);

module.exports = router;
