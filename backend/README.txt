# Backend Documentation

Welcome to the **Backend** of the Six Nations Fixture Scheduling Application. This documentation provides an overview of the backend directory structure, detailed descriptions of each component, and guidelines for setup and usage.

## Table of Contents

- [Introduction](#introduction)
- [Directory Structure](#directory-structure)
- [Folder Descriptions](#folder-descriptions)
  - [algorithms](#algorithms)
  - [controllers](#controllers)
  - [middleware](#middleware)
  - [models](#models)
  - [routes](#routes)
  - [server](#server)
  - [uploads](#uploads)
- [Root Files](#root-files)
  - [.env](#env)
  - [.gitignore](#gitignore)
  - [package.json](#packagejson)
  - [package-lock.json](#packagelockjson)
  - [README.txt](#readmetxt)
- [Setup Instructions](#setup-instructions)
- [Seeding the Database](#seeding-the-database)
- [API Endpoints](#api-endpoints)
- [Additional Notes](#additional-notes)

## Introduction

The backend is built using **Node.js** and **Express**, with **MongoDB** as the database. It manages data related to teams, players, stadiums, fixtures, and scheduling algorithms. The backend provides a RESTful API for the frontend to interact with, handling CRUD operations, scheduling logic, and data management.

## Directory Structure

```
backend/
├── algorithms/
│   ├── balancedTravelScheduler.js
│   ├── randomAlgorithm.js
│   ├── round5Extravaganza.js
│   ├── travelOptimizedScheduler.js
│   └── README.txt
├── controllers/
│   ├── fixtureController.js
│   ├── manualFixtureController.js
│   ├── playerController.js
│   ├── provisionalFixtureController.js
│   ├── schedulerController.js
│   ├── stadiumController.js
│   ├── teamController.js
│   └── README.txt
├── middleware/
│   ├── logger.js
│   ├── upload.js
│   └── README.md
├── models/
│   ├── Fixture.js
│   ├── ManualFixture.js
│   ├── Player.js
│   ├── ProvisionalFixture.js
│   ├── Stadium.js
│   ├── Team.js
│   └── README.txt
├── routes/
│   ├── fixtureRoutes.js
│   ├── manualFixtureRoutes.js
│   ├── playerRoutes.js
│   ├── provisionalFixtureRoutes.js
│   ├── schedulerRoutes.js
│   ├── stadiumRoutes.js
│   ├── teamRoutes.js
│   └── README.txt
├── server/
│   ├── server.js
│   └── seed.js
├── uploads/
│   └── README.txt
├── node_modules/
├── .env
├── .gitignore
├── package-lock.json
├── package.json
└── README.txt
```

## Folder Descriptions

### algorithms

Contains various algorithms for fixture scheduling.

- **balancedTravelScheduler.js**
  - *[Description pending based on future file submissions.]*
  
- **randomAlgorithm.js**
  - **Description:** Implements a random fixture generation algorithm ensuring each of the 6 teams plays every other team exactly once. It assigns home and away teams by alternating venues based on the previous season's data or randomly if no prior data exists. Additionally, it schedules fixture dates within specified timeframes and ensures that no two rounds overlap on the same weekend.

- **round5Extravaganza.js**
  - **Description:** Generates fixtures with a special focus on having the top two ranked teams compete against each other in the final game of the last round. This algorithm organizes all unique matchups, assigns home and away teams while balancing based on past seasons, and schedules the fixtures to ensure optimal timing and venue alternation.

- **travelOptimizedScheduler.js**
  - **Description:** Develops a fixture schedule aimed at minimizing the total travel distance for all teams throughout the season. It leverages the Google Maps API to calculate accurate distances between stadiums, optimizes home and away assignments to balance travel, and schedules fixture dates to reduce consecutive travel burdens. The module also generates a comprehensive summary of travel distances and fixture allocations.

- **README.txt**
  - **Description:** Provides additional information and guidelines related to the algorithms.

### controllers

Handles the business logic and interacts with the models.

- **fixtureController.js**
  - **Description:** Manages CRUD (Create, Read, Update, Delete) operations for fixtures in the database. It allows fetching all fixtures (optionally filtered by season), retrieving individual fixtures by ID, creating new fixtures, updating existing ones, and deleting fixtures. Additionally, it supports bulk creation of fixtures from provisional data.

- **manualFixtureController.js**
  - **Description:** Handles the manual scheduling of fixtures, including fetching previous season fixtures to alternate home and away venues, validating manually entered fixtures against defined constraints, and saving validated fixtures to the main database. This controller ensures that manually scheduled fixtures adhere to rules such as venue alternation and proper date/time allocations.

- **playerController.js**
  - **Description:** Manages CRUD operations for player entities in the database. It supports fetching all players (optionally filtered by team), retrieving individual players by ID, creating new players with optional image uploads, updating existing player details and images, and deleting players. The controller includes functionality to handle image uploads and removals securely.

- **provisionalFixtureController.js**
  - **Description:** Manages provisional fixtures used during the scheduling process. It allows generating provisional fixtures using various algorithms, fetching all provisional fixtures, saving provisional fixtures to the main fixtures collection after validation, and clearing provisional fixtures. This controller facilitates the transition from provisional to finalized fixture schedules.

- **schedulerController.js**
  - **Description:** Serves as a placeholder for scheduler-related operations. Currently, it includes a route to run the scheduler, which is intended to execute the scheduling algorithms to generate fixture schedules. Future implementations can expand this controller with additional scheduler functionalities.

- **stadiumController.js**
  - **Description:** Manages CRUD operations for stadium entities in the database. It allows fetching all stadiums, retrieving individual stadiums by ID, creating new stadiums, updating existing stadium details, and deleting stadiums. This controller ensures that stadium information is accurately maintained and accessible.

- **teamController.js**
  - **Description:** Handles CRUD operations for team entities in the database, including image uploads for team profiles. It supports fetching all teams, retrieving individual teams by ID (with optional player details), fetching fixtures associated with a team, creating new teams with optional images, updating existing team details and images, and deleting teams. The controller ensures that team information, including images, is properly managed.

- **README.txt**
  - **Description:** Provides additional information and guidelines related to the controllers.

### middleware

Contains custom middleware for request handling and file uploads.

- **logger.js**
  - **Description:** Implements request logging using the `morgan` middleware. It logs HTTP methods, URLs, status codes, response times, and the request body for each incoming request. This helps in monitoring and debugging by providing detailed logs of server activity.

- **upload.js**
  - **Description:** Configures the `multer` middleware for handling file uploads, specifically images. It sets up storage options, including the destination folder (`./uploads/`) and filename formatting. The middleware enforces file size limits (maximum of 5MB) and restricts uploads to specific image formats (JPEG, JPG, PNG, GIF). It processes single file uploads under the form field name `image`.

- **README.md**
  - **Description:** Provides additional information and guidelines related to the middleware.

### models

Defines the data schemas using Mongoose.

- **Fixture.js**
  - **Description:** Defines the schema for fixtures in the database using Mongoose. Each fixture includes details such as the round number, date, home and away teams, stadium, location, scores, and the season year. It includes pre-validation to ensure that scores are provided for past fixtures and are not set for future fixtures.

- **ManualFixture.js**
  - **Description:** Defines the schema for manually scheduled fixtures, allowing administrators to set fixtures individually. This separate schema ensures that manual entries do not interfere with automatically generated fixtures. It includes fields for round, date, home and away teams, stadium, location, and season.

- **Player.js**
  - **Description:** Defines the schema for players in the database. Each player has an image (optional), first and last names, date of birth, and is linked to a team. Virtual properties are added to automatically generate the player's full name and calculate their age based on the date of birth.

- **ProvisionalFixture.js**
  - **Description:** Defines the schema for provisional fixtures used during the scheduling process. These fixtures are temporary and can be reviewed or edited before being finalized and moved to the main fixtures collection. Fields include round, date, home and away teams, stadium, location, and season.

- **Stadium.js**
  - **Description:** Defines the schema for stadiums in the database. Each stadium includes details such as name, city, country, geographic coordinates (latitude and longitude), capacity, and surface type. This information is crucial for scheduling fixtures and calculating travel distances.

- **Team.js**
  - **Description:** Defines the schema for teams in the database. Each team has an image (optional), name, ranking, location, coach, and is linked to a home stadium. This schema ensures that all relevant team information is stored and can be accessed for fixture generation and display purposes.

- **README.txt**
  - **Description:** Provides additional information and guidelines related to the models.

### routes

Defines the API endpoints and their corresponding controllers.

- **fixtureRoutes.js**
  - **Description:** Defines the API endpoints for managing fixtures. Routes include:
    - `GET /api/fixtures`: Fetch all fixtures, optionally filtered by season.
    - `GET /api/fixtures/seasons`: Retrieve all distinct seasons available in fixtures.
    - `GET /api/fixtures/:id`: Fetch a specific fixture by its ID.
    - `POST /api/fixtures`: Create a new fixture.
    - `PUT /api/fixtures/:id`: Update an existing fixture by ID.
    - `DELETE /api/fixtures/:id`: Delete a fixture by ID.
    - `GET /api/fixtures/bulk`: Bulk create fixtures *(Note: This should ideally be a `POST` route for RESTful conventions).*

- **manualFixtureRoutes.js**
  - **Description:** Defines the API endpoints for manually managing fixtures. Routes include:
    - `GET /api/manual-fixtures/previous-fixture`: Retrieve the previous season's fixture between two teams to determine venue alternation.
    - `POST /api/manual-fixtures/validate`: Validate manually scheduled fixtures against defined constraints.
    - `POST /api/manual-fixtures/save`: Save validated manually scheduled fixtures to the main fixtures collection.

- **playerRoutes.js**
  - **Description:** Defines the API endpoints for managing players. Routes include:
    - `GET /api/players`: Fetch all players, optionally filtered by team.
    - `GET /api/players/:id`: Retrieve a specific player by ID.
    - `POST /api/players`: Create a new player with optional image upload.
    - `PUT /api/players/:id`: Update an existing player's details and image.
    - `DELETE /api/players/:id`: Delete a player by ID.

- **provisionalFixtureRoutes.js**
  - **Description:** Defines the API endpoints for managing provisional fixtures. Routes include:
    - `POST /api/provisional-fixtures/generate`: Generate provisional fixtures using selected algorithms.
    - `GET /api/provisional-fixtures`: Retrieve all provisional fixtures.
    - `POST /api/provisional-fixtures/save`: Save provisional fixtures to the main fixtures collection.
    - `DELETE /api/provisional-fixtures`: Clear all provisional fixtures.

- **schedulerRoutes.js**
  - **Description:** Defines the API endpoints for scheduler operations. Currently includes:
    - `POST /api/scheduler/run`: Execute the scheduler to generate fixture schedules. *(Note: The implementation inside `schedulerController` is currently a placeholder and should be expanded with actual scheduling logic.)*

- **stadiumRoutes.js**
  - **Description:** Defines the API endpoints for managing stadiums. Routes include:
    - `GET /api/stadiums`: Fetch all stadiums.
    - `GET /api/stadiums/:id`: Retrieve a specific stadium by ID.
    - `POST /api/stadiums`: Create a new stadium.
    - `PUT /api/stadiums/:id`: Update an existing stadium's details.
    - `DELETE /api/stadiums/:id`: Delete a stadium by ID.

- **teamRoutes.js**
  - **Description:** Defines the API endpoints for managing teams. Routes include:
    - `GET /api/teams`: Fetch all teams.
    - `GET /api/teams/:id`: Retrieve a specific team by ID.
    - `GET /api/teams/:id/players`: Fetch all players belonging to a specific team.
    - `GET /api/teams/:id/fixtures`: Retrieve all fixtures associated with a specific team.
    - `POST /api/teams`: Create a new team with optional image upload.
    - `PUT /api/teams/:id`: Update an existing team's details and image.
    - `DELETE /api/teams/:id`: Delete a team by ID.

- **README.txt**
  - **Description:** Provides additional information and guidelines related to the routes.

### server

Contains the server entry point and database seeding script.

- **server.js**
  - **Description:** Serves as the entry point for the backend server. It sets up the Express application, connects to the MongoDB database, and configures middleware for request parsing, CORS, logging, and static file serving. It also registers all API routes for teams, stadiums, players, fixtures, scheduler, provisional fixtures, and manual fixtures. The server listens on port `5003` and logs connection status to the console.

- **seed.js**
  - **Description:** Seeds the MongoDB database with initial data, including dummy data for teams, stadiums, players, and fixtures spanning the 2021 to 2024 seasons. The script performs the following steps:
    1. **Clears Existing Data:** Deletes all documents from the `Fixture`, `Player`, `Team`, and `Stadium` collections to ensure a fresh start.
    2. **Creates Stadiums:** Inserts predefined stadiums with details like name, city, country, coordinates, capacity, and surface type.
    3. **Creates Teams:** Inserts teams linked to their respective stadiums. Each team includes attributes such as name, ranking, location, coach, and a reference to its home stadium.
    4. **Creates Players:** Inserts players linked to their respective teams. Each player includes attributes like first name, last name, date of birth, and a reference to their team. The script generates random dates of birth between 1985 and 2000 for players.
    5. **Creates Fixtures:** Inserts fixtures for each season (2021-2024) by linking teams and stadiums. Each fixture includes details like round number, date (with a default time of 14:00), home and away teams, scores, stadium, location, and season year. The script ensures that all references are correctly established and logs any missing data during the process.
    6. **Closes Connection:** After successfully seeding all data, the script closes the MongoDB connection.

    **Additional Notes:**
    - The script uses environment variables for the MongoDB URI, defaulting to `mongodb://localhost:27017/sixnations` if not specified.
    - It includes console logs with emojis to indicate the progress and status of each seeding step.
    - Error handling is implemented to catch and log any issues during the seeding process, ensuring that the database connection is closed even if errors occur.
    - **TODO:** Remember to remove emojis after ensuring the implementation works correctly. They are currently used for visual feedback during development and testing.

### uploads

Stores uploaded images for teams and players.

- **README.txt**
  - **Description:** Provides information about the `uploads` directory, which stores uploaded images for teams and players. It includes guidelines on acceptable file types, size limits, and instructions for managing uploaded files. This directory is served statically, allowing access to uploaded images via URLs.

### node_modules

- **Description:** Contains all the installed npm packages required for the backend application. This directory is automatically managed by npm and should not be manually edited.

## Root Files

### .env

- **Description:** Stores environment variables used by the application, such as database connection strings, API keys (e.g., Google Maps API), and other configuration settings. This file should be kept secure and not committed to version control.

### .gitignore

- **Description:** Specifies intentionally untracked files that Git should ignore. Typically includes `node_modules`, `uploads`, `.env`, and other sensitive or unnecessary files.

### package.json

- **Description:** Defines the project's metadata, scripts, dependencies, and other configurations. It is essential for managing the project's dependencies and scripts.

### package-lock.json

- **Description:** Automatically generated file that locks the versions of installed npm packages to ensure consistent installations across different environments.

### README.txt

- **Description:** Provides an overview of the backend project, including setup instructions, usage guidelines, and any other relevant information for developers or users interacting with the backend.

## Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone .....
   cd .....
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Create a `.env` file in the root directory.
   - Add the necessary environment variables:
     ```env
     MONGODB_URI=mongodb://localhost:27017/sixnations
     GOOGLE_MAPS_API_KEY=your_google_maps_api_key
     PORT=5003
     ```

4. **Seed the Database (Optional):**
   - To populate the database with initial data, run:
     ```bash
     node server/seed.js
     ```

5. **Start the Server:**
   ```bash
   npm start
   ```
   - The server will run on `http://localhost:5003`.

## Seeding the Database

The `seed.js` script populates the MongoDB database with initial data for stadiums, teams, players, and fixtures spanning the 2021 to 2024 seasons.

**To run the seeding script:**

```bash
node server/seed.js
```

**Notes:**

- Ensure that MongoDB is running and accessible via the URI specified in the `.env` file.
- The script will clear existing data in the `Fixture`, `Player`, `Team`, and `Stadium` collections before seeding new data.
- Emojis are used in console logs for visual feedback during development and testing. Remove them if not needed.

## API Endpoints

The backend provides a comprehensive RESTful API for managing fixtures, teams, players, stadiums, and more. Below is a summary of the available endpoints:

### Fixtures

- **GET** `/api/fixtures`: Fetch all fixtures, optionally filtered by season.
- **GET** `/api/fixtures/seasons`: Retrieve all distinct seasons available in fixtures.
- **GET** `/api/fixtures/:id`: Fetch a specific fixture by its ID.
- **POST** `/api/fixtures`: Create a new fixture.
- **PUT** `/api/fixtures/:id`: Update an existing fixture by ID.
- **DELETE** `/api/fixtures/:id`: Delete a fixture by ID.
- **GET** `/api/fixtures/bulk`: Bulk create fixtures *(Note: Consider changing to POST for RESTful compliance).*

### Manual Fixtures

- **GET** `/api/manual-fixtures/previous-fixture`: Retrieve the previous season's fixture between two teams to determine venue alternation.
- **POST** `/api/manual-fixtures/validate`: Validate manually scheduled fixtures against defined constraints.
- **POST** `/api/manual-fixtures/save`: Save validated manually scheduled fixtures to the main fixtures collection.

### Players

- **GET** `/api/players`: Fetch all players, optionally filtered by team.
- **GET** `/api/players/:id`: Retrieve a specific player by ID.
- **POST** `/api/players`: Create a new player with optional image upload.
- **PUT** `/api/players/:id`: Update an existing player's details and image.
- **DELETE** `/api/players/:id`: Delete a player by ID.

### Provisional Fixtures

- **POST** `/api/provisional-fixtures/generate`: Generate provisional fixtures using selected algorithms.
- **GET** `/api/provisional-fixtures`: Retrieve all provisional fixtures.
- **POST** `/api/provisional-fixtures/save`: Save provisional fixtures to the main fixtures collection.
- **DELETE** `/api/provisional-fixtures`: Clear all provisional fixtures.

### Scheduler

- **POST** `/api/scheduler/run`: Execute the scheduler to generate fixture schedules. *(Currently a placeholder; expand with actual scheduling logic.)*

### Stadiums

- **GET** `/api/stadiums`: Fetch all stadiums.
- **GET** `/api/stadiums/:id`: Retrieve a specific stadium by ID.
- **POST** `/api/stadiums`: Create a new stadium.
- **PUT** `/api/stadiums/:id`: Update an existing stadium's details.
- **DELETE** `/api/stadiums/:id`: Delete a stadium by ID.

### Teams

- **GET** `/api/teams`: Fetch all teams.
- **GET** `/api/teams/:id`: Retrieve a specific team by ID.
- **GET** `/api/teams/:id/players`: Fetch all players belonging to a specific team.
- **GET** `/api/teams/:id/fixtures`: Retrieve all fixtures associated with a specific team.
- **POST** `/api/teams`: Create a new team with optional image upload.
- **PUT** `/api/teams/:id`: Update an existing team's details and image.
- **DELETE** `/api/teams/:id`: Delete a team by ID.

## Additional Notes

- **Logging:** The backend uses `morgan` for HTTP request logging, providing detailed logs for monitoring and debugging purposes.
- **File Uploads:** Handled by `multer`, ensuring secure and validated image uploads for teams and players.
- **Environment Variables:** Critical for security and configuration. Ensure the `.env` file is properly set up and not exposed publicly.
- **Version Control:** The `.gitignore` file ensures that sensitive and unnecessary files like `node_modules`, `uploads`, and `.env` are not tracked by Git.
- **Dependencies:** Managed via `package.json` and locked in `package-lock.json` for consistency across environments.

For any further questions or contributions, please refer to the project's repository or contact the development team.
