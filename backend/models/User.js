/**
 * @module backend/models/User
 * @description This module is used for defining the User model. which will be used for the API (use api key stored in cookies)
 * @api User
 * @version 1.0.0
 * @authors github.com/08mfp
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
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
  password: {
    type: String,
    required: true,
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
  image: {
    type: String,
  },
  homeCity: {
    type: String,
  },
  age: {
    type: Number,
  },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(this.password, saltRounds);
      this.password = hashedPassword;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

userSchema.methods.generateApiKey = function () {
  this.apiKey = crypto.randomBytes(32).toString('hex');
};

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);