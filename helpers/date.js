function dateNow(type) {
  const config = {
    now: new Date(),
    iso: new Date().toISOString()
  }
  return config[type] || config.now
}

module.exports = dateNow