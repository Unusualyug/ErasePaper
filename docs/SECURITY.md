# Security and data handling

This document describes the current ErasePaper implementation. It is an engineering summary, not a guarantee of security or legal advice. Review the production checklist in `TESTING.md` before accepting real student data.

## Authentication and sessions

- ErasePaper manages authentication locally. No Clerk integration, webhook, SMS provider, OTP store or external identity provider is used.
- Registration accepts a username, international-format mobile contact number and password. Public registration always creates a `student`; unexpected fields such as `role`, `state`, `passwordHash` and internal IDs are rejected.
- Mobile numbers are **not verified**. No SMS or OTP is sent. Do not use phone-number matching alone to identify an account owner or grant administrator privileges.
- Passwords must be 12–128 characters. They are hashed server-side with Node `scrypt` using a random 16-byte salt and fixed work parameters (`N=16384`, `r=8`, `p=1`). The readable password is not stored or returned by serializers. There is currently no password-reset flow; establish a reviewed operator recovery process before launch.
- Sign-in creates a random 256-bit opaque token. The browser receives it only in an `HttpOnly`, `SameSite=Lax`, `/api` cookie; live production cookies are `Secure` and expire after seven days. MongoDB stores an HMAC-SHA256 of the token using `SESSION_SECRET`, never the raw cookie token. The session record expires and is also checked against the user's active account state on every API request.
- `SESSION_SECRET` must contain at least 32 bytes outside demo mode. Rotating it invalidates all existing sessions. Keep it in a server secret manager and out of source control, logs, client bundles and chat.
- Registration and login share an IP-based rate limiter (30 attempts per 15 minutes in live mode, higher only in demo); a broader API limit also applies. Use a shared limiter store if the service scales horizontally.
- The frontend stores no password, raw session token or bearer token in `localStorage` or `sessionStorage`. Authentication relies on the HTTP-only cookie and same-origin API requests.

## Authorization and administrator grants

- Every protected API request resolves the current session and reloads the user record, including the authoritative role and account state.
- Admin endpoints are guarded on the server. Client-supplied role fields, demo flags or IDs never grant access.
- Public registration cannot create administrators. `npm run admin:create -- <username>` is a controlled operator command for an already registered live account. The operator must independently confirm the account owner first. Because phones are unverified, a matching mobile number alone is not evidence of account ownership.
- The public in-memory demo exposes only student sample access. Admin fixtures exist only in the automated test environment; demo users cannot select or obtain an Admin role.
- Student responses exclude private admin notes, password hashes, session hashes and physical attachment names. Admin APIs return application fields needed for operations, not password or session data.

## Fresh accounts and existing records

The local-auth refactor intentionally starts with fresh accounts. It does not migrate Clerk users, credentials, IDs, roles, or associated requests, and it does not automatically delete or rewrite old records. New app-owned account data is isolated in `local_users_v2`, `local_service_requests_v2`, `local_notifications_v2`, `local_admin_logs_v2`, `local_deletion_jobs_v2` and `auth_sessions_v2`. The new app does not treat records in legacy user/request collections as sign-in accounts. Existing collections and stored files are left untouched by the refactor. Back up the database and upload volume before deployment; any future migration must be separately designed and reviewed.

The common service catalogue and existing consent-based analytics collections are not account migrations. Analytics records continue to use their own privacy, expiry and consent rules.

## Data minimization and private files

- Request requirements and contact information stay in server-side records; clients receive only the fields needed for their role.
- Attachments are stored outside the public static root with restrictive file permissions, validated by type and signature, limited to three files of 10 MB each, and served only through an authenticated ownership-checked endpoint.
- Filenames returned to the client are display names; physical `storageName` values are not serialized. Do not log request bodies, passwords, cookies, uploaded content, full contact details or raw analytics identifiers.
- Administrators can add private request notes; those notes are omitted from student responses.
- Optional analytics starts only after consent. Visitor/session identifiers are pseudonymous and hashed server-side; raw IP addresses, full user-agent strings, full paths/query strings and individual page sequences are not retained. Page totals are daily aggregates without a visitor/session key.

## Account deletion and recovery

Student deletion is a durable, idempotent local cleanup process:

1. A transaction marks the student account `deleting` and enqueues a minimal job. Authentication immediately rejects any account not in `active` state.
2. A second transaction revokes all local sessions and removes the user's requests, notifications and profile. It records only opaque IDs and cleanup state in the job/audit log.
3. Private attachments are removed from the configured upload directory. If file cleanup fails, the job stores only the required opaque identifiers/attachment keys and schedules a bounded retry.
4. On success, the cleanup job is removed. Administrator accounts are protected from this student deletion flow.

There is no identity-provider deletion step or webhook/tombstone stage. MongoDB transaction guarantees depend on a replica set. Deleting app records does not erase database backups, hosting logs, WhatsApp conversations or files already downloaded by staff. Define retention and backup-expiry procedures; do not promise instantaneous erasure from every backup.

## Browser policy and deployment

- Helmet sets a self-origin content-security policy. The server allows only configured exact origins for credentialed CORS; the recommended deployment serves the frontend and API from one origin.
- Use HTTPS in production, set `TRUST_PROXY` to the actual trusted proxy hop count, keep `CLIENT_ORIGIN` exact, and keep `MONGODB_URI`, `SESSION_SECRET` and upload storage private.
- Never enable `DEMO_MODE` in production. Do not use the in-memory demo with real student data.
- Store uploads on a durable private volume and back it up alongside MongoDB. Review rate limits, monitoring, backups, host timeouts, incident response and staff access before launch.

## Historical credential exposure

Database and identity-provider secrets were previously pasted into the conversation and treated as exposed. Rotate/revoke them; never reuse those values. No previously exposed secret is included in this repository or used by this refactor.
