function httpLogger(req, res, next) {
  const start = new Date()

  res.on('finish', () => {
    const duration = new Date() - start

    req.logger.http(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    })
  })
  next()
}

module.exports = httpLogger