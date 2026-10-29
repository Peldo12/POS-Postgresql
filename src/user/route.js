const express = require('express');
const router = express.Router();
const control = require('./controller');
const {
  authenticate,
  validate,
  idString,
  authorize,
} = require('../config/routeConfig');

const { OWNER, SUPER_ADMIN } = require('../constants/roles');

router.use(authenticate.headers);
router.use(authorize([OWNER, SUPER_ADMIN]));

router.get('/', control.users);
router.get('/:id', validate.params(idString), control.byId);

module.exports = router;
