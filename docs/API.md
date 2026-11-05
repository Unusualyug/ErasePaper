# REST API reference

Base path: `/api`. The browser uses relative URLs through Vite during development and Express in the recommended same-origin production deployment. API responses are `no-store`.

Authenticated requests use the server-managed `ep_session` HTTP-only cookie. No Clerk/Bearer token is accepted. The cookie is scoped to `/api`, uses `SameSite=Lax`, expires after seven days, and is marked `Secure` in production. The server stores only an HMAC of the random session token. Admin authorization always uses the current server-owned account role.

## Public and authentication

| Method | Path             | Purpose                                                 |
| ------ | ---------------- | ------------------------------------------------------- |
| GET    | `/health`        | Health, mode and repository type                        |
| GET    | `/config`        | Public mode and WhatsApp number; no secrets             |
| GET    | `/services`      | Five active services and dynamic field definitions      |
| POST   | `/auth/register` | Create a student account and set a session cookie       |
| POST   | `/auth/login`    | Authenticate username/password and set a session cookie |
| POST   | `/auth/logout`   | Revoke the current session and clear the cookie         |

Registration body:

```json
{
  "username": "aarav_sharma",
  "phoneNumber": "+919876543210",
  "password": "a unique password with 12+ characters"
}
```

Usernames are case-insensitive for login and must be 3–32 characters using letters, numbers, dots, underscores or hyphens (first character alphanumeric). Passwords are 12–128 characters. Mobile numbers use international format. The system does **not** verify mobile numbers or send SMS/OTP. Registration always creates a student; extra fields such as `role` are rejected. The returned user is a public profile only and never includes a password hash.

Login body:

```json
{ "username": "aarav_sharma", "password": "your password" }
```

Logout requires no request body; if a valid session cookie is present it is revoked. `/auth/register` and `/auth/login` are rate-limited. There is no automated password-reset route.

Demo-only endpoint (not mounted in live/production):

| Method | Path               | Purpose                                                |
| ------ | ------------------ | ------------------------------------------------------ |
| POST   | `/auth/demo/quick` | Enter the seeded demo student persona only (demo mode) |

Body: `{ "persona": "student" }` or `{ "persona": "admin" }`. The route sets the same HTTP-only session cookie against the isolated in-memory demo store. No demo OTP endpoints exist.

## Authenticated student endpoints

| Method | Path                                      | Purpose                                                  |
| ------ | ----------------------------------------- | -------------------------------------------------------- |
| GET    | `/me`                                     | Current public profile and mode                          |
| PATCH  | `/me`                                     | Edit display name and optional, unverified email         |
| GET    | `/requests`                               | Own paginated request history                            |
| GET    | `/requests/summary`                       | Own total/pending/in-progress/completed/cancelled counts |
| POST   | `/requests`                               | Create a request with optional multipart attachments     |
| GET    | `/requests/:id`                           | Own request details                                      |
| POST   | `/requests/:id/cancel`                    | Cancel an own pending request                            |
| GET    | `/requests/:id/attachments/:attachmentId` | Authorized private attachment download                   |
| GET    | `/notifications`                          | Own notifications, or admin notifications for admins     |
| POST   | `/notifications/read`                     | Mark notifications read; optional `ids` array            |

The mobile number and username are not currently editable through the profile API. Email is optional, is not verified and is not used for sign-in. There are no phone/email verification endpoints.

### Request lists

Query parameters:

- `page`: positive integer, default `1`
- `limit`: `1`–`100`, default `10`
- `search`: request ID/title/description; admin search also includes student contact details
- `service`: service slug
- `status`: `Pending`, `In Progress`, `Completed`, `Cancelled`
- `from`, `to`: optional ISO dates, validated by the API

List response: `{ "items": [], "total": 0, "page": 1, "pages": 1 }`. Student lists always use the authenticated account ID on the server.

### Create a request

Use `multipart/form-data` when attaching files; JSON is accepted without files.

```text
serviceSlug: research-paper
title: Research methodology guidance
description: I would like feedback on my proposed methodology and research structure.
additionalInfo: Optional context
integrityAcknowledged: true
details: {"researchArea":"Renewable energy","academicLevel":"Postgraduate","citationStyle":"APA 7","deadline":"2026-12-01"}
attachments: up to 3 files
```

Required field keys/values come from `/services`; the server validates them again. Strict schemas reject unexpected top-level fields. Attachments use the `attachments` field name, up to three files of 10 MB each.

A student response never includes `adminNotes`, password/session information or physical attachment storage keys.

### Update profile

```json
{ "fullName": "Aarav Sharma", "email": "aarav@example.com" }
```

`email` is optional and unverified. No email or phone verification flow is provided.

## Administrator

All routes below require an active administrator account in the local account collection.

| Method | Path                         | Purpose                                                            |
| ------ | ---------------------------- | ------------------------------------------------------------------ |
| GET    | `/admin/analytics`           | Admin-only aggregate analytics                                     |
| GET    | `/admin/overview`            | Aggregate stats, recent students/requests, audit and deletion jobs |
| GET    | `/admin/students`            | Search/date-filtered paginated students                            |
| GET    | `/admin/students/:id`        | Student profile, statistics and request history                    |
| DELETE | `/admin/students/:id`        | Confirmed secure deletion; `200` complete or `202` processing      |
| GET    | `/admin/requests`            | Search/filter/paginate all local requests                          |
| GET    | `/admin/requests/:id`        | Full request and internal notes                                    |
| PATCH  | `/admin/requests/:id`        | Update status and/or internal notes                                |
| GET    | `/admin/activities`          | Latest minimal audit entries                                       |
| GET    | `/admin/deletions`           | Pending deletion jobs and retry state                              |
| POST   | `/admin/deletions/:id/retry` | Retry a due/unleased cleanup job                                   |

Student query parameters: `page`, `limit`, `search` (name/mobile/email/username/student ID), `from`, `to`.

Delete body:

```json
{ "confirmation": "Exact Student Full Name" }
```

Request update body (at least one field):

```json
{ "status": "In Progress", "adminNotes": "Internal follow-up notes." }
```

Status changes notify the student and create an audit entry. Notes are never included in student responses. Administrator accounts cannot be deleted through the student-deletion endpoint. New registration cannot grant admin; a trusted operator uses `npm run admin:create -- <username>` after independently confirming the account owner.

## Analytics

The `/analytics/heartbeat`, `/analytics/page-view`, and `/analytics/visitor` endpoints are consent-gated; they accept pseudonymous IDs only after the client opts in. Analytics reports contain aggregate data. Admin range values are `today`, `yesterday`, `last7days`, `last30days`, `thisMonth`, `last3months` or `custom`. Custom ranges use `from=YYYY-MM-DD&to=YYYY-MM-DD` and are bounded by the API.

## Errors and limits

Errors use a non-sensitive `error` message, with optional `code` and request ID. Common statuses:

- `400`: validation or confirmation mismatch
- `401`: missing, expired or inactive-account session; invalid credentials
- `403`: authenticated but insufficient privileges or disallowed origin
- `404`: missing/inaccessible resource; used to avoid disclosing another student's request
- `409`: conflicting username/mobile or invalid state transition
- `413`: upload/body too large
- `429`: rate limit exceeded
- `500`: unexpected server error; inspect the request ID in server logs

Every API response includes `X-Request-Id`. Rate limits are returned using standard headers. Live defaults are 600 API requests and 40 writes per 15 minutes per IP; the auth routes allow 30 attempts per 15 minutes. Demo limits are higher for exploration. Use a shared rate-limit store before horizontal scaling.
