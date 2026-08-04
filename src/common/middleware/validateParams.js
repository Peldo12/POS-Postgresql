function validateParams (schema) {
  return function(req, res, next) {
    const { error } = schema.validate(req.params)
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message
      })
    }
    next()
  }
}

module.exports = validateParams