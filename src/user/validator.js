const joi = require('../config/joi');

const updateSchema = joi.object({
  username: joi.string().alphanum().min(4).max(32).optional().label('Username'),
  email: joi
    .string()
    .email({
      minDomainSegments: 2,
      tlds: { allow: ['com', 'net'] },
    })
    .required()
    .label('Email'),
  role: joi.number().integer().positif().optional().label('Role'),
  deleted: joi.string().valid('true', 'false').optional().label('Deleted'),
});

const filterSchema = joi
  .object({
    search: joi.string().optional().label('Search'),
    date: joi.date().iso().optional().label('Date'),
    range: joi
      .string()
      .valid('today', 'week', 'month', 'year')
      .optional()
      .label('Range'),
    start: joi.date().iso().optional().label('Start'),
    end: joi.date().iso().optional().label('End'),
    page: joi.number().integer().min(1).optional().label('Page'),
    limit: joi.number().integer().min(1).max(100).optional().label('Limit'),
    sort: joi.string().valid('id', 'createdAt').optional().label('Sort'),
    orderBy: joi.string().valid('ASC', 'DESC').optional().label('Order By'),
  })
  .with('start', 'end')
  .with('end', 'start')
  .oxor('date', 'range', 'start')
  .optional()
  .label('Filter Schema');

module.exports = { updateSchema, filterSchema };
