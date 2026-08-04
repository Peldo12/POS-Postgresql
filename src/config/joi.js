const Joi = require('joi')

const joi = Joi.defaults((schema) => {
  return schema.options({
    messages: {
      'string.base': '{#label} must a string',
      'string.alphanum': '{#label} must a string and number only',
      'string.empty': '{#label} still empty',
      'string.min': '{#label} minimun {#limit} characters',
      'string.max': '{#label} maximum {#limit} characters',
      'string.email': 'Format {#label} not valid',
      'number.base': '{#label} must a number',
      'number.integer': '{#label} must an integer',
      'number.min': '{#label} minimun {#limit}',
      'number.max': '{#label} maximum {#limit}',
      'any.required': '{#label} is required'
    },
    errors: { 
      wrap: { label: false } 
    }
  })
})

// custom 'any.only' / Joi.string().valid("L", "P")

module.exports = joi