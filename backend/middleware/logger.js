/**
 * @module backend/middleware/logger
 * @description This module is used for logging requests to the server.
 * @api Logger
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const morgan = require('morgan');
const winston = require('winston');
const path = require('path');

const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logDir, 'app.log') }),
  ],
});

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

const morganMiddleware = morgan('combined', { stream: logger.stream });

module.exports = logger;
module.exports.morganMiddleware = morganMiddleware;

//! CONFIRM IF THIS IS THE CORRECT WAY TO LOG REQUEST BODY

// morgan.token('body', (req) => JSON.stringify(req.body));
// const logger = morgan(
//   ':method :url :status :res[content-length] - :response-time ms :body'
// );

// module.exports = logger;