function success(options) {
  const {statusCode = 200, message, data = {}, pagination = null, res} = options
  if (!res) throw new Error('Response object (res) is required')
  const response = {
    status: "ok",
    message,
    data
  }
  if (pagination) response.meta = pagination
  
  res.status(statusCode).json(response)
}

module.exports = success