const joi = require('../config/joi')

const createProductSchema = joi.object({
  sku: joi
    .string().alphanum().required().label('SKU'),
  barcode: joi
    .string().alphanum()
    .min(3).required().label('Barcode'),
  name: joi.string().required().label('Name'),
  buy: joi.number().positive().required().label('Buy'),
  sell: joi.number().positive().required().label('Sell'),
  category_id: joi
    .number().integer()
    .min(1).required().label('Category ID'),
  stock: joi
    .number().integer().positive()
    .default(0).optional().label('Stock'),
  minimum_stock: joi
    .number().integer().positive()
    .default(5).optional().label('Minimum stock'),
  weight: joi.number().positive().label('Weight'),
  image: joi
    .string().optional().allow(null).label('Image'),
}).required().unknown(false).label('Product Schema')

const updateProductSchema = joi.object({
  sku: joi.string().required().label('SKU'),
  barcode: joi.string().min(3).required().label('Barcode'),
  name: joi.string().required().label('Name'),
  buy: joi.number().min(0).required().label('Buy'),
  sell: joi.number().min(0).required().label('Sell'),
  category_id: joi
    .number().integer().min(1).label('Category ID'),
  stock: joi
    .number()
    .integer().default(0).optional().label('Stock'),
  minimum_stock: joi
    .number().integer().optional().label('Minimum stock'),
  weight: joi.number().min(0).label('Weight'),
  image: joi
    .string().optional().allow(null).label('Image'),
}).required().unknown(false).label('Product Schema')

const idSchema = joi.object({
  id: joi
    .number().integer().positive().required().label('ID')
})

const updateStockSchema = joi.object({
  transactions: joi.array().items({
    id: joi
      .number().integer().required().label('ID'),
    updateStock: joi
      .number().integer().required().label('Update Stock')
  }).required().label('Transactions')
}).required().label('Update Stock Schema')

const filterSchema = joi.object({
  page: joi
    .number().integer().min(1).optional().label('Page'),
  limit: joi
    .number().integer()
    .min(1).max(100).optional().label('Limit'),
  search: joi
    .string().allow('').optional().label('Seacrh'),
  minPrice: joi
    .number().min(0).optional().label('Minimum Price'),
  maxPrice: joi
    .number().min(0).optional().label('Max Price'),
  categoryId: joi
    .number().integer().optional().label('Category ID'),
  sort: joi
    .string().valid("id", "sku", "name", "sell", "stock")
    .optional().label('Sort'),
  orderBy: joi
    .string().valid('ASC', 'DESC')
    .optional().label('Order By')
}).optional().label('Filter Schema')

module.exports = { createProductSchema, updateProductSchema, idSchema, updateStockSchema, filterSchema }