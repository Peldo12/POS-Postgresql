function validateQuery(schema) {
  return function(req, res, next) {
    const { error } = schema.validate(req.query, {abortEarly: false})
    if (error) {
      const messages = error.details.map(err => err.message)
      return res.status(400).json({
        status: 'fail',
        message: messages.join(', ')
      })
    }
    next()
  }
}

module.exports = validateQuery