# Routes Directory Documentation

Welcome to the **Routes** directory documentation. This directory contains all the route definitions for the backend of the application. Each route file is responsible for handling specific aspects of the application's API, ensuring a modular and organized structure.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Route Files Overview](#route-files-overview)
  - [adminRoutes.js](#adminroutesjs)
  - [fixtureRoutes.js](#fixtureroutesjs)
  - [manualFixtureRoutes.js](#manualfixtureroutesjs)
  - [playerRoutes.js](#playerroutesjs)
  - [provisionalFixtureRoutes.js](#provisionalfixtureroutesjs)
  - [schedulerRoutes.js](#schedulerroutesjs)
  - [stadiumRoutes.js](#stadiumroutesjs)
  - [teamRoutes.js](#teamroutesjs)
  - [userRoutes.js](#userroutesjs)
- [Authorization](#authorization)


## Directory Structure

```
backend/
└── routes/
    ├── adminRoutes.js
    ├── fixtureRoutes.js
    ├── manualFixtureRoutes.js
    ├── playerRoutes.js
    ├── provisionalFixtureRoutes.js
    ├── schedulerRoutes.js
    ├── stadiumRoutes.js
    ├── teamRoutes.js
    └── userRoutes.js
```

Each `.js` file within the `routes` directory defines the API endpoints for different modules of the application.

## Route Files Overview

### adminRoutes.js

**Module:** `backend/routes/adminRoutes`  
**Description:** Contains routes for managing users with the 'admin' role.  
**API Group:** Admin Routes  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Endpoints

| Method | Endpoint          | Description                     | Authorization |
|--------|-------------------|---------------------------------|---------------|
| GET    | `/users`          | Retrieve all users              | Admin         |
| GET    | `/users/:userId`  | Retrieve a user by ID           | Admin         |
| PUT    | `/users/:userId`  | Update any user's information   | Admin         |
| DELETE | `/users/:userId`  | Delete a user by ID             | Admin         |

---

### fixtureRoutes.js

**Module:** `backend/routes/fixtureRoutes`  
**Description:** Defines fixture-related routes for the application.  
**API Group:** Fixture Routes  
**Version:** 2.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Endpoints

| Method | Endpoint             | Description                        | Authorization          |
|--------|----------------------|------------------------------------|------------------------|
| GET    | `/`                  | Retrieve all fixtures               | Public (No auth)       |
| GET    | `/seasons`           | Retrieve all distinct seasons       | Public (No auth)       |
| GET    | `/:id`               | Retrieve a fixture by ID            | Admin, Manager, Viewer, Guest |
| POST   | `/`                  | Create a new fixture                | Admin                  |
| PUT    | `/:id`               | Update a fixture by ID              | Admin                  |
| DELETE | `/:id`               | Delete a fixture by ID              | Admin                  |
| POST   | `/bulk`              | Bulk create fixtures                | Admin                  |

---

### manualFixtureRoutes.js

**Module:** `backend/routes/manualFixtureRoutes`  
**Description:** Defines routes for manually managing fixtures.  
**API Group:** Manual Fixture Routes  
**Version:** 2.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Endpoints

| Method | Endpoint                  | Description                                   | Authorization |
|--------|---------------------------|-----------------------------------------------|---------------|
| GET    | `/previous-fixture`       | Get the previous fixture to determine home/away | Admin         |
| POST   | `/validate`               | Validate manually scheduled fixtures          | Admin         |
| POST   | `/save`                   | Save manually scheduled fixtures              | Admin         |

---

### playerRoutes.js

**Module:** `backend/routes/playerRoutes`  
**Description:** Manages player-related operations.  
**API Group:** Player Routes  
**Version:** 2.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Endpoints

| Method | Endpoint          | Description                     | Authorization             |
|--------|-------------------|---------------------------------|---------------------------|
| GET    | `/`               | Retrieve all players            | Admin, Manager, Viewer    |
| GET    | `/:id`            | Retrieve a player by ID         | Admin, Manager, Viewer    |
| POST   | `/`               | Create a new player             | Admin, Manager            |
| PUT    | `/:id`            | Update a player by ID           | Admin, Manager            |
| DELETE | `/:id`            | Delete a player by ID           | Admin                     |

---

### provisionalFixtureRoutes.js

**Module:** `backend/routes/provisionalFixtureRoutes`  
**Description:** Handles provisional fixture operations.  
**API Group:** Provisional Fixture Routes  
**Version:** 2.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Endpoints

| Method | Endpoint             | Description                      | Authorization |
|--------|----------------------|----------------------------------|---------------|
| POST   | `/generate`          | Generate provisional fixtures    | Admin         |
| POST   | `/`                  | Retrieve all provisional fixtures| Admin         |
| POST   | `/save`              | Save provisional fixtures        | Admin         |
| POST   | `/`                  | Clear provisional fixtures       | Admin         |

*Note:* The `POST /` endpoint is used for both retrieving and clearing provisional fixtures. It is handled appropriately in the controller based on the request context.

---

### schedulerRoutes.js

**Module:** `backend/routes/schedulerRoutes`  
**Description:** Manages scheduler operations.  
**API Group:** Scheduler Routes  
**Version:** 2.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Endpoints

| Method | Endpoint | Description          | Authorization |
|--------|----------|----------------------|---------------|
| POST   | `/run`   | Run the scheduler    | Admin         |

---

### stadiumRoutes.js

**Module:** `backend/routes/stadiumRoutes`  
**Description:** Manages stadium-related operations.  
**API Group:** Stadium Routes  
**Version:** 2.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Endpoints

| Method | Endpoint        | Description                      | Authorization          |
|--------|-----------------|----------------------------------|------------------------|
| GET    | `/`             | Retrieve all stadiums            | Admin, Manager, Viewer |
| GET    | `/:id`          | Retrieve a stadium by ID         | Admin, Manager, Viewer |
| POST   | `/`             | Create a new stadium             | Admin                  |
| PUT    | `/:id`          | Update a stadium by ID           | Admin                  |
| DELETE | `/:id`          | Delete a stadium by ID           | Admin                  |

---

### teamRoutes.js

**Module:** `backend/routes/teamRoutes`  
**Description:** Manages team-related operations.  
**API Group:** Team Routes  
**Version:** 2.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Endpoints

| Method | Endpoint             | Description                       | Authorization          |
|--------|----------------------|-----------------------------------|------------------------|
| GET    | `/`                  | Retrieve all teams                 | Admin, Manager, Viewer |
| GET    | `/:id`               | Retrieve a team by ID              | Admin, Manager, Viewer |
| GET    | `/:id/players`       | Retrieve players of a specific team| Admin, Manager, Viewer |
| GET    | `/:id/fixtures`      | Retrieve fixtures of a specific team| Admin, Manager, Viewer |
| POST   | `/`                  | Create a new team                  | Admin                  |
| PUT    | `/:id`               | Update a team by ID                | Admin                  |
| DELETE | `/:id`               | Delete a team by ID                | Admin                  |

---

### userRoutes.js

**Module:** `backend/routes/userRoutes`  
**Description:** Manages user authentication and profile operations.  
**API Group:** User  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Endpoints

| Method | Endpoint   | Description                | Authorization  |
|--------|------------|----------------------------|----------------|
| POST   | `/register`| Register a new user        | Public         |
| POST   | `/login`   | User login                 | Public         |
| GET    | `/me`      | Retrieve current user info | Authenticated  |
| PUT    | `/me`      | Update user profile        | Authenticated  |
| DELETE | `/me`      | Delete user profile        | Authenticated  |

---

## Authorization

Authorization is handled using role-based access control (RBAC). The roles available in the system are:

- **Admin:** Full access to all resources and operations.
- **Manager:** Can manage teams, players, fixtures, and stadiums but has limited access compared to Admin.
- **Viewer:** Can view resources like teams, players, fixtures, and stadiums but cannot perform create, update, or delete operations.
- **Guest:** Limited access, primarily read-only access to public endpoints.

### Authorization Middleware

Routes are protected using the `authorize` middleware, which checks if the authenticated user has the required role(s) to access the endpoint. The middleware is used as follows:

```javascript
router.use(authenticate);
router.use(authorize('admin')); // Only accessible by Admin
```

Multiple roles can be specified to allow access to users with any of the listed roles:

```javascript
authorize('admin', 'manager', 'viewer')
```


---
For further details on each controller's implementation and additional middleware functionalities, please refer to their respective documentation or source code files.
