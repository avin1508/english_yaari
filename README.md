# Teacher Session Booking API

TypeScript, Express, MongoDB, and Mongoose project foundation for the teacher session booking assignment.

> This setup intentionally does not implement the six business APIs. It provides the application structure, configuration, middleware, and test/build tooling required before feature work begins.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB running locally or a MongoDB connection URI

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Configure environment variables by copying `.env.example` to `.env` and updating the MongoDB URI if needed:

   ```text
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/teacher-session-booking
   ```

3. Start the development server:

   ```sh
   npm run dev
   ```

   The server connects to MongoDB before it begins listening.

## Scripts

| Command                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Run the server with `tsx` watch mode     |
| `npm run build`        | Compile TypeScript into `dist/`          |
| `npm start`            | Run the compiled server                  |
| `npm test`             | Run Jest integration tests               |
| `npm run lint`         | Run ESLint                               |
| `npm run format`       | Format project files with Prettier       |
| `npm run format:check` | Check formatting without modifying files |

## Project layout

Feature modules follow the `Controller → Service → Repository → Model` flow. See [docs/architecture.md](docs/architecture.md) for the responsibility of each layer and folder.

## API status

Business endpoints and Postman requests will be added in the next implementation step. This foundation currently provides centralized 404/error handling and no assignment business APIs.

## Database models

The User, Teacher, and Session Mongoose schemas are in their respective feature modules. They define required fields and timestamps; User email has a unique database index, while Teacher email is not unique. Sessions reference teachers and optionally users, default to `AVAILABLE`, and validate that the end time follows the start time. See [docs/architecture.md](docs/architecture.md) for the model relationships and index rationale.
