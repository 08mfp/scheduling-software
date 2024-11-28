// backend/middleware/logger.js
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

// Create a logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Configure winston logger
const logger = winston.createLogger({
  level: 'info', // Set log level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Log to console
    new winston.transports.Console(),
    // Log to file
    new winston.transports.File({ filename: path.join(logDir, 'app.log') }),
  ],
});

// Stream for morgan to use winston
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Morgan middleware to log HTTP requests
const morganMiddleware = morgan('combined', { stream: logger.stream });

module.exports = logger; // Export the logger
module.exports.morganMiddleware = morganMiddleware; // Export morgan middleware

//! CONFIRM IF THIS IS THE CORRECT WAY TO LOG REQUEST BODY

// // Create a custom token to log request body
// morgan.token('body', (req) => JSON.stringify(req.body));

// // Create a logger middleware
// const logger = morgan(
//   ':method :url :status :res[content-length] - :response-time ms :body'
// );

// // module.exports = logger;
