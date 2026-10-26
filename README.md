# Bycme Bicycle Sharing

Bicycle sharing SaaS platform running on Cloudflare serverless tier.

---

## 1. Commands

Driver script: `./btool` (Python 3 standard library only).

| Command | Action |
| :--- | :--- |
| `./btool install` | Download and configure Node.js, wrangler, and TypeSpec in toolchain cache (`~/.cache/bycme-repo/`) |
| `./btool check` | Verify binaries, Cloudflare authentication, and project access |
| `./btool login` | Authenticate with Cloudflare via interactive `wrangler login` |
| `./btool codegen` | Compile `typespec/` into OpenAPI schema and shared client in `generated/` |
| `./btool verify` | Assert generated files match TypeSpec contract and flag any drift (for CI) |
| `./btool build` | Compile frontend React application with Vite into `frontend/dist` |
| `./btool migrate [--env <name>] [--dev]` | Apply pending SQL migrations to Cloudflare D1 database (default: `staging`) |
| `./btool publish [--env <name>]` | Deploy backend Worker and frontend Pages to Cloudflare (default: `staging`) |
| `./btool staging [--env <name>]` | Execute full deployment pipeline: preflight -> codegen -> build -> migrate -> publish |
| `./btool dbdrop [-y]` | Drop all tables and migrations in D1 database (strictly `staging` only) |
| `./btool dbseed [--env <name>] [--dev]` | Populate D1 database with Indian test accounts and infrastructure |
| `./btool passwd <email> [-p <pwd>] [--env <name>] [--dev]` | Update user password hash directly in D1 database |
| `./btool test [--env <name>] [--suite <name>] [--dev]` | Execute automated positive and negative test suite against backend |

---

## 2. Repository Layout

| Directory / File | Responsibility |
| :--- | :--- |
| `typespec/` | REST API specifications ([`main.tsp`](file:///data/Work/vrdhn/bycme-repo/typespec/main.tsp)) |
| `generated/` | Machine-generated artifacts (strictly automated, do not edit manually) |
| ├── `generated/schema/` | Generated OpenAPI 3.0 specification (`openapi.json`) |
| └── `generated/shared/` | Shared TypeScript domain models and API client (`index.ts`) |
| `sqlsource/` | Relational SQL migrations and modular seed slices |
| ├── `sqlsource/migrations/` | Cloudflare D1 migration scripts (`0001_auth.sql` .. `0012_password_resets.sql`) |
| └── `sqlsource/seeds/` | Modular seed data slices (`seed-001-admin.sql` .. `seed-008-password-resets.sql`) |
| `backend/` | Cloudflare Worker application and configuration |
| ├── `backend/src/routes/` | Modular domain route handlers (`health`, `auth`, `passwordReset`, `locations`, `invitations`, `managerRequests`, `managerParkings`, `cycles`, `checkouts`) |
| ├── `backend/src/middleware/` | Authentication and Bearer token verification middleware |
| └── `backend/src/utils/` | Cryptography, formatting, and HTTP response utilities |
| `frontend/` | React single-page application built with Vite and Tailwind CSS |
| ├── `frontend/src/components/` | Workspace views, modals, and management consoles |
| └── `frontend/src/App.tsx` | Main application shell and HashRouter navigation |
| `scripts/` | Automated test suite and API test client (`test_admin.py`, `test_manager.py`, `test_rider.py`, `test_password_reset.py`, `test_multi_user.py`) |
| `config.json` | Environment resource identifiers (Cloudflare project, D1 database ID) |
| `btool` | Monorepo developer interaction and deployment driver |

---

## 3. SQL Schema and Migrations

- Database engine: Cloudflare D1 (serverless relational SQLite).
- Migration directory: `sqlsource/migrations/`.
- Execution: `wrangler d1 migrations apply <database> --remote`.
- Tracking: automatic via remote `d1_migrations` table.
- Core schema tables:
  - `cities`: Multi-city foundation (`id`, `name`, `state`, `created_at`).
  - `buildings`: Campus/residential facilities (`id`, `city_id`, `name`, `building_type`, `created_at`).
  - `parkings`: Parking stands (`id`, `building_id`, `name`, `capacity`, `created_at`).
  - `persons`: User accounts with credentials and personal profile (`id`, `email`, `name`, `password_hash`, `password_salt`, `dob`, `gender`, `mobile`, `comments`, `address`, `emergency_name`, `emergency_phone1`, `emergency_phone2`, `created_at`).
  - `person_roles`: Multi-role mapping (`Admin`, `Manager`, `Rider`).
  - `invitations`: Uniform 22-char base64url UUID tokens with expiry and `is_preapproved` flag.
  - `manager_requests`: Applications for parking hub management (`pending`, `approved`, `rejected`).
  - `parking_managers`: Active parking manager assignments.
  - `parking_riders`: Active single-shed resident rider enrollments.
  - `rider_requests`: Access requests and single-shed transfer workflows (`pending`, `approved`, `rejected`).
  - `cycles`: Cycle fleet inventory with public ID, combination lock code, QR token, and condition (`Working`, `Puncture`, `Broken`). Enforces unique lock code per hub.
  - `cycle_checkouts`: Trip sessions enforcing strict limit of 1 active checkout per rider with condition auditing on return.
  - `password_resets`: Out-of-band WhatsApp password recovery tokens (24h expiry, single-use).

---

## 4. TypeSpec and Generation

- Contract source: `typespec/main.tsp`.
- Compiler: `@typespec/compiler` with `@typespec/openapi3`.
- Configuration: `typespec/tspconfig.yaml`.
- Artifact output: `generated/schema/openapi.json`.
- Client bindings: `generated/shared/index.ts` provides typed interfaces and `BycmeClient` for frontend and backend consumption.
- Regeneration command: `./btool codegen`.
- Verification command: `./btool verify`.

---

## 5. Frontend

- Framework: React 18, TypeScript, Vite.
- Directory: `frontend/`.
- Build output: `frontend/dist/`.
- Deployment target: Cloudflare Pages (`bycme-staging.pages.dev`).
- State and API: consumes `BycmeClient` from `generated/shared/` with role-switched workspaces:
  - `🛡️ ClubHero Console`: Cities, Clubs, Hubs, HubHero Requests, Global Invitations, User Directory.
  - `👔 HubHero Workspace`: Managed Hubs, Stationed Cycles Fleet, Hub Rider Invitations, Rider Access Requests, Active Riders Roster.
  - `🚲 Rider Workspace`: Home Hub details, Ready Cycles Roster, Active Checkout status with combination lock code and return dialog.
  - Scan-to-Ride QR Portal (`/#/cycle/<qr_code>`): Public bicycle camera scan deep-link with 5-gate validation.
  - Password Reset Portal (`/#/reset-password/<token>`): Out-of-band credential update landing page.

---

## 6. Cloudflare Worker Backend

- Runtime: Cloudflare Workers (TypeScript).
- Directory: `backend/`.
- Configuration: `backend/wrangler.jsonc`.
- Database binding: `env.DB` bound to D1 database (`bycme-staging-db`).
- REST Endpoints:
  - **Health**:
    - `GET /api/health`: Service heartbeat and status (Public).
  - **Authentication & User Management**:
    - `POST /api/auth/login`: Credential login returning session token and user profile (Public).
    - `POST /api/auth/register`: Public registration of new user accounts (Public).
    - `GET /api/auth/me`: Retrieve active authenticated profile and assigned roles (Bearer auth).
    - `PUT /api/auth/me`: Self-service update of user personal profile details (Bearer auth).
    - `GET /api/persons`: List all user accounts and roles (Bearer auth, Admin).
    - `PUT /api/persons/:id`: Update user profile, contact info, and admin comments (Bearer auth, Admin).
  - **Password Reset**:
    - `POST /api/persons/:id/password-reset`: Generate 24h reset token & WhatsApp link (Bearer auth, Admin / Manager).
    - `GET /api/auth/reset-password/:token`: Validate reset token and fetch recipient info (Public).
    - `POST /api/auth/reset-password`: Execute password reset with new credentials (Public).
  - **Location Hierarchy**:
    - `GET /api/cities`, `POST /api/cities`, `PUT /api/cities/:id`: Cities management (Bearer auth, Admin write).
    - `GET /api/buildings`, `POST /api/buildings`, `PUT /api/buildings/:id`: Facility management (Bearer auth, Admin write).
    - `GET /api/parkings`, `POST /api/parkings`, `PUT /api/parkings/:id`: Parking stands management (Bearer auth, Admin write).
  - **Invitations & Approvals**:
    - `POST /api/parkings/:id/manager-invitations`: Generate manager invitation (Bearer auth, Admin).
    - `GET /api/parkings/:id/manager-invitations`: List active manager invitations (Bearer auth, Admin).
    - `POST /api/parkings/:id/rider-invitations`: Generate rider invitation (Bearer auth, Manager).
    - `GET /api/parkings/:id/rider-invitations`: List active rider invitations (Bearer auth, Manager).
    - `POST /api/parkings/:id/rider-invitations/:invitationId/revoke`: Revoke rider invitation (Bearer auth, Manager).
    - `GET /api/invitations/:token`: Inspect invitation link details (Public / Optional Bearer).
    - `POST /api/invitations/:token/respond`: Claim assignment or submit access request (Bearer auth).
    - `GET /api/admin/invitations`: Global admin invitation overview (Bearer auth, Admin).
    - `POST /api/admin/invitations/:id/revoke`: Revoke invitation globally (Bearer auth, Admin).
    - `GET /api/me/manager-requests`: List current user's submitted manager requests (Bearer auth).
    - `GET /api/admin/manager-requests`: List all submitted manager requests (Bearer auth, Admin).
    - `POST /api/admin/manager-requests/:id/approve`: Approve manager request (Bearer auth, Admin).
    - `POST /api/admin/manager-requests/:id/reject`: Reject manager request (Bearer auth, Admin).
  - **Manager Hub Operations**:
    - `GET /api/me/parkings`: List parkings managed by authenticated user (Bearer auth, Manager).
    - `GET /api/me/parkings/:id/rider-requests`: List pending rider requests with transfer flags (Bearer auth, Manager).
    - `POST /api/me/parkings/:id/rider-requests/:requestId/approve`: Approve rider access (Bearer auth, Manager).
    - `POST /api/me/parkings/:id/rider-requests/:requestId/reject`: Reject rider access (Bearer auth, Manager).
    - `GET /api/me/parkings/:id/riders`: List active authorized riders for hub (Bearer auth, Manager).
  - **Fleet & Cycle Checkouts**:
    - `GET /api/parkings/:id/cycles`: List stationed cycles fleet (Bearer auth, Manager).
    - `POST /api/parkings/:id/cycles`: Register new bicycle; validates unique lock code per hub (Bearer auth, Manager).
    - `PUT /api/cycles/:id`: Update bicycle condition/lock code; validates unique lock code (Bearer auth, Manager).
    - `GET /api/cycles/lookup/:identifier`: Public scan-to-ride bicycle lookup (Public / Optional Bearer).
    - `GET /api/me/home-parking`: Retrieve assigned home hub and available fleet (Bearer auth, Rider).
    - `GET /api/me/active-checkout`: Retrieve caller's active cycle checkout session (Bearer auth).
    - `POST /api/cycles/:id/checkout`: Checkout cycle at home hub (Bearer auth, Rider).
    - `POST /api/checkouts/:id/return`: Return bicycle with condition and damage audit (Bearer auth).
- Staging host: `https://bycme-staging.bycme-backend.workers.dev`.
