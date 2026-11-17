# Teacher Session Booking API

TypeScript, Express, MongoDB, and Mongoose project foundation for the teacher session booking assignment.

> The project foundation, Create User API, Create Session API, Available Sessions API, Book Session API, Mark Session Complete API, and User Session History API are implemented.

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

## API

### Create user

`POST /users`

```json
{
  "fullName": "Avinash Kumar",
  "email": "avinash@gmail.com",
  "phone": "9876543210"
}
```

Successful requests return HTTP 201 and a `{ "success": true, "message": "...", "data": { ... } }` response. Invalid input returns HTTP 400; a previously registered email returns HTTP 409. Email is trimmed and lowercased before storage.

The Postman example is available in [postman/collection.json](postman/collection.json). Remaining assignment endpoints will be implemented in later steps.

### Create session

`POST /sessions`

```json
{
  "teacherId": "REPLACE_WITH_TEACHER_OBJECT_ID",
  "startTime": "2026-11-20T10:00:00.000Z",
  "endTime": "2026-11-20T11:00:00.000Z"
}
```

The teacher must already exist. End time must be later than start time, and the request is rejected if the teacher has an overlapping session. New sessions default to `AVAILABLE`, with `userId` and `completedAt` set to `null`.

To insert sample teachers idempotently, start MongoDB and run:

```sh
npm run seed:teachers
```

The script uses stable sample emails and only inserts records that are not already present. Query the Teacher collection to copy a teacher `_id` into the Postman `teacherId` variable.

Overlap prevention currently checks for existing sessions and then inserts. This handles ordinary sequential requests but is **not race-safe** against concurrent requests for the same teacher. A transaction that serializes operations by writing the teacher record and checks overlap within that transaction is the simplest reliable approach in a MongoDB replica set; standalone MongoDB does not support transactions.

### Get available sessions by date

`GET /sessions/available?dateTimestamp=1795161600000`

`dateTimestamp` is a Unix timestamp in milliseconds. The timestamp identifies a UTC calendar date; the endpoint returns sessions whose `startTime` is at or after 00:00 UTC on that date and before 00:00 UTC the following date. The time range is start-inclusive and end-exclusive. Results include selected teacher details and are sorted by start time ascending. The query uses a MongoDB aggregation pipeline.

### Book a session

`POST /sessions/:id/book`

```json
{
  "userId": "REPLACE_WITH_USER_OBJECT_ID"
}
```

The session is booked only if its status is `AVAILABLE`. The repository performs a single atomic conditional update matching both the session ID and `AVAILABLE` status; concurrent requests cannot both change the same document from `AVAILABLE` to `BOOKED`. A losing request receives HTTP 409. The Postman collection includes a booking request.

### Complete a session

`PATCH /sessions/:id/complete`

No request body is required. Only sessions in `BOOKED` state can be completed; successful requests atomically set `status` to `COMPLETED` and `completedAt` to the current time. A session in another state returns HTTP 409, and an unknown session returns HTTP 404. The Postman collection includes a completion request.

### Get user session history

`GET /users/:id/sessions`

Returns a `data` object with `upcomingSessions` (sessions whose status is `BOOKED`) and `completedSessions` (sessions whose status is `COMPLETED`). `AVAILABLE` sessions are excluded. Results are separated in MongoDB using an aggregation `$facet`; an existing user with no matching sessions receives two empty arrays.

## Database models

The User, Teacher, and Session Mongoose schemas are in their respective feature modules. They define required fields and timestamps; User email has a unique database index, while Teacher email is not unique. Sessions reference teachers and optionally users, default to `AVAILABLE`, and validate that the end time follows the start time. See [docs/architecture.md](docs/architecture.md) for the model relationships and index rationale.
