function errorHandler(err, req, res, next) {
  // console.log(err.name)
  // console.log(err.constructor.name)
  const body = { ...req.body };
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(err.statusCode || 500).json({
    status: "fail",
    message: "Invalid JSON format"
  })
  }
  
  if (body.pin) body.pin = "***REDACTED***";
  if (body.password) body.password = "***REDACTED***";
  if (body.repeatPassword) body.repeatPassword = "***REDACTED***";

  req.logger.error(err?.message, {
    user: req.user?.id,
    path: req.originalUrl,
    body: body,
    stack: err.stack
  })
  
  res.status(err.statusCode || 500).json({
    status: "fail",
    message: err.message
  })
}

module.exports = errorHandler