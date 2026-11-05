# Testing and production acceptance

## Automated checks

Run from the project root:

```bash
npm test
npm run build
npm run format:check
npm audit
```

`npm test` runs the Node server test suite and client helper tests. The server integration suite includes a disposable MongoDB replica set for transaction and repository checks; it does not connect to your configured Atlas database. The first replica-set test run may download a MongoDB binary.

The authentication-specific coverage verifies:

- Registration accepts username, international mobile number and password; creates only a student; stores a one-way scrypt hash; and sets an HTTP-only, SameSite cookie.
- Login is case-insensitive for usernames, rejects invalid credentials, and creates a server-side session.
- Duplicate usernames/mobile numbers are rejected; request bodies cannot escalate account role.
- Legacy user/request records remain in the original collections and are not read as fresh local-auth accounts.
- The previous OTP and Clerk webhook URLs are no longer available as authentication flows.
- Admin routes remain protected by current server-side role and account-state checks.
- Student deletion blocks sessions immediately, revokes stored sessions, removes account-bound data, and retries failed private-file cleanup without restoring access.
- Password hashes and physical attachment keys are excluded from public serializers; CSP is same-origin and has no third-party identity-provider allowance.

Other server/client tests cover service validation, request ownership, private attachments, admin notes and notifications, analytics consent and aggregation, Asia/Kolkata date handling, preference helpers and safe return paths.

## Local demo acceptance

- [ ] Run `npm ci`, copy both `.env.example` files, then start `npm run dev`.
- [ ] Use the Student demo button; verify seeded sample data loads. Confirm no Admin shortcut appears in the demo UI and students cannot access `/admin`.
- [ ] Create a local demo account with username, mobile number and password. Confirm no SMS/OTP prompt or message is involved. Demo data resets when the API restarts.
- [ ] Submit one request, add an allowed attachment, update status as demo admin, and confirm private notes are not returned to the student.
- [ ] Check `/profile` and account security wording: mobile is explicitly unverified; no verification is implied.
- [ ] Confirm admin deletion shows a confirmation, immediately blocks the student's session, removes request data and retries file cleanup if needed.
- [ ] Test desktop and narrow mobile layouts, cookie-consent controls, Light/Dark/System themes, and network/session-error recovery.

## Before production acceptance

Use a separate test database and private upload volume before real users:

1. Verify the exact production MongoDB replica-set URI, database user privileges, network allow-list and transaction behavior.
2. Confirm `DEMO_MODE=false`, `NODE_ENV=production`, a random `SESSION_SECRET` of at least 32 bytes, exact `CLIENT_ORIGIN`, correct `TRUST_PROXY`, HTTPS, and persistent private upload storage.
3. Register with username, mobile and password. Confirm no SMS or phone verification is expected; verify duplicate username/mobile handling, invalid passwords, generic login failures and rate limits.
4. Confirm the session cookie has `HttpOnly`, `SameSite=Lax`, `Secure`, the `/api` path and a seven-day expiry. Confirm the raw session value is not in local storage, logs or database; database session records should contain only HMAC hashes.
5. Test logout, expired sessions, inactive-account rejection and session revocation after a controlled student deletion.
6. Confirm a student cannot access admin APIs, edit their role or access another student's requests/attachments. Test admin role assignment only through a trusted operator action after independently confirming the account owner; an unverified phone match is insufficient.
7. Confirm writes land in the new `local_*_v2` and `auth_sessions_v2` collections. Verify existing legacy account/request collections and private files remain untouched; do not run an unreviewed migration or cleanup script.
8. Upload permitted and rejected files, restart the server, and verify persistent storage and authorized download behavior.
9. In a controlled test, simulate local file cleanup failure and verify the account remains unavailable while the durable job retries. Inspect logs for PII, credentials, cookies and file contents.
10. Back up and restore MongoDB and the upload volume in an isolated environment; document retention, recovery objectives, monitoring, incident response and rollback.
11. Review privacy notice, terms, data-retention and backup-expiry practices, support contacts, legal business details, staff access and operational responsibilities before launch.

## Not verified by these local tests

- No production MongoDB/Atlas instance, real student account, live file volume or hosted deployment was configured or tested here.
- The application does not include SMS, OTP or identity-provider flows; none are required or tested.
- No automated password reset, email verification, payment processing, outbound email/SMS notification or antivirus scanning is included.
- Passing the automated suite is not production sign-off. Complete the acceptance checks with the exact production configuration and infrastructure.
