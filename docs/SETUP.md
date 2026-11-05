# Setup and deployment

ErasePaper now manages authentication itself. No Clerk application, SMS provider, OTP configuration, webhook secret or identity-provider browser key is required.

## 1. Local development

Requires Node.js 20.19+ and npm.

```bash
npm ci
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

Open `http://localhost:5173`. The development example explicitly uses `DEMO_MODE=true`, an in-memory repository, and no real database. It does not send SMS. Use the Student demo button or create an illustrative test account. The public demo has no Admin login shortcut; Admin fixtures are test-only. Demo data resets when the API process restarts.

## 2. MongoDB for live accounts

Create a MongoDB database on a replica-set-capable deployment such as Atlas. Transactions are used for account deletion and request consistency, so a standalone MongoDB server is not sufficient for all live behavior.

Copy and edit `server/.env.example`. Set at least:

```dotenv
NODE_ENV=production
DEMO_MODE=false
PORT=4000
MONGODB_URI=mongodb+srv://<db-user>:<password>@<cluster>/<database>?retryWrites=true&w=majority
SESSION_SECRET=<at-least-32-random-bytes>
CLIENT_ORIGIN=https://your-app.example
TRUST_PROXY=1
UPLOAD_DIR=/data/uploads
WHATSAPP_NUMBER=919825751614
```

Generate a secret in a trusted terminal, for example:

```bash
openssl rand -hex 32
```

Keep the secret in your host's secret manager; do not commit it, paste it into client configuration, or reuse the previously exposed credentials. Changing `SESSION_SECRET` invalidates existing sessions because session-token hashes use this key.

`CLIENT_ORIGIN` is an exact origin, including scheme and port if applicable. Use the same-origin deployment where Express serves both the API and built client. The authentication cookie is `HttpOnly`, `SameSite=Lax`, expires after seven days and is marked `Secure` in production. For a cross-origin frontend/API deployment, browser cookie policy and CORS need a separate review; the supplied defaults are designed for same-origin hosting.

The API refuses to start outside the explicit demo if `MONGODB_URI` or `SESSION_SECRET` is missing, and requires the secret to be at least 32 bytes. Production refuses demo mode.

## 3. Build and run

```bash
npm ci
npm run build
npm start
```

The server binds to `0.0.0.0`. The health endpoint is `/api/health`; the server serves `client/dist` when present. Configure the host's port, HTTPS, exact origin, database credentials, proxy hop count and persistent upload volume. Do not store private uploads under the public static directory.

The included Dockerfile builds the client and runs Express as a non-root user with `UPLOAD_DIR=/data/uploads`:

```bash
docker build -t erasepaper .
docker run --rm -p 4000:4000 --env-file server/.env \
  -v erasepaper-uploads:/data/uploads erasepaper
```

A durable volume is required for user attachments. Back up the upload volume alongside MongoDB; restoring only the database can leave attachments missing. The filesystem implementation and in-process rate limits are single-instance defaults; assess private object storage and a shared rate-limit store before scaling horizontally.

## 4. First administrator — controlled one-time grant

Public signup always creates a student. The client cannot submit a role, and there is no public admin-registration endpoint.

1. Create the intended account through `/sign-up` using username, mobile number and password.
2. Independently confirm the account owner with the person through a trusted channel before granting access. **Mobile numbers are not verified; matching `9825751614` or any other phone number alone is not enough to grant administrator access.**
3. From a trusted operator terminal with the live server environment loaded, run:

   ```bash
   npm run admin:create -- <registered-username>
   ```

The script updates the server-side role and records a minimal audit event. It does not contact an identity provider or create an account. Do not expose it over HTTP. After the intended one-time grant, confirm the account can access `/admin` and that an ordinary student cannot.

## 5. Fresh accounts and existing records

This refactor intentionally starts fresh for local-auth accounts. It does not migrate Clerk profiles, passwords, roles, or IDs, and it does not automatically delete or rewrite existing data. New account-bound data is written to separate collections:

- `local_users_v2`
- `local_service_requests_v2`
- `local_notifications_v2`
- `local_admin_logs_v2`
- `local_deletion_jobs_v2`
- `auth_sessions_v2`

Existing legacy account, request, notification, audit and upload records remain in their original collections/locations, but the new local-auth application does not recognize legacy profiles as sign-in accounts or automatically attach their records to new accounts. Preserve backups and plan any future data migration as a separate, reviewed project. The common `services` catalogue and consent-based analytics collections are not account migrations.

## 6. Controlled setup and checks

The optional service seed only ensures the five service definitions exist:

```bash
npm run seed
```

It does not create live students or requests. In demo mode, illustrative accounts and requests are seeded in memory on server startup.

Run checks before launch:

```bash
npm test
npm run build
npm run format:check
npm audit
```

The integration tests use a disposable replica set and do not connect to your configured Atlas database. Passing local tests is not production sign-off; use the live acceptance checklist in `TESTING.md`.

## Environment variables

### Server: `server/.env`

| Variable          | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| `NODE_ENV`        | `development` locally; `production` on the live host      |
| `DEMO_MODE`       | `true` only for the explicit local in-memory preview      |
| `PORT`            | API/Express port; default `4000`                          |
| `CLIENT_ORIGIN`   | Exact browser origin(s), comma-separated only if needed   |
| `MONGODB_URI`     | Required outside demo mode; use a replica-set-capable URI |
| `SESSION_SECRET`  | Required outside demo mode; at least 32 random bytes      |
| `TRUST_PROXY`     | Actual trusted reverse-proxy hop count; default `0`       |
| `WHATSAPP_NUMBER` | Contact number as digits with country code                |
| `UPLOAD_DIR`      | Private persistent attachment directory                   |

### Client: `client/.env`

| Variable               | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `VITE_API_URL`         | Keep `/api` for the provided same-origin Vite proxy/deployment |
| `VITE_WHATSAPP_NUMBER` | Optional client contact number                                 |

Vite values are embedded at build time. Never put database credentials, the session secret, or other server secrets in `client/.env`.
