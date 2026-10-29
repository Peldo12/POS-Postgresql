const redis = require('./redis');

const logger = require('../common/middleware/logger');

const { bytes, md5 } = require('../common/helpers/crypto');
const dateNow = require('../common/helpers/date');
const { getNextInvoice } = require('../common/helpers/invoice');
const { generateJWT } = require('../common/helpers/jwt');
const hash = require('../common/helpers/hash');
const sendEmail = require('../common/helpers/email');
const success = require('../common/helpers/response');
const template = require('../common/utils/template.js');
const { transaction } = require('../common/helpers/model');

const AppError = require('../common/utils/AppError');

module.exports = {
  redis,
  logger,
  bytes,
  md5,
  dateNow,
  getNextInvoice,
  generateJWT,
  hash,
  sendEmail,
  success,
  template,
  transaction,
  AppError,
};
