function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  const body = { ...req.body };
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(err.statusCode || 500).json({
      status: 'fail',
      message: 'Invalid JSON format',
    });
  }

  const secured = ['pin', 'password', 'repeatPassword', 'refreshToken', 'otp'];
  for (let key of Object.keys(body)) {
    if (secured.includes(key)) body[key] = '***REDACTED***';
  }

  req.logger.error(err?.message, {
    user: req.user?.id,
    path: req.originalUrl,
    body: body,
    stack: err.stack,
  });

  res.status(err.statusCode || 500).json({
    status: 'fail',
    message: err.message,
  });
}

module.exports = errorHandler;
