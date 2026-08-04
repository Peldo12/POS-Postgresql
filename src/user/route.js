const express = require('express')
const router = express.Router()

const { authenticate } = require('../common/middleware/authentication')
const { users, byId, update } = require('./controller')

const validateParams = require('../common/middleware/validateParams')
const { idSchema } = require('../common/global')
  
router.use(authenticate)

router.get('/', users)
router.get('/:id', validateParams(idSchema), byId)
router.put('/:id/update', validateParams(idSchema), update)

module.exports = router