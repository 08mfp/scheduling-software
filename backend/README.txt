# Six Nations Scheduling API

This repository contains the backend server for managing data and scheduling for the Six Nations Rugby Tournament. 
Built using Node.js, Express, and MongoDB, the API provides endpoints for managing teams, stadiums, players, fixtures, and more.

---

## Project Structure (incomplete)

```
backend/
├── server/
│   └── server.js          # Main server entry point
├── controllers/           # Contains all API implementations
│   ├── .js
│   ├── .js
│   ├── .js
│   ├── .js
│   ├── .js
│   ├── .js
│   └── .js
├── routes/                # API route definitions
│   ├── teamRoutes.js
│   ├── stadiumRoutes.js
│   ├── playerRoutes.js
│   ├── fixtureRoutes.js
│   ├── schedulerRoutes.js
│   ├── provisionalFixtureRoutes.js
│   └── manualFixtureRoutes.js
├── middleware/
│   └── logger.js          # Logging middleware
├── uploads/               # Static file storage for images
```

---

## Prerequisites

- **Node.js**: v14 or higher
- **MongoDB**: Installed and running locally on `mongodb://localhost:27017`. If you have it running on a different port then updte the .env or routes in server.js
- **npm**: v6 or higher

---

## Installation

1. **Clone the repository:**
   ```bash
   git clone (myrepo)
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `backend/server` directory:
   ```
   MONGO_URI=mongodb://localhost:27017/sixnations OR your address
   PORT=5003
   ```

---

## Running the Server

1. **Start MongoDB**:
   Ensure MongoDB is running locally:
   ```bash
   mongod
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Access the API:**
   The server will run at `http://localhost:5003`.

---
## Adding fake data

1. **Go to the 'server' folder **:
   Ensure MongoDB is running locally:
   ```bash
   cd server
   ```

2. **Run the Script:**
   ```bash
   node seed.js
   ```

---

## API Endpoints (incomplete)

### Teams
- `GET /api/teams` - Fetch all teams
- `POST /api/teams` - Add a new team

### Stadiums
- `GET /api/stadiums` - Fetch all stadiums

### Players
- `GET /api/players` - Fetch all players

### Fixtures
- `GET /api/fixtures` - Fetch all fixtures
- `POST /api/fixtures` - Add a new fixture

### Scheduler
- `POST /api/scheduler` - Generate a schedule

---

## Middleware

- **Logger**: Logs incoming requests to the console.

---
