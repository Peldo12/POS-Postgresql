function dateNow(type) {
  if (!type) throw new Error('No type given');
  const config = {
    raw: new Date(),
    string: new Date().toDateString(),
    iso: new Date().toISOString(),
    local: new Date().toLocaleDateString(),
    time: new Date().toTimeString(),
  };
  if (!config[type]) throw new Error('Unsupported type');
  return config[type];
}

module.exports = dateNow;
