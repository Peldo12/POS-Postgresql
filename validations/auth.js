const joi = require('../config/joi');

const createSchema = joi.object({
  username: joi
    .string().alphanum().min(4).max(32)
    .required().label('Username'),
  email: joi.string().email({
    minDomainSegments: 2,
    tlds: { allow: ['com', 'net'] },
  }).required().label('Email'),
  password: joi
    .string().min(5).required().label('Password')
}).required().label('Body')

const loginSchema = joi.object({
  username: joi.
    string().required().label('Username or Email'),
  password: joi
    .string().min(5).required().label('Password')
}).required().label('Body')

const refreshSchema = joi.object({
  refreshToken: joi
    .string().required().label('Refresh Token')
}).required().label('Body')

const newPass = joi.object({
  password: joi
    .string().min(5)
    .required().label('Password'),
  repeatPassword: joi.
    ref('password')
}).required().label('Body')

module.exports = { createSchema, loginSchema,  refreshSchema, newPass };