# Middleware Directory Documentation

Welcome to the **Middleware** directory documentation. This directory encompasses all the middleware functions that play a crucial role in handling authentication, authorization, logging, and file uploads within the application. Middleware functions intercept requests and responses, allowing for pre-processing, validation, and augmentation of data before it reaches the controllers or the client.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Middleware Files Overview](#middleware-files-overview)
  - [auth.js](#authjs)
  - [logger.js](#loggerjs)
  - [upload.js](#uploadjs)
- [Authorization](#authorization)
- [Logging Enhancements](#logging-enhancements)
- [File Uploads](#file-uploads)
- [Usage](#usage)
- [Additional Notes](#additional-notes)

## Directory Structure

```
backend/
└── middleware/
    ├── auth.js
    ├── logger.js
    └── upload.js
```

Each `.js` file within the `middleware` directory defines specific middleware functions that are utilized across various parts of the application to enforce security, manage logging, and handle file uploads.

## Middleware Files Overview

### auth.js

**Module:** `backend/middleware/auth`  
**Description:** Handles authentication and authorization, ensuring that only authenticated users with appropriate roles can access certain routes. Implements rate limiting based on API keys to prevent abuse.

**API Group:** Authentication & Authorization  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Middleware Functions

1. **authenticate**

   - **Description:** Verifies the user's authentication status by validating the provided API key. Implements rate limiting to restrict the number of requests a user can make within a specified timeframe.
   
   - **Usage:** Applied to routes that require the user to be authenticated.
   
   - **Functionality:**
     - **API Key Validation:** Checks for the presence of an `x-api-key` header and validates it against the `User` model.
     - **Rate Limiting:** Allows a maximum of 100 requests per hour per user. Resets the count every hour.
     - **Error Handling:**
       - Returns `401 Unauthorized` if no API key is provided or if the API key is invalid.
       - Returns `429 Too Many Requests` if the user exceeds the rate limit.
     - **Request Augmentation:** Attaches the authenticated `user` object to the `req` object for downstream access.
   
   - **Example:**
     ```javascript
     const { authenticate } = require('../middleware/auth');
     
     router.get('/protected-route', authenticate, (req, res) => {
       res.send(`Hello, ${req.user.name.firstName}!`);
     });
     ```

2. **authorize**

   - **Description:** Enforces role-based access control by allowing only users with specified roles to access certain routes.
   
   - **Usage:** Applied after the `authenticate` middleware to restrict access based on user roles.
   
   - **Parameters:**
     - `allowedRoles` (string[]): A list of roles permitted to access the route (e.g., `'admin'`, `'manager'`).
   
   - **Functionality:**
     - Checks if the authenticated user's role is included in the `allowedRoles` array.
     - Returns `403 Forbidden` if the user does not possess the required role.
     - Proceeds to the next middleware or controller function if authorization is successful.
   
   - **Example:**
     ```javascript
     const { authenticate, authorize } = require('../middleware/auth');
     
     router.put('/admin-only-route', authenticate, authorize('admin'), (req, res) => {
       res.send('Admin access granted.');
     });
     ```

#### Example Usage in Routes

```javascript
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize('admin')); // Only accessible by Admin

// Define admin routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId', adminController.updateAnyUser);
router.delete('/users/:userId', adminController.deleteUser);

module.exports = router;
```

---

### logger.js

**Module:** `backend/middleware/logger`  
**Description:** Implements comprehensive logging for HTTP requests and application-level events using `morgan` and `winston`. Facilitates monitoring and debugging by recording vital information about incoming requests and system operations.

**API Group:** Logging  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Components

1. **Winston Logger**

   - **Description:** A versatile logging library used to log messages with different severity levels to various transports (e.g., console, file).
   
   - **Configuration:**
     - **Level:** Set to `'info'` to capture informational messages, warnings, and errors.
     - **Format:** Combines timestamping with JSON formatting for structured logs.
     - **Transports:**
       - **Console:** Logs messages to the console.
       - **File:** Logs messages to `logs/app.log`.
   
   - **Example Configuration:**
     ```javascript
     const winston = require('winston');
     const path = require('path');
     
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
     ```

2. **Morgan Middleware**

   - **Description:** An HTTP request logger middleware for Node.js, used in conjunction with `winston` to log incoming HTTP requests.
   
   - **Configuration:**
     - **Format:** `'combined'` format, which includes comprehensive information about each request.
     - **Stream:** Configured to pipe logs through `winston` instead of the default console.
   
   - **Example Configuration:**
     ```javascript
     const morgan = require('morgan');
     
     logger.stream = {
       write: (message) => {
         logger.info(message.trim());
       },
     };
     
     const morganMiddleware = morgan('combined', { stream: logger.stream });
     ```

3. **Exported Modules**

   - **`logger`:** The configured `winston` logger instance.
   - **`morganMiddleware`:** The `morgan` middleware configured to use `winston` for logging.
   
   - **Export Statement:**
     ```javascript
     module.exports = logger;
     module.exports.morganMiddleware = morganMiddleware;
     ```

#### Enhancing Logging with Request Body (Addressing User's Comment)

The user included a commented-out section attempting to log the request body using `morgan`. However, `morgan` does not natively support logging the request body, as it primarily focuses on logging HTTP request metadata. To log the request body, additional customization is required.

**Recommended Approach:**

1. **Define a Custom Morgan Token:**

   Create a custom token to capture the request body.

   ```javascript
   morgan.token('body', (req) => JSON.stringify(req.body));
   ```

2. **Modify Morgan Format String:**

   Incorporate the custom token into the `morgan` format string.

   ```javascript
   const customFormat = ':method :url :status :res[content-length] - :response-time ms :body';
   
   const morganMiddleware = morgan(customFormat, { stream: logger.stream });
   ```

3. **Security Considerations:**

   - **Sensitive Data:** Be cautious when logging request bodies, especially if they contain sensitive information like passwords or personal data.
   - **Data Sanitization:** Implement data sanitization to exclude or mask sensitive fields before logging.

4. **Alternative Logging Strategies:**

   For more advanced logging requirements, consider integrating `winston` directly within custom middleware to have finer control over what gets logged.

   **Example Custom Middleware:**

   ```javascript
   // customLogger.js
   const logger = require('./logger');
   
   const customLogger = (req, res, next) => {
     logger.info({
       method: req.method,
       url: req.originalUrl,
       status: res.statusCode,
       body: req.body, // Ensure sensitive data is handled appropriately
     });
     next();
   };
   
   module.exports = customLogger;
   ```

   **Usage:**

   ```javascript
   const customLogger = require('../middleware/customLogger');
   
   app.use(customLogger);
   ```

**Note:** Always ensure compliance with data protection regulations when logging request bodies.

---

### upload.js

**Module:** `backend/middleware/upload`  
**Description:** Manages file uploads, specifically handling image uploads for users, teams, and players using `multer`. Configures storage settings, file naming conventions, size limits, and file type validations to ensure secure and efficient handling of uploaded files.

**API Group:** File Uploads  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Components

1. **Multer Configuration**

   - **Storage Engine:**
     - **Destination:** Files are stored in the `./uploads/` directory.
     - **Filename:** Each file is named using the pattern `fieldname-timestamp.extension` to ensure uniqueness and preserve the original file extension.
   
   - **Example Configuration:**
     ```javascript
     const multer = require('multer');
     const path = require('path');
     
     const storage = multer.diskStorage({
       destination: './uploads/',
       filename: function (req, file, cb) {
         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
       },
     });
     ```

2. **File Size Limitation**

   - **Description:** Restricts uploaded file sizes to a maximum of 5MB to prevent excessive storage usage and potential denial-of-service attacks.
   
   - **Configuration:**
     ```javascript
     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
     ```

3. **File Type Validation**

   - **Description:** Ensures that only image files with extensions `.jpeg`, `.jpg`, `.png`, and `.gif` are accepted.
   
   - **Implementation:**
     ```javascript
     fileFilter: function (req, file, cb) { 
       checkFileType(file, cb); 
     },
     
     function checkFileType(file, cb) {
       const filetypes = /jpeg|jpg|png|gif/;
       const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
       const mimetype = filetypes.test(file.mimetype);
       if (mimetype && extname) {
         return cb(null, true);
       } else {
         cb('Error: Images Only!');
       }
     }
     ```

4. **Exported Middleware**

   - **Description:** Exports the configured `multer` middleware to handle single image uploads.
   
   - **Configuration:**
     ```javascript
     const upload = multer({
       storage: storage, 
       limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
       fileFilter: function (req, file, cb) { 
         checkFileType(file, cb); 
       },
     }).single('image'); // 'image' is the field name in the form data
     
     module.exports = upload;
     ```

#### Example Usage in Controllers

Controllers that handle creating or updating entities with image uploads utilize the `upload` middleware to process incoming files.

**Example: Creating a New Player with Image Upload**

```javascript
const playerController = require('../controllers/playerController');
const upload = require('../middleware/upload');

exports.createPlayer = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err });
    } else {
      try {
        const { firstName, lastName, dateOfBirth, team } = req.body;
        const player = new Player({
          firstName,
          lastName,
          dateOfBirth,
          team,
          image: req.file ? `/uploads/${req.file.filename}` : undefined,
        });

        // Handle image removal
        if (req.body.removeImage === 'true') {
          player.image = undefined;
        }

        await player.save();
        res.status(201).json(player);
      } catch (error) {
        console.error('Error creating player:', error);
        res.status(500).json({ message: error.message });
      }
    }
  });
};
```

**Notes:**

- The `.single('image')` method specifies that only one file will be uploaded with the field name `'image'`.
- Uploaded images are accessible via the `/uploads/` directory. Ensure that this directory is correctly served statically in your Express application.

---

## Authorization

Authorization is managed through the `authorize` middleware defined in `auth.js`. It enforces Role-Based Access Control (RBAC) by permitting access to routes based on the user's role.

### Roles Defined

- **Admin:** Full access to all resources and operations.
- **Manager:** Can manage teams, players, fixtures, and stadiums but has limited access compared to Admin.
- **Viewer:** Can view resources like teams, players, fixtures, and stadiums but cannot perform create, update, or delete operations.
- **Guest:** Limited access, primarily read-only access to public endpoints.

### Implementing Authorization

1. **Import Middleware Functions:**

   ```javascript
   const { authenticate, authorize } = require('../middleware/auth');
   ```

2. **Apply Middleware to Routes:**

   ```javascript
   router.use(authenticate); // Ensure the user is authenticated
   router.use(authorize('admin', 'manager')); // Allow only Admin and Manager roles
   ```

3. **Example Route with Authorization:**

   ```javascript
   router.post('/teams', authenticate, authorize('admin'), teamController.createTeam);
   ```

---

## Logging Enhancements

While the current setup logs HTTP requests and general application events, there was an attempt to log the request body using `morgan`. However, `morgan` does not natively support logging the request body. To achieve this, custom tokens and format strings need to be defined.

### Steps to Log Request Body

1. **Define a Custom Morgan Token:**

   ```javascript
   const morgan = require('morgan');
   
   morgan.token('body', (req) => JSON.stringify(req.body));
   ```

2. **Create a Custom Morgan Format Including the Request Body:**

   ```javascript
   const customFormat = ':method :url :status :res[content-length] - :response-time ms :body';
   ```

3. **Update Morgan Middleware with the Custom Format:**

   ```javascript
   const morganMiddleware = morgan(customFormat, { stream: logger.stream });
   ```

4. **Integrate the Updated Morgan Middleware:**

   Replace the existing `morgan` configuration in `logger.js` with the enhanced version.

   ```javascript
   // Define custom token
   morgan.token('body', (req) => JSON.stringify(req.body));
   
   // Define custom format
   const customFormat = ':method :url :status :res[content-length] - :response-time ms :body';
   
   // Update morgan middleware
   const morganMiddleware = morgan(customFormat, { stream: logger.stream });
   
   // Export the updated middleware
   module.exports.morganMiddleware = morganMiddleware;
   ```

5. **Use the Updated Morgan Middleware in Application:**

   ```javascript
   const logger = require('../middleware/logger');
   
   app.use(logger.morganMiddleware);
   ```

### Security Considerations

- **Sensitive Data Exposure:** Logging request bodies can inadvertently expose sensitive information such as passwords, API keys, or personal data.
  
- **Mitigation Strategies:**
  - **Exclude Sensitive Fields:** Modify the custom token to exclude or mask sensitive fields.
    
    ```javascript
    morgan.token('body', (req) => {
      const { password, ...rest } = req.body;
      return JSON.stringify(rest);
    });
    ```
  
  - **Conditional Logging:** Only log request bodies for non-sensitive routes or environments (e.g., development).
  
  - **Use Additional Middleware:** Implement dedicated middleware to handle detailed logging with advanced sanitization.

---

## File Uploads

File uploads are managed through the `upload.js` middleware, utilizing `multer` for handling multipart/form-data requests. This setup ensures that only valid image files are uploaded and stored securely on the server.

### Configuration Details

1. **Storage Settings:**

   - **Destination Directory:** `./uploads/` - Ensure that this directory exists and is writable by the application.
   - **Filename Convention:** `fieldname-timestamp.extension` - This pattern prevents filename collisions and preserves the original file extension.

2. **File Size Limit:**

   - **Maximum File Size:** 5MB - Configured to prevent excessive storage usage and potential security risks.

3. **File Type Validation:**

   - **Allowed File Types:** `.jpeg`, `.jpg`, `.png`, `.gif` - Ensures that only image files are accepted.
   - **MIME Type Checking:** Validates the MIME type to prevent malicious files from being uploaded with image extensions.

4. **Error Handling:**

   - Returns a `400 Bad Request` with an error message if the uploaded file does not meet the criteria.

### Example Usage in Controllers

**Creating a New Team with Image Upload:**

```javascript
const teamController = require('../controllers/teamController');
const upload = require('../middleware/upload');

exports.createTeam = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err });
    } else {
      try {
        const { teamName, teamRanking, teamLocation, teamCoach, stadium } = req.body;
        const team = new Team({
          teamName,
          teamRanking,
          teamLocation,
          teamCoach,
          stadium,
          image: req.file ? `/uploads/${req.file.filename}` : undefined,
        });

        // Handle image removal
        if (req.body.removeImage === 'true') {
          team.image = undefined;
        }

        await team.save();
        res.status(201).json(team);
      } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ message: error.message });
      }
    }
  });
};
```

**Updating an Existing Player's Image:**

```javascript
exports.updatePlayer = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err });
    } else {
      try {
        const player = await Player.findById(req.params.id);
        if (!player) {
          return res.status(404).json({ message: 'Player not found' });
        }

        // Update fields
        player.firstName = req.body.firstName || player.firstName;
        player.lastName = req.body.lastName || player.lastName;
        player.dateOfBirth = req.body.dateOfBirth || player.dateOfBirth;
        player.team = req.body.team || player.team;

        // Handle image removal or upload
        if (req.body.removeImage === 'true') {
          // Delete old image if exists
          if (player.image) {
            const oldImagePath = '.' + player.image;
            try {
              await fs.promises.unlink(oldImagePath);
            } catch (err) {
              if (err.code !== 'ENOENT') {
                console.error('Error deleting old image file:', err);
                return res.status(500).json({ message: 'Server error' });
              }
            }
          }
          player.image = undefined;
        } else if (req.file) {
          // Delete old image if exists
          if (player.image) {
            const oldImagePath = '.' + player.image;
            try {
              await fs.promises.unlink(oldImagePath);
            } catch (err) {
              if (err.code !== 'ENOENT') {
                console.error('Error deleting old image file:', err);
                return res.status(500).json({ message: 'Server error' });
              }
            }
          }
          player.image = `/uploads/${req.file.filename}`;
        }

        await player.save();
        res.status(200).json(player);
      } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ message: error.message });
      }
    }
  });
};
```

---

## Usage

To integrate these middleware functions into your Express application, follow the examples below:

### 1. **Applying Authentication and Authorization Middleware**

Ensure that routes requiring authentication and specific roles are protected accordingly.

```javascript
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize('admin')); // Only accessible by Admin

// Define admin routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId', adminController.updateAnyUser);
router.delete('/users/:userId', adminController.deleteUser);

module.exports = router;
```

### 2. **Integrating Logging Middleware**

In your main application file (e.g., `app.js` or `server.js`), integrate the logging middleware to capture all HTTP requests and application logs.

```javascript
const express = require('express');
const app = express();
const logger = require('./middleware/logger');

// Use morgan middleware for logging HTTP requests
app.use(logger.morganMiddleware);

// Parse JSON bodies
app.use(express.json());

// Define routes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
// ... other routes

app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
// ... other route usages

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
```

### 3. **Handling File Uploads in Routes**

When defining routes that involve file uploads, utilize the `upload` middleware within controller functions as demonstrated in the `teamController.js` and `playerController.js` examples above.

---

## Additional Notes

1. **Security Best Practices:**

   - **API Key Protection:** Treat API keys as sensitive information. Avoid logging them or exposing them in responses.
   
   - **Data Sanitization:** Ensure that all inputs, especially those included in logs, are sanitized to prevent injection attacks and log poisoning.
   
   - **HTTPS Enforcement:** Serve your application over HTTPS to secure data in transit, including API keys and uploaded files.

2. **File Storage Considerations:**

   - **Static File Serving:** Configure Express to serve the `uploads` directory statically to allow clients to access uploaded images.
     
     ```javascript
     const path = require('path');
     
     app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
     ```
   
   - **Storage Optimization:** Regularly monitor and manage the `uploads` directory to prevent storage bloat. Implement file retention policies if necessary.

3. **Rate Limiting Enhancements:**

   - **Dynamic Limits:** Adjust the rate limiting parameters (`100 requests per hour`) based on application needs and user roles.
   
   - **Distributed Rate Limiting:** For applications running on multiple servers or instances, consider using distributed rate limiting strategies with stores like Redis.

4. **Advanced Logging Features:**

   - **Log Rotation:** Implement log rotation to prevent log files from growing indefinitely. Libraries like `winston-daily-rotate-file` can facilitate this.
   
   - **Structured Logging:** Utilize structured logging (e.g., JSON) to enable easier parsing and analysis of logs using log management tools.

5. **Error Handling Middleware:**

   - **Global Error Handler:** Consider implementing a global error handling middleware to catch and process errors consistently across the application.
     
     ```javascript
     // errorHandler.js
     const logger = require('./logger');
     
     const errorHandler = (err, req, res, next) => {
       logger.error(err.stack);
       res.status(500).json({ message: 'Internal Server Error' });
     };
     
     module.exports = errorHandler;
     ```
   
   - **Integration:**
     
     ```javascript
     const errorHandler = require('./middleware/errorHandler');
     
     // Place after all other middleware and routes
     app.use(errorHandler);
     ```

6. **Testing Middleware:**

   - **Unit Tests:** Develop unit tests for each middleware function to ensure they behave as expected under various scenarios.
   
   - **Integration Tests:** Test the middleware in conjunction with routes and controllers to validate end-to-end functionality.

7. **Documentation Consistency:**

   - **Keep Middleware Documentation Updated:** As middleware functions evolve, ensure that their documentation reflects any changes in functionality, parameters, or usage patterns.
   
   - **Code Comments:** Maintain clear and concise comments within the middleware code to aid future developers in understanding implementation details.

---

By meticulously configuring and integrating middleware functions, the application ensures robust security, efficient request handling, and comprehensive logging, thereby enhancing both performance and maintainability.