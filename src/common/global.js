const joi = require('../config/joi')

const idSchema = joi.object({
  id: joi
    .number().integer().positive().required().label('ID')
})

module.exports = { idSchema }