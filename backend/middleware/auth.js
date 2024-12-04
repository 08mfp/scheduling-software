//backend/middleware/auth.js
/**
 * @module backend/middleware/auth
 * @description This module is used for defining the authentication middleware.
 * @api User
 * @version 1.0.0
 * @authors github.com/08mfp
 */
const User = require('../models/User');
const logger = require('./logger'); 

exports.authenticate = async (req, res, next) => {
  try {
    const apiKey = req.header('x-api-key');

    if (!apiKey) {
      logger.warn(`Unauthorized access attempt: No API key provided`);
      return res.status(401).json({ message: 'No API key provided' });
    }

    const user = await User.findOne({ apiKey });

    if (!user) {
      logger.warn(`Unauthorized access attempt: Invalid API key`);
      return res.status(401).json({ message: 'Invalid API key' });
    }

    // Rate limiting
    const currentTime = Date.now();
    if (currentTime > user.requestResetTime + 60 * 60 * 1000) {
      // Reset count every hour
      user.requestCount = 0;
      user.requestResetTime = currentTime;
    }

    if (user.requestCount >= 1000) {
      logger.warn(`Rate limit exceeded for user: ${user.email}`);
      return res.status(429).json({ message: 'Rate limit exceeded' });
    }

    user.requestCount += 1;
    await user.save();

    req.user = user; // Attach user to request object
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.authorize = (...allowedRoles) => {
    return (req, res, next) => {
      const { role } = req.user;
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: 'Forbidden: Access is denied' });
      }
      next();
    };
  };
  