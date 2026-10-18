# Bycme Bicycle Sharing

Bicycle sharing SaaS platform running on Cloudflare free tier.

---

## 1. Commands

Driver script: `./btool` (Python 3 standard library only).

| Command | Action |
| :--- | :--- |
| `./btool install` | Download and configure Node.js, wrangler, and TypeSpec in `~/.cache/bycme-repo/` |
| `./btool check` | Verify binaries, Cloudflare authentication, and project access |
| `./btool login` | Authenticate with Cloudflare via interactive `wrangler login` |
| `./btool codegen` | Compile `typespec/` into OpenAPI schema and shared client in `generated/` |
| `./btool verify` | Assert generated files match TypeSpec contract and flag any drift (for CI) |
| `./btool build` | Compile frontend React application with Vite into `frontend/dist` |
| `./btool migrate [--env <name>]` | Apply pending SQL migrations to Cloudflare D1 database (default: `staging`) |
| `./btool publish [--env <name>]` | Deploy backend Worker and frontend Pages to Cloudflare (default: `staging`) |
| `./btool staging [--env <name>]` | Execute full deployment pipeline: preflight -> codegen -> build -> migrate -> publish |
| `./btool dbdrop [-y]` | Drop all tables and migrations in D1 database (strictly `staging` only) |

---

## 2. Repository Layout

| Directory / File | Responsibility |
| :--- | :--- |
| `typespec/` | REST API specifications (`main.tsp`) |
| `generated/` | Machine-generated code and specs (strictly automated, do not edit manually) |
| ├── `generated/schema/` | Generated OpenAPI 3.0 specification (`openapi.json`) |
| └── `generated/shared/` | Shared TypeScript domain models and API client (`index.ts`) |
| `sqlsource/` | Relational SQL migrations and seed data (`migrations/`) |
| `backend/` | Cloudflare Worker application and `wrangler.jsonc` |
| `frontend/` | React single-page application built with Vite |
| `config.json` | Environment resource identifiers (project name, D1 database ID) |
| `btool` | Monorepo developer interaction CLI |

---

## 3. SQL Schema and Migrations

- Database engine: Cloudflare D1 (serverless relational SQLite).
- Migration directory: `sqlsource/migrations/`.
- Execution: `wrangler d1 migrations apply <database> --remote`.
- Tracking: automatic via remote `d1_migrations` table.
- Core schema:
  - `buildings`: Campus/public facilities, names, building type (`Private`, `Public`).
  - `parkings`: Parking stands, capacity limits, building associations, assigned managers.
  - `persons`: User accounts with multi-role permissions (`Admin`, `Manager`, `Rider`).
  - `parking_memberships`: Parking access requests and approved memberships (`pending`, `approved`, `disapproved`).
  - `invitations`: Unique manager-generated invitation tokens for onboarding.
  - `cycles`: Cycle fleet with public ID, QR payload, and condition (`Working`, `Broken`, `Puncture`).
  - `cycle_condition_trails`: Audit logging for condition changes and maintenance notes.
  - `rides`: Trip records with single active ride constraint, start/finish timestamps, and return notes.

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
- State and API: consumes `BycmeClient` from `generated/shared/` with role-switched views (Admin, Manager, Rider, Anon).

---

## 6. Cloudflare Worker Backend

- Runtime: Cloudflare Workers (TypeScript).
- Directory: `backend/`.
- Configuration: `backend/wrangler.jsonc`.
- Database binding: `env.DB` bound to D1 database (`bycme-staging-db`).
- REST Endpoints:
  - `GET /api/health`: Service heartbeat and status.
  - `GET /api/persons`: List all accounts, roles, and approved parking memberships.
  - `PUT /api/persons/:id/roles`: Update user roles (`Admin`, `Manager`, `Rider`).
  - `GET /api/buildings` & `POST /api/buildings`: List and create buildings.
  - `GET /api/parkings` & `POST /api/parkings`: List and create parking hubs.
  - `PUT /api/parkings/:id/managers`: Update parking manager assignments.
  - `GET /api/cycles` & `POST /api/cycles`: List and register cycles.
  - `PUT /api/cycles/:id/condition`: Update cycle condition and record audit trail.
  - `GET /api/cycles/:id/trails`: View cycle condition audit trail.
  - `GET /api/rides`: List rides with filters for parking, rider, and status.
  - `POST /api/rides/checkout`: Checkout cycle (strictly 1 active ride per rider).
  - `POST /api/rides/:id/checkin`: Return cycle, record notes, and optionally report condition change.
  - `POST /api/invitations`: Generate unique invitation link/code.
  - `POST /api/invitations/accept`: Register candidate and submit membership request.
  - `GET /api/memberships` & `PUT /api/memberships/:id`: Review and approve/disapprove membership requests.
- Staging host: `https://bycme-staging.bycme-backend.workers.dev`.
