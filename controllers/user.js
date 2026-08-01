const success = require('../helpers/response')
const sendEmail = require('../helpers/email')
const dateNow = require('../helpers/date')
const AppError = require('../utils/AppError')

const {
  getUsers,
  userById 
} = require('../models/user')

async function users(req, res, next) {
  try {
    const result = await getUsers({})
    
    success({
      message: 'Users loaded',
      data: {users: result},
      res
    })
  } catch (error) {
    next(error)
  }
}

async function byId(req, res, next) {
  try {
    const {id} = req.params 
    const found = await userById(id, 'EMAIL_VERIFY')
    if (!found) throw new AppError(404, 'User not found')
    
    success({
      message: `User id ${id} has loaded`,
      data: {users: [found]},
      res
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  users,
  byId
}