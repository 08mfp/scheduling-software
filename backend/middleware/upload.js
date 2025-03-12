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
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(
      null, 
      file.fieldname + '-' + Date.now() + path.extname(file.originalname) // File name, done by concatenating the field name, the current date, and the file extension (will be numbers)
    );
  },
});

const upload = multer({
  storage: storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB //! NEED TO DO ON FRONTEND
  fileFilter: function (req, file, cb) { 
    checkFileType(file, cb); 
  },
}).single('image'); // 'image' is the name of the form field that will contain the image. Thius is the field name that multer will look for in the request body

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(
    path.extname(file.originalname).toLowerCase() 
  );

  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) { 
    return cb(null, true); 
  } else {
    cb('Error: Images Only!');
  }
}

module.exports = upload;