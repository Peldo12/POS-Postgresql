const joi = require('../config/joi')

const createSchema = joi.object({
  products: joi.array().items({
    id: joi.number().required().label('ID Product'),
    quantity: joi
      .number().min(1).required().label('Quantity Order'),
    sell: joi.number().min(1).required().label('Price')
  }).required().label('List Products'),
  payment: joi.object({
    total: joi.
      number().min(1).required().label('Total Payment'),
    method: joi
      .string().valid('cash', 'qris')
      .required().label('Method'),
  }).required().label('Payment')
}).required().label('Schema Order')

const filterSchema = joi.object({
  productid: joi
    .number().integer().positive().optional().label('ID'),
  method: joi
    .string().valid('cash', 'qris')
    .optional().label('Method'),
  page: joi
    .number().integer().min(1).optional().label('Page'),
  limit: joi
    .number().integer()
    .min(1).max(100).optional().label('Limit'),
  sort: joi
    .string().valid('id', 'name', 'price')
    .optional().label('Sort'),
  orderBy: joi
    .string().valid('ASC', 'DESC')
    .optional().label('Order By')
}).optional().label('Filter Schema')

module.exports = { createSchema, filterSchema }