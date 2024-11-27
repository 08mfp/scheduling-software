//backend/models/User.js
/**
 * @module backend/models/User
 * @description This module is used for defining the User model. which will be used for the API 
 * @api User
 * @version 1.0.0
 * @authors github.com/08mfp
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    firstName: String,
    lastName: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  apiKey: {
    type: String,
    unique: true,
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'viewer', 'guest'],
    default: 'guest',
  },
  requestCount: {
    type: Number,
    default: 0,
  },
  requestResetTime: {
    type: Date,
    default: Date.now,
  },
});

userSchema.methods.generateApiKey = function () {
  this.apiKey = crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('User', userSchema);
