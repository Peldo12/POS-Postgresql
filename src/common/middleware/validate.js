function body(schema) {
  return function (req, res, next) {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((err) => err.message);
      if (messages.includes('Body is required')) {
        return res.status(203).json({
          status: 'fail',
          message: 'No Body',
        });
      }
      return res.status(400).json({
        status: 'fail',
        message: messages.join(', '),
      });
    }
    req.body = value;
    next();
  };
}

function params(schema) {
  return function (req, res, next) {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    next();
  };
}

function query(schema) {
  return function (req, res, next) {
    const { error } = schema.validate(req.query, { abortEarly: false });
    if (error) {
      const messages = error.details.map((err) => err.message);
      return res.status(400).json({
        status: 'fail',
        message: messages.join(', '),
      });
    }
    next();
  };
}

module.exports = { body, params, query };
