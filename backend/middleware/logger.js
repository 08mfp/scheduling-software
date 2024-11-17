// backend/middleware/logger.js
/**
 * @module backend/middleware/logger
 * @description This module is used for logging requests to the server.
 * @api Logger
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const morgan = require('morgan');

//! CONFIRM IF THIS IS THE CORRECT WAY TO LOG REQUEST BODY

// Create a custom token to log request body
morgan.token('body', (req) => JSON.stringify(req.body));

// Create a logger middleware
const logger = morgan(
  ':method :url :status :res[content-length] - :response-time ms :body'
);

module.exports = logger;
