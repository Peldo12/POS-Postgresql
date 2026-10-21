const joi = require('../config/joi');

const createSchema = joi
  .object({
    products: joi
      .array()
      .items({
        id: joi.number().required().label('ID Product'),
        quantity: joi
          .number()
          .integer()
          .min(1)
          .required()
          .label('Quantity Order'),
      })
      .required()
      .label('List Products'),
    payment: joi
      .object({
        discount: joi.number().min(0).required().label('Discount'),
        tax: joi.number().min(0).required().label('Tax'),
        method: joi
          .string()
          .valid('cash', 'qris')
          .required()
          .label('Payment Method'),
      })
      .required()
      .label('Payment'),
  })
  .required()
  .label('Schema Order');

const filterSchema = joi
  .object({
    search: joi.string().optional().label('Search'),
    method: joi.string().valid('cash', 'qris').optional().label('Method'),
    status: joi
      .string()
      .valid('paid', 'pending', 'cancelled')
      .optional()
      .label('Status'),
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
    sort: joi
      .string()
      .valid('id', 'userId', 'method', 'status', 'total', 'createdAt')
      .optional()
      .label('Sort'),
    orderBy: joi.string().valid('ASC', 'DESC').optional().label('Order By'),
  })
  .with('start', 'end')
  .with('end', 'start')
  .oxor('date', 'range', 'start')
  .optional()
  .label('Filter Schema');

const orderIdSchema = joi
  .object({
    orderId: joi
      .string()
      .uuid({ version: 'uuidv4' })
      .required()
      .label('ID Order'),
  })
  .label('ID Schema');

module.exports = { createSchema, filterSchema, orderIdSchema };
