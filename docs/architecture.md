# Architecture

The application uses a modular monolith with the request flow:

`Controller → Service → Repository → Model`

## Responsibilities

- `src/config/`: Parse environment variables and establish or close the MongoDB connection.
- `src/modules/`: Feature modules. Each module owns its model, validation, repository, service, controller, and routes. Business APIs are intentionally not implemented in this foundation.
- `src/middlewares/`: Express request validation, centralized error responses, and unknown-route handling.
- `src/utils/`: Reusable API error/response types and async controller error forwarding.
- `src/constants/`: Shared domain constants, such as session statuses, when business modules are added.
- `src/routes/`: Mount feature routers under the API prefix.
- `src/app.ts`: Compose Express middleware and routers without starting a listener.
- `src/server.ts`: Connect to MongoDB, start the HTTP listener, and handle graceful shutdown.
- `tests/`: Integration tests and shared test helpers.
- `postman/`: Postman collection for API requests. It is empty until business endpoints are implemented.

## Feature module responsibilities

- `*.model.ts`: Mongoose schema and model.
- `*.interface.ts`: Feature-specific TypeScript types.
- `*.validation.ts`: Zod request schemas.
- `*.repository.ts`: Database reads, writes, and aggregation pipelines.
- `*.service.ts`: Business rules and coordination between repositories.
- `*.controller.ts`: HTTP input/output mapping; no database or business logic.
- `*.routes.ts`: Feature route definitions and validation/controller wiring.

## Database schemas

- `User` stores a learner's name, unique email, and phone number.
- `Teacher` stores a teacher's name, email, specialization, and experience. Teacher email is not unique.
- `Session` references one teacher and optionally one user. Its status is constrained to `AVAILABLE`, `BOOKED`, or `COMPLETED`.
- Mongoose timestamps add `createdAt` and `updatedAt` to all three collections.

The session indexes support date/status lookups for available sessions, a user's status/date history, and teacher schedules. The user email index enforces uniqueness in MongoDB. Required fields, the session status enum, defaults, and the end-after-start rule are enforced by Mongoose schema validation when documents are validated or saved.

Session creation checks for an existing overlapping interval for the selected teacher before insert. This check is not atomic with the insert, so concurrent requests can both pass; safe serialization would require a transaction on a MongoDB replica set.

Available sessions are queried in the session repository with an aggregation pipeline. The match stage filters `AVAILABLE` sessions within a start-inclusive, end-exclusive UTC calendar-day range; results are sorted by start time, joined to teachers with `$lookup`, flattened with `$unwind`, and projected to the response fields. The supplied Unix-millisecond timestamp determines the UTC date, not the server's local timezone.

Booking uses `findOneAndUpdate` with `_id` and `AVAILABLE` in the same filter as the status and user assignment update. MongoDB applies this single-document update atomically, so only one concurrent request can match the available state. If the atomic update does not match, a follow-up read distinguishes a missing session (404) from a session in a non-bookable state (409).

Completion likewise uses a conditional atomic update matching `_id` and `BOOKED`, then sets `COMPLETED` and `completedAt`. Only after a non-match does the service read the current status to distinguish a missing session from an invalid state. Concurrent completion attempts therefore result in one success and one conflict.

User session history first verifies that the user exists, then fetches session records in MongoDB with a repository aggregation. `$match` scopes documents by `userId`, and `$facet` partitions `BOOKED` and `COMPLETED` records into independently sorted arrays; `AVAILABLE` records are not included. Empty results are normalized to the two empty arrays in the repository.
