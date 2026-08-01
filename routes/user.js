const express = require('express')
const router = express.Router()

const { authenticate } = require('../middleware/authentication')
const { users, byId } = require('../controllers/user')

const validateParams = require('../middleware/validateParams')
const { idSchema } = require('../validations/global')
  
router.use(authenticate)

router.get('/', users)
router.get('/:id', validateParams(idSchema), byId)

module.exports = router