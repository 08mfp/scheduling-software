# Controllers Directory Documentation

Welcome to the **Controllers** directory documentation. This directory contains all the controller functions responsible for handling the business logic of the application. Each controller interacts with the models to perform CRUD (Create, Read, Update, Delete) operations and manage data flow between the client and the server. Controllers also handle request validations, error handling, and enforce authorization rules.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Controller Files Overview](#controller-files-overview)
  - [adminController.js](#admincontrollerjs)
  - [fixtureController.js](#fixturecontrollerjs)
  - [manualFixtureController.js](#manualfixturecontrollerjs)
  - [playerController.js](#playercontrollerjs)
  - [provisionalFixtureController.js](#provisionalfixturecontrollerjs)
  - [schedulerController.js](#schedulercontrollerjs)
  - [stadiumController.js](#stadiumcontrollerjs)
  - [teamController.js](#teamcontrollerjs)
  - [userController.js](#usercontrollerjs)
- [Authorization](#authorization)
- [Middleware](#middleware)
- [Error Handling & Logging](#error-handling--logging)
- [Usage](#usage)
- [Additional Notes](#additional-notes)

## Directory Structure

```
backend/
└── controllers/
    ├── adminController.js
    ├── fixtureController.js
    ├── manualFixtureController.js
    ├── playerController.js
    ├── provisionalFixtureController.js
    ├── schedulerController.js
    ├── stadiumController.js
    ├── teamController.js
    └── userController.js
```

Each `.js` file within the `controllers` directory defines a set of controller functions corresponding to different modules of the application. These controllers are invoked by the route handlers to process incoming requests and send appropriate responses.

## Controller Files Overview

### adminController.js

**Module:** `backend/controllers/adminController`  
**Description:** Manages administrative operations related to user management, including fetching, updating, and deleting users with the 'admin' role.  
**API Group:** Admin Routes  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Controller Functions

1. **getAllUsers**

   - **Description:** Retrieves all users from the database, excluding sensitive information like passwords and API keys.
   - **Route:** `GET /api/admin/users`
   - **Access:** Private (Admin only)
   - **Response:**
     ```json
     {
       "users": [
         {
           "_id": "userId1",
           "firstName": "John",
           "lastName": "Doe",
           "email": "john.doe@example.com",
           "role": "admin",
           "homeCity": "New York",
           "age": 30,
           "image": "/uploads/john_doe.png"
         },
         // More users...
       ]
     }
     ```

2. **getUserById**

   - **Description:** Retrieves a specific user by their ID.
   - **Route:** `GET /api/admin/users/:userId`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `userId` (URL Parameter): The ID of the user to retrieve.
   - **Response:**
     ```json
     {
       "user": {
         "_id": "userId1",
         "firstName": "John",
         "lastName": "Doe",
         "email": "john.doe@example.com",
         "role": "admin",
         "homeCity": "New York",
         "age": 30,
         "image": "/uploads/john_doe.png"
       }
     }
     ```

3. **updateAnyUser**

   - **Description:** Updates any user's information based on the provided data.
   - **Route:** `PUT /api/admin/users/:userId`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `userId` (URL Parameter): The ID of the user to update.
   - **Request Body:**
     ```json
     {
       "firstName": "Jane",
       "lastName": "Doe",
       "email": "jane.doe@example.com",
       "role": "manager",
       "homeCity": "Los Angeles",
       "age": 28,
       "password": "newSecurePassword",
       "secretCode": "ADMIN_SECRET_CODE"
     }
     ```
   - **Response:**
     ```json
     {
       "message": "User updated successfully.",
       "user": {
         "_id": "userId1",
         "firstName": "Jane",
         "lastName": "Doe",
         "email": "jane.doe@example.com",
         "role": "manager",
         "homeCity": "Los Angeles",
         "age": 28,
         "image": "/uploads/jane_doe.png"
       }
     }
     ```

4. **deleteUser**

   - **Description:** Deletes a user by their ID.
   - **Route:** `DELETE /api/admin/users/:userId`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `userId` (URL Parameter): The ID of the user to delete.
   - **Response:**
     ```json
     {
       "message": "User deleted successfully"
     }
     ```

---

### fixtureController.js

**Module:** `backend/controllers/fixtureController`  
**Description:** Handles operations related to fixtures, including fetching, creating, updating, and deleting fixtures.  
**API Group:** Fixture Routes  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Controller Functions

1. **getAllFixtures**

   - **Description:** Retrieves all fixtures, optionally filtered by season.
   - **Route:** `GET /api/fixtures`
   - **Access:** Public
   - **Query Parameters:**
     - `season` (optional): Filters fixtures by the specified season.
   - **Response:**
     ```json
     [
       {
         "_id": "fixtureId1",
         "round": 1,
         "date": "2024-04-25T15:00:00Z",
         "homeTeam": { "teamName": "Team A" },
         "awayTeam": { "teamName": "Team B" },
         "stadium": { "stadiumName": "Stadium X" },
         "location": "City X",
         "homeTeamScore": 25,
         "awayTeamScore": 20,
         "season": 2024
       },
       // More fixtures...
     ]
     ```

2. **getAllSeasons**

   - **Description:** Retrieves all distinct seasons available in the fixtures.
   - **Route:** `GET /api/fixtures/seasons`
   - **Access:** Public
   - **Response:**
     ```json
     [2024, 2023, 2022]
     ```

3. **getFixtureById**

   - **Description:** Retrieves a specific fixture by its ID.
   - **Route:** `GET /api/fixtures/:id`
   - **Access:** Public (Authenticated users: Admin, Manager, Viewer, Guest)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the fixture to retrieve.
   - **Response:**
     ```json
     {
       "_id": "fixtureId1",
       "round": 1,
       "date": "2024-04-25T15:00:00Z",
       "homeTeam": { "teamName": "Team A" },
       "awayTeam": { "teamName": "Team B" },
       "stadium": { "stadiumName": "Stadium X" },
       "location": "City X",
       "homeTeamScore": 25,
       "awayTeamScore": 20,
       "season": 2024
     }
     ```

4. **createFixture**

   - **Description:** Creates a new fixture.
   - **Route:** `POST /api/fixtures`
   - **Access:** Private (Admin only)
   - **Request Body:**
     ```json
     {
       "round": 1,
       "date": "2024-04-25T15:00:00Z",
       "homeTeam": "teamId1",
       "awayTeam": "teamId2",
       "stadium": "stadiumId1",
       "location": "City X",
       "homeTeamScore": 25,
       "awayTeamScore": 20,
       "season": 2024
     }
     ```
   - **Response:**
     ```json
     {
       "_id": "fixtureId1",
       "round": 1,
       "date": "2024-04-25T15:00:00Z",
       "homeTeam": "teamId1",
       "awayTeam": "teamId2",
       "stadium": "stadiumId1",
       "location": "City X",
       "homeTeamScore": 25,
       "awayTeamScore": 20,
       "season": 2024
     }
     ```

5. **updateFixture**

   - **Description:** Updates an existing fixture.
   - **Route:** `PUT /api/fixtures/:id`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the fixture to update.
   - **Request Body:**
     ```json
     {
       "round": 2,
       "date": "2024-05-02T18:00:00Z",
       "homeTeamScore": 30,
       "awayTeamScore": 22
     }
     ```
   - **Response:**
     ```json
     {
       "_id": "fixtureId1",
       "round": 2,
       "date": "2024-05-02T18:00:00Z",
       "homeTeam": "teamId1",
       "awayTeam": "teamId2",
       "stadium": "stadiumId1",
       "location": "City X",
       "homeTeamScore": 30,
       "awayTeamScore": 22,
       "season": 2024
     }
     ```

6. **deleteFixture**

   - **Description:** Deletes a fixture by its ID.
   - **Route:** `DELETE /api/fixtures/:id`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the fixture to delete.
   - **Response:**
     ```json
     {
       "message": "Fixture deleted"
     }
     ```

7. **bulkCreateFixtures**

   - **Description:** Creates multiple fixtures in bulk.
   - **Route:** `POST /api/fixtures/bulk`
   - **Access:** Private (Admin only)
   - **Request Body:**
     ```json
     {
       "fixtures": [
         {
           "round": 1,
           "date": "2024-04-25T15:00:00Z",
           "homeTeam": "teamId1",
           "awayTeam": "teamId2",
           "stadium": "stadiumId1",
           "location": "City X",
           "season": 2024
         },
         // More fixtures...
       ]
     }
     ```
   - **Response:**
     ```json
     [
       {
         "_id": "fixtureId1",
         "round": 1,
         "date": "2024-04-25T15:00:00Z",
         "homeTeam": "teamId1",
         "awayTeam": "teamId2",
         "stadium": "stadiumId1",
         "location": "City X",
         "season": 2024
       },
       // More fixtures...
     ]
     ```

---

### manualFixtureController.js

**Module:** `backend/controllers/manualFixtureController`  
**Description:** Manages manually scheduled fixtures, allowing administrators to set, validate, and save fixtures individually.  
**API Group:** Manual Fixture Routes  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Controller Functions

1. **getPreviousFixture**

   - **Description:** Retrieves the previous season's fixture between two teams to determine home and away advantages.
   - **Route:** `GET /api/manual-fixtures/previous-fixture`
   - **Access:** Private (Admin only)
   - **Query Parameters:**
     - `season` (required): The current season number.
     - `teamAId` (required): The ID of the first team.
     - `teamBId` (required): The ID of the second team.
   - **Response:**
     ```json
     {
       "homeTeam": {
         "_id": "teamId2",
         "teamName": "Team B"
       },
       "awayTeam": {
         "_id": "teamId1",
         "teamName": "Team A"
       },
       "stadium": {
         "_id": "stadiumId1",
         "stadiumName": "Stadium X"
       },
       "location": "City X",
       "previousFixture": {
         "season": 2023,
         "homeTeam": "teamId1",
         "awayTeam": "teamId2"
       }
     }
     ```

2. **validateFixtures**

   - **Description:** Validates manually scheduled fixtures against predefined constraints to ensure data integrity.
   - **Route:** `POST /api/manual-fixtures/validate`
   - **Access:** Private (Admin only)
   - **Request Body:**
     ```json
     {
       "fixtures": [
         {
           "round": 1,
           "date": "2024-04-25T15:00:00Z",
           "homeTeam": "teamId1",
           "awayTeam": "teamId2",
           "stadium": "stadiumId1",
           "location": "City X",
           "season": 2024
         },
         // More fixtures...
       ],
       "season": 2024
     }
     ```
   - **Response:**
     ```json
     {
       "message": "Fixtures are valid"
     }
     ```
     *Or, in case of validation errors:*
     ```json
     {
       "message": "Validation failed",
       "errors": [
         "There must be exactly 5 rounds",
         "Round 1 must have exactly 3 fixtures",
         // More errors...
       ]
     }
     ```

3. **saveFixtures**

   - **Description:** Saves manually scheduled fixtures to the main fixtures collection after validation.
   - **Route:** `POST /api/manual-fixtures/save`
   - **Access:** Private (Admin only)
   - **Request Body:**
     ```json
     {
       "fixtures": [
         {
           "round": 1,
           "date": "2024-04-25T15:00:00Z",
           "homeTeam": "teamId1",
           "awayTeam": "teamId2",
           "stadium": "stadiumId1",
           "location": "City X",
           "season": 2024
         },
         // More fixtures...
       ],
       "season": 2024
     }
     ```
   - **Response:**
     ```json
     {
       "message": "Fixtures saved successfully"
     }
     ```

4. **getProvisionalFixtures**

   - **Description:** Retrieves all provisional fixtures.
   - **Route:** `GET /api/provisional-fixtures`
   - **Access:** Private (Admin only)
   - **Response:**
     ```json
     [
       {
         "_id": "provisionalFixtureId1",
         "round": 1,
         "date": "2024-04-25T15:00:00Z",
         "homeTeam": "teamId1",
         "awayTeam": "teamId2",
         "stadium": "stadiumId1",
         "location": "City X",
         "season": 2024
       },
       // More provisional fixtures...
     ]
     ```

5. **clearProvisionalFixtures**

   - **Description:** Clears all provisional fixtures, allowing for a fresh start.
   - **Route:** `POST /api/provisional-fixtures/clear`
   - **Access:** Private (Admin only)
   - **Response:**
     ```json
     {
       "message": "Provisional fixtures cleared"
     }
     ```

---

### playerController.js

**Module:** `backend/controllers/playerController`  
**Description:** Manages player-related operations, including fetching, creating, updating, and deleting players. Handles image uploads and deletions associated with player profiles.  
**API Group:** Player Routes  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Controller Functions

1. **getAllPlayers**

   - **Description:** Retrieves all players, optionally filtered by team.
   - **Route:** `GET /api/players`
   - **Access:** Private (Admin, Manager, Viewer)
   - **Query Parameters:**
     - `team` (optional): Filters players by the specified team ID.
   - **Response:**
     ```json
     [
       {
         "_id": "playerId1",
         "image": "/uploads/player1.png",
         "firstName": "Alice",
         "lastName": "Smith",
         "dateOfBirth": "1995-06-15T00:00:00Z",
         "team": {
           "teamName": "Team A"
         },
         "fullName": "Alice Smith",
         "age": 29
       },
       // More players...
     ]
     ```

2. **getPlayerById**

   - **Description:** Retrieves a specific player by their ID.
   - **Route:** `GET /api/players/:id`
   - **Access:** Private (Admin, Manager, Viewer)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the player to retrieve.
   - **Response:**
     ```json
     {
       "_id": "playerId1",
       "image": "/uploads/player1.png",
       "firstName": "Alice",
       "lastName": "Smith",
       "dateOfBirth": "1995-06-15T00:00:00Z",
       "team": {
         "teamName": "Team A"
       },
       "fullName": "Alice Smith",
       "age": 29
     }
     ```

3. **createPlayer**

   - **Description:** Creates a new player with optional image upload.
   - **Route:** `POST /api/players`
   - **Access:** Private (Admin, Manager)
   - **Request Body:**
     - **Form Data:**
       - `firstName` (string, required)
       - `lastName` (string, required)
       - `dateOfBirth` (date, required)
       - `team` (string, required): Team ID.
       - `image` (file, optional): Player's image.
       - `removeImage` (boolean, optional): Indicates whether to remove an existing image.
   - **Response:**
     ```json
     {
       "_id": "playerId1",
       "image": "/uploads/player1.png",
       "firstName": "Alice",
       "lastName": "Smith",
       "dateOfBirth": "1995-06-15T00:00:00Z",
       "team": "teamId1",
       "fullName": "Alice Smith",
       "age": 29
     }
     ```

4. **updatePlayer**

   - **Description:** Updates an existing player's information, including handling image uploads and deletions.
   - **Route:** `PUT /api/players/:id`
   - **Access:** Private (Admin, Manager)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the player to update.
   - **Request Body:**
     - **Form Data:**
       - `firstName` (string, optional)
       - `lastName` (string, optional)
       - `dateOfBirth` (date, optional)
       - `team` (string, optional): Team ID.
       - `image` (file, optional): New image to upload.
       - `removeImage` (boolean, optional): Indicates whether to remove the existing image.
   - **Response:**
     ```json
     {
       "_id": "playerId1",
       "image": "/uploads/new_player1.png",
       "firstName": "Alice",
       "lastName": "Johnson",
       "dateOfBirth": "1995-06-15T00:00:00Z",
       "team": "teamId2",
       "fullName": "Alice Johnson",
       "age": 29
     }
     ```

5. **deletePlayer**

   - **Description:** Deletes a player by their ID and removes associated images.
   - **Route:** `DELETE /api/players/:id`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the player to delete.
   - **Response:**
     ```json
     {
       "message": "Player deleted"
     }
     ```

---

### provisionalFixtureController.js

**Module:** `backend/controllers/provisionalFixtureController`  
**Description:** Manages provisional fixtures generated by scheduling algorithms before they are finalized and moved to the main fixtures collection.  
**API Group:** Provisional Fixture Routes  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Controller Functions

1. **generateProvisionalFixtures**

   - **Description:** Generates provisional fixtures using specified scheduling algorithms.
   - **Route:** `POST /api/provisional-fixtures/generate`
   - **Access:** Private (Admin only)
   - **Request Body:**
     ```json
     {
       "algorithm": "random", // Options: "random", "round5Extravaganza", "travelOptimized", "balancedTravel"
       "season": 2024,
       "teams": ["teamId1", "teamId2", "teamId3", "teamId4", "teamId5", "teamId6"]
     }
     ```
   - **Response:**
     ```json
     {
       "message": "Provisional fixtures generated",
       "fixtures": [
         {
           "_id": "provisionalFixtureId1",
           "round": 1,
           "date": "2024-04-25T15:00:00Z",
           "homeTeam": "teamId1",
           "awayTeam": "teamId2",
           "stadium": "stadiumId1",
           "location": "City X",
           "season": 2024
         },
         // More provisional fixtures...
       ],
       "summary": {
         // Summary details from the scheduling algorithm
       }
     }
     ```

2. **getProvisionalFixtures**

   - **Description:** Retrieves all provisional fixtures.
   - **Route:** `GET /api/provisional-fixtures`
   - **Access:** Private (Admin only)
   - **Response:**
     ```json
     [
       {
         "_id": "provisionalFixtureId1",
         "round": 1,
         "date": "2024-04-25T15:00:00Z",
         "homeTeam": "teamId1",
         "awayTeam": "teamId2",
         "stadium": "stadiumId1",
         "location": "City X",
         "season": 2024
       },
       // More provisional fixtures...
     ]
     ```

3. **saveProvisionalFixtures**

   - **Description:** Saves provisional fixtures to the main fixtures collection, effectively finalizing them.
   - **Route:** `POST /api/provisional-fixtures/save`
   - **Access:** Private (Admin only)
   - **Request Body:**
     ```json
     {
       "season": 2024
     }
     ```
   - **Response:**
     ```json
     {
       "message": "Fixtures saved"
     }
     ```

4. **clearProvisionalFixtures**

   - **Description:** Clears all provisional fixtures to allow for a fresh start.
   - **Route:** `POST /api/provisional-fixtures/clear`
   - **Access:** Private (Admin only)
   - **Response:**
     ```json
     {
       "message": "Provisional fixtures cleared"
     }
     ```

---

### schedulerController.js

**Module:** `backend/controllers/schedulerController`  
**Description:** Handles scheduler operations, including running scheduling algorithms to generate fixtures.  
**API Group:** Scheduler Routes  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Controller Functions

1. **runScheduler**

   - **Description:** Executes the scheduler to generate provisional fixtures.
   - **Route:** `POST /api/scheduler/run`
   - **Access:** Private (Admin only)
   - **Request Body:**
     ```json
     {
       // Optional parameters for scheduler configuration
     }
     ```
   - **Response:**
     ```json
     {
       "message": "Scheduler run successfully"
     }
     ```

   > **Note:** This endpoint is a placeholder.

---

### stadiumController.js

**Module:** `backend/controllers/stadiumController`  
**Description:** Manages stadium-related operations, including fetching, creating, updating, and deleting stadiums.  
**API Group:** Stadium Routes  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Controller Functions

1. **getAllStadiums**

   - **Description:** Retrieves all stadiums from the database.
   - **Route:** `GET /api/stadiums`
   - **Access:** Private (Admin, Manager, Viewer)
   - **Response:**
     ```json
     [
       {
         "_id": "stadiumId1",
         "stadiumName": "Stadium X",
         "stadiumCity": "City X",
         "stadiumCountry": "Country Y",
         "latitude": 40.7128,
         "longitude": -74.0060,
         "stadiumCapacity": 50000,
         "surfaceType": "Grass"
       },
       // More stadiums...
     ]
     ```

2. **getStadiumById**

   - **Description:** Retrieves a specific stadium by its ID.
   - **Route:** `GET /api/stadiums/:id`
   - **Access:** Private (Admin, Manager, Viewer)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the stadium to retrieve.
   - **Response:**
     ```json
     {
       "_id": "stadiumId1",
       "stadiumName": "Stadium X",
       "stadiumCity": "City X",
       "stadiumCountry": "Country Y",
       "latitude": 40.7128,
       "longitude": -74.0060,
       "stadiumCapacity": 50000,
       "surfaceType": "Grass"
     }
     ```

3. **createStadium**

   - **Description:** Creates a new stadium.
   - **Route:** `POST /api/stadiums`
   - **Access:** Private (Admin only)
   - **Request Body:**
     ```json
     {
       "stadiumName": "Stadium Y",
       "stadiumCity": "City Y",
       "stadiumCountry": "Country Z",
       "latitude": 34.0522,
       "longitude": -118.2437,
       "stadiumCapacity": 60000,
       "surfaceType": "Artificial Turf"
     }
     ```
   - **Response:**
     ```json
     {
       "_id": "stadiumId2",
       "stadiumName": "Stadium Y",
       "stadiumCity": "City Y",
       "stadiumCountry": "Country Z",
       "latitude": 34.0522,
       "longitude": -118.2437,
       "stadiumCapacity": 60000,
       "surfaceType": "Artificial Turf"
     }
     ```

4. **updateStadium**

   - **Description:** Updates an existing stadium's information.
   - **Route:** `PUT /api/stadiums/:id`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the stadium to update.
   - **Request Body:**
     ```json
     {
       "stadiumName": "Stadium Z",
       "stadiumCapacity": 55000
     }
     ```
   - **Response:**
     ```json
     {
       "_id": "stadiumId1",
       "stadiumName": "Stadium Z",
       "stadiumCity": "City X",
       "stadiumCountry": "Country Y",
       "latitude": 40.7128,
       "longitude": -74.0060,
       "stadiumCapacity": 55000,
       "surfaceType": "Grass"
     }
     ```

5. **deleteStadium**

   - **Description:** Deletes a stadium by its ID.
   - **Route:** `DELETE /api/stadiums/:id`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the stadium to delete.
   - **Response:**
     ```json
     {
       "message": "Stadium deleted"
     }
     ```

---

### teamController.js

**Module:** `backend/controllers/teamController`  
**Description:** Manages team-related operations, including fetching, creating, updating, and deleting teams. Handles image uploads and deletions associated with team profiles, and provides detailed team information along with associated players and fixtures.  
**API Group:** Team Routes  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Controller Functions

1. **getAllTeams**

   - **Description:** Retrieves all teams from the database.
   - **Route:** `GET /api/teams`
   - **Access:** Public (Authenticated: Admin, Manager, Viewer)
   - **Response:**
     ```json
     [
       {
         "_id": "teamId1",
         "image": "/uploads/team1.png",
         "teamName": "Team A",
         "teamRanking": 1,
         "teamLocation": "City A",
         "teamCoach": "Coach A",
         "stadium": {
           "_id": "stadiumId1",
           "stadiumName": "Stadium X",
           // Other stadium fields...
         },
         "fullName": "Team A",
         "age": 0
       },
       // More teams...
     ]
     ```

2. **getTeamById**

   - **Description:** Retrieves a specific team by its ID.
   - **Route:** `GET /api/teams/:id`
   - **Access:** Public (Authenticated: Admin, Manager, Viewer)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the team to retrieve.
   - **Response:**
     ```json
     {
       "_id": "teamId1",
       "image": "/uploads/team1.png",
       "teamName": "Team A",
       "teamRanking": 1,
       "teamLocation": "City A",
       "teamCoach": "Coach A",
       "stadium": {
         "_id": "stadiumId1",
         "stadiumName": "Stadium X",
         // Other stadium fields...
       },
       "fullName": "Team A",
       "age": 0
     }
     ```

3. **getTeamWithPlayers**

   - **Description:** Retrieves a team along with its associated players.
   - **Route:** `GET /api/teams/:id/players`
   - **Access:** Public (Authenticated: Admin, Manager, Viewer)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the team.
   - **Response:**
     ```json
     {
       "team": {
         "_id": "teamId1",
         "teamName": "Team A",
         "teamRanking": 1,
         "teamLocation": "City A",
         "teamCoach": "Coach A",
         "stadium": "stadiumId1",
         "image": "/uploads/team1.png"
       },
       "players": [
         {
           "_id": "playerId1",
           "image": "/uploads/player1.png",
           "firstName": "Alice",
           "lastName": "Smith",
           "dateOfBirth": "1995-06-15T00:00:00Z",
           "team": "teamId1",
           "fullName": "Alice Smith",
           "age": 29
         },
         // More players...
       ]
     }
     ```

4. **getTeamFixtures**

   - **Description:** Retrieves all fixtures associated with a specific team.
   - **Route:** `GET /api/teams/:id/fixtures`
   - **Access:** Public (Authenticated: Admin, Manager, Viewer)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the team.
   - **Response:**
     ```json
     [
       {
         "_id": "fixtureId1",
         "round": 1,
         "date": "2024-04-25T15:00:00Z",
         "homeTeam": { "teamName": "Team A" },
         "awayTeam": { "teamName": "Team B" },
         "stadium": { "stadiumName": "Stadium X" },
         "location": "City X",
         "homeTeamScore": 25,
         "awayTeamScore": 20,
         "season": 2024
       },
       // More fixtures...
     ]
     ```

5. **createTeam**

   - **Description:** Creates a new team with optional image upload.
   - **Route:** `POST /api/teams`
   - **Access:** Private (Admin only)
   - **Request Body:**
     - **Form Data:**
       - `teamName` (string, required)
       - `teamRanking` (number, required)
       - `teamLocation` (string, required)
       - `teamCoach` (string, required)
       - `stadium` (string, required): Stadium ID.
       - `image` (file, optional): Team's image.
       - `removeImage` (boolean, optional): Indicates whether to remove an existing image.
   - **Response:**
     ```json
     {
       "_id": "teamId1",
       "image": "/uploads/team1.png",
       "teamName": "Team A",
       "teamRanking": 1,
       "teamLocation": "City A",
       "teamCoach": "Coach A",
       "stadium": "stadiumId1"
     }
     ```

6. **updateTeam**

   - **Description:** Updates an existing team's information, including handling image uploads and deletions.
   - **Route:** `PUT /api/teams/:id`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the team to update.
   - **Request Body:**
     - **Form Data:**
       - `teamName` (string, optional)
       - `teamRanking` (number, optional)
       - `teamLocation` (string, optional)
       - `teamCoach` (string, optional)
       - `stadium` (string, optional): Stadium ID.
       - `image` (file, optional): New image to upload.
       - `removeImage` (boolean, optional): Indicates whether to remove the existing image.
   - **Response:**
     ```json
     {
       "_id": "teamId1",
       "image": "/uploads/new_team1.png",
       "teamName": "Team A Updated",
       "teamRanking": 2,
       "teamLocation": "City B",
       "teamCoach": "Coach B",
       "stadium": "stadiumId2"
     }
     ```

7. **deleteTeam**

   - **Description:** Deletes a team by its ID.
   - **Route:** `DELETE /api/teams/:id`
   - **Access:** Private (Admin only)
   - **Parameters:**
     - `id` (URL Parameter): The ID of the team to delete.
   - **Response:**
     ```json
     {
       "message": "Team deleted"
     }
     ```

---

### userController.js

**Module:** `backend/controllers/userController`  
**Description:** Handles user authentication and profile management, including registration, login, fetching current user details, updating profiles, and deleting user profiles. Manages API key generation and password hashing.  
**API Group:** User  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Controller Functions

1. **registerUser**

   - **Description:** Registers a new user.
   - **Route:** `POST /api/users/register`
   - **Access:** Public
   - **Request Body:**
     ```json
     {
       "firstName": "John",
       "lastName": "Doe",
       "email": "john.doe@example.com",
       "password": "securePassword123",
       "role": "admin" // Optional: Defaults to 'guest' if not provided
     }
     ```
   - **Response:**
     ```json
     {
       "message": "User registered successfully",
       "apiKey": "generatedApiKey1234567890abcdef"
     }
     ```

2. **loginUser**

   - **Description:** Authenticates a user and provides an API key.
   - **Route:** `POST /api/users/login`
   - **Access:** Public
   - **Request Body:**
     ```json
     {
       "email": "john.doe@example.com",
       "password": "securePassword123"
     }
     ```
   - **Response:**
     ```json
     {
       "message": "Login successful",
       "apiKey": "newGeneratedApiKey1234567890abcdef"
     }
     ```

3. **getCurrentUser**

   - **Description:** Retrieves details of the currently authenticated user.
   - **Route:** `GET /api/users/me`
   - **Access:** Private (Authenticated users)
   - **Response:**
     ```json
     {
       "firstName": "John",
       "lastName": "Doe",
       "email": "john.doe@example.com",
       "role": "admin",
       "homeCity": "New York",
       "age": 30,
       "image": "/uploads/john_doe.png"
     }
     ```

4. **updateUserProfile**

   - **Description:** Updates the authenticated user's profile, including handling image uploads and deletions.
   - **Route:** `PUT /api/users/me`
   - **Access:** Private (Authenticated users)
   - **Request Body:**
     - **Form Data:**
       - `firstName` (string, optional)
       - `lastName` (string, optional)
       - `email` (string, optional)
       - `homeCity` (string, optional)
       - `age` (number, optional)
       - `password` (string, optional)
       - `image` (file, optional): New profile image to upload.
       - `removeImage` (boolean, optional): Indicates whether to remove the existing image.
   - **Response:**
     ```json
     {
       "message": "Profile updated successfully",
       "user": {
         "firstName": "John",
         "lastName": "Doe",
         "email": "john.doe@example.com",
         "role": "admin",
         "homeCity": "New York",
         "age": 30,
         "image": "/uploads/new_john_doe.png"
       }
     }
     ```

5. **deleteUserProfile**

   - **Description:** Deletes the authenticated user's profile and associated images.
   - **Route:** `DELETE /api/users/me`
   - **Access:** Private (Authenticated users)
   - **Response:**
     ```json
     {
       "message": "User profile deleted successfully."
     }
     ```

---

## Authorization

Authorization in this application is managed using Role-Based Access Control (RBAC). Each endpoint specifies the required roles needed to access it. The roles defined in the system are:

- **Admin:** Full access to all resources and operations.
- **Manager:** Can manage teams, players, fixtures, and stadiums but has limited access compared to Admin.
- **Viewer:** Can view resources like teams, players, fixtures, and stadiums but cannot perform create, update, or delete operations.
- **Guest:** Limited access, primarily read-only access to public endpoints.

### Authorization Middleware

Controllers enforce authorization through middleware functions. The `authorize` middleware checks if the authenticated user possesses the necessary role(s) to access a particular endpoint.

**Example Usage in Routes:**

```javascript
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('admin')); // Only accessible by Admin
```

**Multiple Roles:**

```javascript
authorize('admin', 'manager', 'viewer')
```

This allows access to users with any of the specified roles.

---

## Middleware

Several middleware functions are utilized across controllers to handle various aspects of request processing:

1. **authenticate:**
   - **Description:** Verifies the user's authentication status, typically by checking a JWT token or session.
   - **Usage:** Applied to routes that require the user to be authenticated.
   
   ```javascript
   router.use(authenticate);
   ```

2. **authorize:**
   - **Description:** Checks if the authenticated user has the necessary role(s) to access the route.
   - **Usage:** Applied after authentication to enforce role-based access control.
   
   ```javascript
   router.use(authorize('admin'));
   ```

3. **upload:**
   - **Description:** Handles file uploads, such as images for users, teams, and players.
   - **Usage:** Used in controller functions that involve uploading files.
   
   ```javascript
   const upload = require('../middleware/upload');
   
   exports.createPlayer = (req, res) => {
     upload(req, res, async (err) => {
       // Handle upload and create player
     });
   };
   ```

4. **logger:**
   - **Description:** Logs important events, errors, and warnings for monitoring and debugging purposes.
   - **Usage:** Integrated into controller functions to log actions and errors.
   
   ```javascript
   const logger = require('../middleware/logger');
   
   logger.info('User registered successfully');
   ```

---

## Error Handling & Logging

Controllers implement comprehensive error handling to ensure that clients receive meaningful feedback and that server-side issues are properly logged for debugging.

- **Try-Catch Blocks:** Enclose asynchronous operations within `try-catch` blocks to catch and handle errors.
  
  ```javascript
  try {
    // Asynchronous operations
  } catch (error) {
    logger.error(`Error message: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
  ```

- **Validation Errors:** Return `400 Bad Request` for validation failures with descriptive error messages.
  
  ```json
  {
    "message": "Validation failed",
    "errors": [
      "There must be exactly 5 rounds",
      "Round 1 must have exactly 3 fixtures"
    ]
  }
  ```

- **Authentication & Authorization Errors:** Return `401 Unauthorized` or `403 Forbidden` when access is denied.
  
  ```json
  {
    "message": "User not authenticated"
  }
  ```

- **Not Found Errors:** Return `404 Not Found` when requested resources do not exist.
  
  ```json
  {
    "message": "User not found."
  }
  ```

- **Logging:** Utilize a logging middleware to record informational messages, warnings, and errors.
  
  ```javascript
  logger.info('User logged in successfully');
  logger.warn('Attempt to delete non-existent user');
  logger.error('Error updating fixture: Database connection failed');
  ```

---

## Usage

To utilize these controllers within your Express application, ensure that they are correctly imported and used within your route definitions. Below is an example of how to set up and integrate the controllers with routes:

```javascript
const express = require('express');
const app = express();

// Import controller files
const adminController = require('./controllers/adminController');
const fixtureController = require('./controllers/fixtureController');
const manualFixtureController = require('./controllers/manualFixtureController');
const playerController = require('./controllers/playerController');
const provisionalFixtureController = require('./controllers/provisionalFixtureController');
const schedulerController = require('./controllers/schedulerController');
const stadiumController = require('./controllers/stadiumController');
const teamController = require('./controllers/teamController');
const userController = require('./controllers/userController');

// Import route files
const adminRoutes = require('./routes/adminRoutes');
const fixtureRoutes = require('./routes/fixtureRoutes');
const manualFixtureRoutes = require('./routes/manualFixtureRoutes');
const playerRoutes = require('./routes/playerRoutes');
const provisionalFixtureRoutes = require('./routes/provisionalFixtureRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const stadiumRoutes = require('./routes/stadiumRoutes');
const teamRoutes = require('./routes/teamRoutes');
const userRoutes = require('./routes/userRoutes');

// Middleware
app.use(express.json());

// Use routes
app.use('/api/admin', adminRoutes);
app.use('/api/fixtures', fixtureRoutes);
app.use('/api/manual-fixtures', manualFixtureRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/provisional-fixtures', provisionalFixtureRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/stadiums', stadiumRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/users', userRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**Example: Using `adminController` in `adminRoutes.js`**

```javascript
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize('admin'));

// Define routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId', adminController.updateAnyUser);
router.delete('/users/:userId', adminController.deleteUser);

module.exports = router;
```

**Example: Using `userController` in `userRoutes.js`**

```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Protected routes
router.get('/me', authenticate, userController.getCurrentUser);
router.put('/me', authenticate, userController.updateUserProfile);
router.delete('/me', authenticate, userController.deleteUserProfile);

module.exports = router;
```

---

## Additional Notes

- **File Uploads:** Controllers that handle file uploads (e.g., images) utilize the `upload` middleware. Ensure that the `upload` middleware is correctly configured to handle file storage and validation.

- **API Key Management:** User-related controllers manage API key generation and regeneration during registration and login. Protect API keys as sensitive information and implement rate limiting or other security measures as necessary.

- **Scheduling Algorithms:** The `provisionalFixtureController` integrates with scheduling algorithms (e.g., `randomAlgorithm`, `round5Extravaganza`, `travelOptimizedScheduler`, `balancedTravelScheduler`). Ensure that these algorithms are correctly implemented and imported.

- **Data Validation:** While controllers perform basic validation (e.g., checking for required fields), consider implementing additional validation layers using libraries like `Joi` or `Express Validator` for more robust request validations.

- **Security Considerations:**
  - Sanitize all inputs to prevent injection attacks.
  - Implement HTTPS to secure data in transit.
  - Use environment variables to manage sensitive configurations (e.g., `ADMIN_SECRET_KEY`).

- **Performance Optimizations:**
  - Utilize pagination for endpoints that return large datasets (e.g., `getAllUsers`, `getAllFixtures`).
  - Implement caching strategies where appropriate to reduce database load (e.g., caching seasons in `getAllSeasons`).

- **Testing:** Develop unit and integration tests for controller functions to ensure reliability and facilitate maintenance.

- **Documentation:** Keep controller documentation up-to-date with any changes in the codebase to ensure consistency and ease of understanding for future developers.

---

For further details on each controller's implementation and additional functionalities, please refer to their respective source code files within the `controllers` directory.
