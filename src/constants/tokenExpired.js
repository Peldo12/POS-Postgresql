const tokenExpired = {
  REFRESH_TOKEN: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  EMAIL_VERIFY: new Date(Date.now() + 24 * 3600 * 1000),
  PASSWORD_RESET: new Date(Date.now() + 1800 * 1000)
}

module.exports = tokenExpired