const path = require('path');

function getDir(params) {
  return require(path.join(__dirname, params));
}

module.exports = getDir;
