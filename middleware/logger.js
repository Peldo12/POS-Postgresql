const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({format: 'YYYY-MM-DD-HH-mm-s'}),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'log/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'log/warn.log', level: 'warn' }),
    new winston.transports.File({ filename: 'log/http.log', level: 'http' }),
    new winston.transports.File({ filename: 'log/combined.log' }),
  ],
});

// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new winston.transports.Console({
//     format: winston.format.simple(),
//   }));
// }

module.exports = logger;