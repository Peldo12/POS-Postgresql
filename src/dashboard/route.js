const express = require('express');
const router = express.Router();

const control = require('./controller');

router.get('/', control.dashboard);

module.exports = router;
