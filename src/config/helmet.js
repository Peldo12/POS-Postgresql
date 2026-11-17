const helmet = require('helmet');

function setHeaders() {
  helmet({
    contentSecurityPolicy: false,
    xDownloadOptions: false,
  });
}

module.exports = setHeaders;
