# Models Directory Documentation

Welcome to the **Models** directory documentation. This directory contains all the Mongoose schemas and models that define the structure of the application's data. Each model represents a collection in the MongoDB database and includes schemas with fields, validations, virtuals, and middleware to enforce data integrity and business logic.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Model Files Overview](#model-files-overview)
  - [Fixture.js](#fixturejs)
  - [ManualFixture.js](#manualfixturejs)
  - [Player.js](#playerjs)
  - [ProvisionalFixture.js](#provisionalfixturejs)
  - [Stadium.js](#stadiumjs)
  - [Team.js](#teamjs)
  - [User.js](#userjs)
- [Schema Relationships](#schema-relationships)
- [Virtuals and Middleware](#virtuals-and-middleware)
- [Usage](#usage)

## Directory Structure

```
backend/
└── models/
    ├── Fixture.js
    ├── ManualFixture.js
    ├── Player.js
    ├── ProvisionalFixture.js
    ├── Stadium.js
    ├── Team.js
    └── User.js
```

Each `.js` file within the `models` directory defines a Mongoose schema and exports a corresponding model. These models are used throughout the application to interact with the MongoDB database.

## Model Files Overview

### Fixture.js

**Module:** `backend/models/Fixture`  
**Description:** Defines the schema for fixtures, including validations based on fixture dates.  
**API Group:** Fixture  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Schema Fields

| Field           | Type                        | Required | Description                                                                                                      |
|-----------------|-----------------------------|----------|------------------------------------------------------------------------------------------------------------------|
| round           | Number                      | Yes      | The round number of the fixture (1-5, as per the Six Nations format).                                           |
| date            | Date                        | Yes      | The scheduled date and time of the fixture.                                                                     |
| homeTeam        | ObjectId (ref: Team)        | Yes      | Reference to the home team participating in the fixture.                                                        |
| awayTeam        | ObjectId (ref: Team)        | Yes      | Reference to the away team participating in the fixture.                                                        |
| stadium         | ObjectId (ref: Stadium)     | Yes      | Reference to the stadium where the fixture is held.                                                              |
| location        | String                      | Yes      | The location description of the stadium.                                                                         |
| homeTeamScore   | Number                      | No       | The score of the home team. Required for past fixtures (validation implemented).                                 |
| awayTeamScore   | Number                      | No       | The score of the away team. Required for past fixtures (validation implemented).                                 |
| season          | Number                      | Yes      | The season number the fixture belongs to.                                                                        |

#### Validations and Middleware

- **Round Validation:** Ensures the `round` field is between 1 and 5.
- **Score Validation:** 
  - **Past Fixtures:** Scores (`homeTeamScore` and `awayTeamScore`) must be provided if the fixture date is in the past.
  - **Future Fixtures:** Scores cannot be set for fixtures scheduled in the future.

```javascript
FixtureSchema.pre('validate', function (next) {
  const now = new Date();
  const fixtureDate = new Date(this.date);

  if (fixtureDate < now) {
    if (this.homeTeamScore == null || this.awayTeamScore == null) {
      // Uncomment lines below to enforce score requirement for past fixtures
      // const err = new Error('Scores are required for past fixtures');
      // next(err);
    }
  } else {
    if (this.homeTeamScore != null || this.awayTeamScore != null) {
      const err = new Error('Scores cannot be set for future fixtures');
      next(err);
    }
  }
  next();
});
```

---

### ManualFixture.js

**Module:** `backend/models/ManualFixture`  
**Description:** Defines the schema for manually scheduled fixtures, allowing users to individually set all fixture details.  
**API Group:** Manual Fixture  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Schema Fields

| Field       | Type                    | Required | Description                                         |
|-------------|-------------------------|----------|-----------------------------------------------------|
| round       | Number                  | Yes      | The round number of the fixture (1-5).              |
| date        | Date                    | Yes      | The scheduled date and time of the fixture.         |
| homeTeam    | ObjectId (ref: Team)    | Yes      | Reference to the home team.                         |
| awayTeam    | ObjectId (ref: Team)    | Yes      | Reference to the away team.                         |
| stadium     | ObjectId (ref: Stadium) | Yes      | Reference to the stadium where the fixture is held. |
| location    | String                  | Yes      | The location description of the stadium.            |
| season      | Number                  | Yes      | The season number the fixture belongs to.           |

#### Purpose

- **Isolation:** Separates manual fixtures from the main `Fixture` collection to prevent interference during scheduling and fixture management.
- **Scheduling Algorithm:** Used by the scheduling algorithm before finalizing and posting fixtures to the main database.

---

### Player.js

**Module:** `backend/models/Player`  
**Description:** Defines the schema for players, including automatic generation of full names and ages.  
**API Group:** Player  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Schema Fields

| Field         | Type                    | Required | Description                             |
|---------------|-------------------------|----------|-----------------------------------------|
| image         | String                  | No       | URL or path to the player's image.      |
| firstName     | String                  | Yes      | Player's first name.                    |
| lastName      | String                  | Yes      | Player's last name.                     |
| dateOfBirth   | Date                    | Yes      | Player's date of birth.                 |
| team          | ObjectId (ref: Team)    | Yes      | Reference to the team the player belongs to. |

#### Virtuals

- **fullName:** Concatenates `firstName` and `lastName`.
  
  ```javascript
  PlayerSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
  });
  ```

- **age:** Calculates the player's age based on `dateOfBirth`.
  
  ```javascript
  PlayerSchema.virtual('age').get(function () {
    const today = new Date();
    let age = today.getFullYear() - this.dateOfBirth.getFullYear();
    const m = today.getMonth() - this.dateOfBirth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < this.dateOfBirth.getDate())) {
      age--;
    }
    return age;
  });
  ```

#### Middleware

- **Serialization:** Ensures virtuals are included when converting documents to objects or JSON.
  
  ```javascript
  PlayerSchema.set('toObject', { virtuals: true });
  PlayerSchema.set('toJSON', { virtuals: true });
  ```

---

### ProvisionalFixture.js

**Module:** `backend/models/ProvisionalFixture`  
**Description:** Defines the schema for provisional fixtures used by the scheduling algorithm before finalizing fixtures.  
**API Group:** Provisional Fixture  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Schema Fields

| Field       | Type                    | Required | Description                                         |
|-------------|-------------------------|----------|-----------------------------------------------------|
| round       | Number                  | No       | The round number of the fixture.                    |
| date        | Date                    | No       | The scheduled date and time of the fixture.         |
| homeTeam    | ObjectId (ref: Team)    | No       | Reference to the home team.                         |
| awayTeam    | ObjectId (ref: Team)    | No       | Reference to the away team.                         |
| stadium     | ObjectId (ref: Stadium) | No       | Reference to the stadium where the fixture is held. |
| location    | String                  | No       | The location description of the stadium.            |
| season      | Number                  | No       | The season number the fixture belongs to.           |

#### Purpose

- **Scheduling Algorithm:** Temporarily holds fixtures generated by the scheduling algorithm before they are moved to the main `Fixture` collection.
- **Data Integrity:** Prevents interference with existing fixtures during the creation and validation of new fixtures.

---

### Stadium.js

**Module:** `backend/models/Stadium`  
**Description:** Defines the schema for stadiums, including location and capacity details.  
**API Group:** Stadium  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Schema Fields

| Field           | Type     | Required | Description                                          |
|-----------------|----------|----------|------------------------------------------------------|
| stadiumName     | String   | Yes      | Name of the stadium.                                 |
| stadiumCity     | String   | Yes      | City where the stadium is located.                   |
| stadiumCountry  | String   | Yes      | Country where the stadium is located.                |
| latitude        | Number   | Yes      | Geographical latitude of the stadium.                |
| longitude       | Number   | Yes      | Geographical longitude of the stadium.               |
| stadiumCapacity | Number   | Yes      | Seating capacity of the stadium.                     |
| surfaceType     | String   | Yes      | Type of playing surface (`Grass` or `Artificial Turf`). |

---

### Team.js

**Module:** `backend/models/Team`  
**Description:** Defines the schema for teams, including ranking and coach information.  
**API Group:** Team  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Schema Fields

| Field         | Type                    | Required | Description                                          |
|---------------|-------------------------|----------|------------------------------------------------------|
| image         | String                  | No       | URL or path to the team's logo or image.             |
| teamName      | String                  | Yes      | Name of the team.                                     |
| teamRanking   | Number                  | Yes      | Current ranking of the team.                         |
| teamLocation  | String                  | Yes      | Geographical location of the team.                   |
| teamCoach     | String                  | Yes      | Name of the team's coach.                            |
| stadium       | ObjectId (ref: Stadium) | Yes      | Reference to the team's home stadium.                |

#### Additional Notes

- **Unique Constraint:** Consider adding a unique constraint to the `stadium` field to prevent scheduling conflicts in algorithms.

```javascript
stadium: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Stadium',
  required: true,
  // unique: true, // Uncomment if wanting unique stadium assignment
},
```

---

### User.js

**Module:** `backend/models/User`  
**Description:** Defines the schema for users, including authentication and role management.  
**API Group:** User  
**Version:** 1.0.0  
**Author:** [github.com/08mfp](https://github.com/08mfp)

#### Schema Fields

| Field              | Type                     | Required | Description                                                   |
|--------------------|--------------------------|----------|---------------------------------------------------------------|
| name               | Object                   | No       | Contains `firstName` and `lastName` of the user.              |
| name.firstName     | String                   | No       | User's first name.                                            |
| name.lastName      | String                   | No       | User's last name.                                             |
| email              | String                   | Yes      | User's email address (unique).                                |
| password           | String                   | Yes      | Hashed password for user authentication.                     |
| apiKey             | String                   | No       | Unique API key for the user, generated upon request.         |
| role               | String                   | No       | User's role (`admin`, `manager`, `viewer`, `guest`). Defaults to `guest`. |
| requestCount       | Number                   | No       | Counts the number of API requests made by the user. Defaults to `0`. |
| requestResetTime   | Date                     | No       | Timestamp for when the request count resets. Defaults to current date and time. |
| image              | String                   | No       | URL or path to the user's profile image.                      |
| homeCity           | String                   | No       | User's home city.                                             |
| age                | Number                   | No       | User's age.                                                   |

#### Middleware

- **Password Hashing:** Automatically hashes the user's password before saving to the database.

  ```javascript
  userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
      try {
        const saltRounds = 10; // Adjust depending on security requirements
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
  ```

- **API Key Generation:** Provides a method to generate a unique API key for the user.

  ```javascript
  userSchema.methods.generateApiKey = function () {
    this.apiKey = crypto.randomBytes(32).toString('hex');
  };
  ```

- **Password Comparison:** Provides a method to compare a plaintext password with the hashed password stored in the database.

  ```javascript
  userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };
  ```

---

## Schema Relationships

The models are interconnected through references (`ObjectId`) to establish relationships between different entities in the database. Below is an overview of the relationships:

- **Fixture**
  - `homeTeam` and `awayTeam` reference the `Team` model.
  - `stadium` references the `Stadium` model.
  
- **ManualFixture**
  - References the `Team` and `Stadium` models similar to `Fixture`.
  
- **Player**
  - `team` references the `Team` model.
  
- **ProvisionalFixture**
  - References the `Team` and `Stadium` models.
  
- **Team**
  - `stadium` references the `Stadium` model.
  
- **User**
  - No direct references to other models but includes roles for authorization purposes.

**Visual Representation:**

```
User
|
|-- Role-based access to
    |
    +-- AdminRoutes
    +-- FixtureRoutes
    +-- TeamRoutes
    +-- etc.

Fixture --> Team
Fixture --> Stadium

ManualFixture --> Team
ManualFixture --> Stadium

ProvisionalFixture --> Team
ProvisionalFixture --> Stadium

Player --> Team

Team --> Stadium
```

---

## Virtuals and Middleware

### Virtuals

Virtual properties are used to define fields that are not stored in the database but are derived from existing data.

- **Player Model:**
  - `fullName`: Combines `firstName` and `lastName`.
  - `age`: Calculates the player's age based on `dateOfBirth`.

### Middleware

Middleware functions are used to perform operations before or after certain actions, such as saving or validating data.

- **Fixture Model:**
  - **Pre-validate:** Ensures that scores are appropriately set based on the fixture date.
  
- **User Model:**
  - **Pre-save:** Hashes the password before saving.
  - **Instance Methods:** Provides methods for generating API keys and comparing passwords.

---


## Additional Notes

- **Data Validation:** Ensure that all required fields are provided when creating or updating documents to prevent validation errors. (needs to be done via frotn end validation)
- **Error Handling:** Implement proper error handling in your controllers to catch and respond to validation and database errors.
- **Indexes:** Consider adding indexes to frequently queried fields to improve performance, especially for large collections.

---

For further details on each model's implementation and additional functionalities, please refer to their respective source code files within the `models` directory.
