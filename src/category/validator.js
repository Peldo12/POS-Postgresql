const joi = require('../config/joi');

const categorySchema = joi
  .object({
    name: joi.string().min(3).max(255).required().label('Category Name'),
    description: joi.string().min(5).max(255).optional().label('Description'),
  })
  .required()
  .label('Body');

const idSchema = joi.object({
  id: joi.number().integer().positive().label('ID'),
});

module.exports = { categorySchema, idSchema };
