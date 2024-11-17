// backend/middleware/upload.js
/**
 * @module backend/middleware/upload
 * @description This module is used for uploading images to the server.
 * @api Upload
 * @version 1.0.0
 * @authors github.com/08mfp
 */

//! multer Documentation: https://www.npmjs.com/package/multer
const multer = require('multer');
const path = require('path');

// Set storage engine for multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads/', // Folder to store uploaded images 
  filename: function (req, file, cb) {
    cb(
      null, 
      file.fieldname + '-' + Date.now() + path.extname(file.originalname) // File name, done by concatenating the field name, the current date, and the file extension (will be numbers)
    );
  },
});

// Initialize upload so that it can be used in the routes
const upload = multer({
  storage: storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB //! NEED TO DO ON FRONTEND
  fileFilter: function (req, file, cb) { 
    checkFileType(file, cb); 
  },
}).single('image'); // 'image' is the name of the form field that will contain the image. Thius is the field name that multer will look for in the request body

// Check file type
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif/;
  // Check extensions
  const extname = filetypes.test(
    path.extname(file.originalname).toLowerCase() 
  );
  // Check mime for image so that it is not renamed to a different file type
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) { // If the file is an image
    return cb(null, true); // Continue with the upload
  } else {
    cb('Error: Images Only!');
  }
}

module.exports = upload;