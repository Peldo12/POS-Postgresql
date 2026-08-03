const joi = require('../config/joi')

const updateSchema = joi.object({
  username: joi
    .string().alphanum().min(4).max(32)
    .optional().label('Username'),
  email: joi.string().email({
    minDomainSegments: 2,
    tlds: { allow: ['com', 'net'] },
  }).required().label('Email'),
  role: joi.number().integer().positif()
    .optional().label('Role'),
  deleted: joi.string().valid('true', 'false')
    .optional().label('Deleted')
})