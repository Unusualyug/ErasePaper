# ErasePaper

**Simplifying Academic Life.** A JavaScript/JSX academic-services workspace with a student portal and a separate, server-protected administration dashboard.

Built with MongoDB, Express, React, Node.js, Tailwind CSS, Framer Motion, Axios, React Router, Lucide React, react-countup and AutoAnimate. Authentication is managed locally by the ErasePaper server; no third-party identity provider is required.

> **Start here:** the included preview runs in an explicitly labeled, in-memory demo. It does not send SMS or connect to a database. Live operation requires your own MongoDB URI and a strong session secret. The application has not been deployed to your production accounts.

## Explore the application

- `/` — public homepage and five services
- `/sign-up` — username, mobile number and password registration
- `/sign-in` — username/password sign-in; demo student/admin shortcuts appear only in demo mode
- `/dashboard`, `/requests`, `/requests/new`, `/profile` — student workspace
- `/admin` — overview, service statistics, recent activity and deletion recovery
- `/admin/students` — search, date filters, pagination and student details
- `/admin/requests` — requirements, private notes, status management and CSV export
- `/admin/activity` — audit history
- `/admin/analytics` — consent-based live presence and aggregated traffic reports
- `/admin/settings` — local theme, cookie consent and authentication information
- `/privacy-policy`, `/cookie-policy`, `/terms-and-conditions` — public legal and privacy pages

Signup collects a username, mobile number and password. **Mobile numbers are not verified and no SMS or OTP is sent.** The app currently has no automated password-reset flow; contact the operator if an account is locked out.

In demo mode, choose **Student demo** or create a local test account. The public demo does not expose an Admin login or Admin role selector. Demo accounts and changes are held in memory and reset when the API restarts. The initial dataset contains 24 illustrative students and 48 requests. Do not enter real student information into the demo.

## Services

| Slug                 | Service                         |
| -------------------- | ------------------------------- |
| `literature-review`  | Literature Review Paper         |
| `research-paper`     | Research Paper                  |
| `survey-paper`       | Survey Paper                    |
| `bulk-printing`      | Bulk Printing & Manual Creation |
| `final-year-project` | Final Year Project & Report     |

The platform provides academic assistance, mentoring, research guidance, editing and documentation—not completion of assessed work on a student's behalf. Manual creation is free; printing and delivery charges are discussed separately.

## Quick start: local demo

Requires **Node.js 20.19+** (Node 22 LTS recommended) and npm.

```bash
npm ci
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

Open **http://localhost:5173**. Express runs on port 4000; Vite proxies `/api` to it. `DEMO_MODE=true` is explicitly set in the example server configuration. No database, SMS provider, or identity-provider credentials are needed.

```bash
npm test          # API/auth, authorization, deletion, MongoDB, CSP and preference tests
npm run build     # Builds client/dist
npm run format    # Formats JavaScript/JSX and configuration files
npm run format:check
```

MongoDB integration tests start a disposable local replica set. The first run may download a MongoDB binary; tests do not touch your Atlas database.

## Live setup

See **[docs/SETUP.md](docs/SETUP.md)** for MongoDB, environment variables, initial admin access and production deployment.

Short version:

1. Create a MongoDB database on a replica-set-capable deployment.
2. Set `DEMO_MODE=false`, `MONGODB_URI`, and a random `SESSION_SECRET` of at least 32 bytes in `server/.env`.
3. Set `NODE_ENV=production`, the exact `CLIENT_ORIGIN`, `TRUST_PROXY` as appropriate, and persistent private `UPLOAD_DIR` storage.
4. Build and start the application. New users self-register as students; registration never accepts a role.
5. After an account exists, a trusted operator can grant administrator access with `npm run admin:create -- <username>`. Independently confirm the account owner first: mobile numbers are not verified, so **phone matching alone is not a safe admin grant**.

## Fresh-account/data boundary

The new local-auth implementation uses separate collections for accounts and account-bound data: `local_users_v2`, `local_service_requests_v2`, `local_notifications_v2`, `local_admin_logs_v2`, `local_deletion_jobs_v2`, and `auth_sessions_v2`. Existing legacy users, service requests and related records are **not automatically migrated or deleted** and remain in their original collections. The new app does not treat those old user records as local-auth accounts. Take backups and plan any future migration separately; this refactor intentionally starts with fresh accounts.

## What is implemented

### Student experience

- Responsive homepage, original inline SVG logo, locally served Inter font and optimized hero image.
- Locally managed username/password sign-up and sign-in; password hashes are generated server-side; session cookies are HTTP-only.
- Profile editing, account creation date, mobile contact and sign-out.
- Dashboard totals, recent requests and service shortcuts.
- Service-specific validated fields, deadline/copy/binding/delivery/project information as appropriate.
- Up to three private attachments per request, 10 MB each; PDF, DOC/DOCX, PNG, JPG and TXT.
- Request IDs, history, status tracking, details, pending-only cancellation and authenticated downloads.
- In-app status notifications, polling every 30 seconds and WhatsApp contact links.
- Cookie choices and public Privacy/Cookie/Terms pages. First-party analytics starts only after Analytics consent; marketing trackers are not used.
- Light, Dark and System themes; explicit session-expiry, unauthorized-access and network-error recovery.

### Administrator experience

- Separate, server-protected administrator dashboard with student/request/pending/completed statistics, service distribution and six-month activity.
- Search students by name, mobile, email, username or ID; registration-date filters and pagination.
- Student details, last login and request history; direct WhatsApp contact.
- Request search/filter, requirements and attachments, private notes and status management.
- Registration/request notifications and minimal audit records.
- Exact-name confirmation before student deletion; administrator accounts are protected.
- Durable local cleanup that revokes sessions, removes database records, retries private-file cleanup, and exposes pending jobs to admins.
- Consent-based aggregate website analytics; no page-to-user browsing history is exposed to administrators.

## Project structure

```text
client/
  src/components/       Reusable UI, layouts, dialogs, tables, notifications
  src/context/          Local auth, cookie consent, theme, services and toasts
  src/hooks/            API fetching and debouncing
  src/lib/              Axios, preferences, formatting, services and WhatsApp
  src/pages/             Public legal pages, student and admin routes
  src/pages/student/    Dashboard, requests, submission and profile
  src/pages/admin/      Overview, students, detail, requests, analytics and settings
  public/images/        Optimized local hero asset
server/
  src/config/           Environment, database, service definitions and CSP
  src/models/           Mongoose schemas
  src/repositories/     MongoDB and explicit in-memory demo implementations
  src/controllers/      REST request handlers, including local authentication
  src/routes/           API routing and rate limits
  src/middleware/       Session authentication and server-owned admin checks
  src/services/         Deletion cleanup, uploads and demo seed
  src/utils/            Validation, password hashing, serialization and errors
  scripts/              Controlled administrator grant and service seed
  tests/                Node test runner, Supertest and disposable MongoDB replica set
docs/
  SETUP.md              Live configuration and deployment
  SECURITY.md           Authentication, authorization, data handling and deletion
  API.md                REST endpoint reference
  TESTING.md            Automated coverage and live checks
```

## Security and operational boundaries

Read **[docs/SECURITY.md](docs/SECURITY.md)** before using real student data.

- Passwords are stored as salted scrypt hashes; raw passwords are not returned by API serializers.
- Sessions use random tokens in HTTP-only cookies; MongoDB stores HMACs of the tokens, not the raw token.
- Registration always creates a student. Admin permission is server-owned and granted only by a controlled operator script.
- A mobile number is collected as contact information but is **not verified**. Do not authorize privileged access based on phone-number matching alone.
- Login/register endpoints are rate-limited; authorization and account state are checked server-side on every protected API request.
- Student deletion immediately blocks sign-in, revokes sessions and removes related local data; private-file deletion is durable and retryable.
- Analytics is consent-gated, separate from service-request records and never seeded with sample traffic.

The included demo is for exploration only. Configure HTTPS, a long session secret, MongoDB backups, persistent private file storage, rate limits and operator procedures before accepting real student records.
