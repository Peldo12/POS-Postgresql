const joi = require('../config/joi');

const idNumber = joi.object({
  id: joi.number().integer().positive().required().label('ID'),
});

const idString = joi.object({
  id: joi.string().uuid().required().label('ID'),
});

module.exports = { idNumber, idString };
