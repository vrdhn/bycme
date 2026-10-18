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
  - `stations`: Physical docking stations, coordinates, dock capacity, bike counts.
  - `bikes`: Bike models, current station, battery level, status (`available`, `in_use`, `maintenance`).
  - `rides`: Active and historic ride transactions, duration, and calculated cost.

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
- State and API: consumes `BycmeClient` from `generated/shared/` targeting backend API endpoints.

---

## 6. Cloudflare Worker Backend

- Runtime: Cloudflare Workers (TypeScript).
- Directory: `backend/`.
- Configuration: `backend/wrangler.jsonc`.
- Database binding: `env.DB` bound to D1 database (`bycme-staging-db`).
- REST Endpoints:
  - `GET /api/health`: Service heartbeat and status.
  - `GET /api/stations`: Station listing with dock and bike counts.
  - `GET /api/stations/:id`: Station lookup by ID.
  - `GET /api/bikes`: Bike fleet status, filterable by `stationId`.
  - `GET /api/bikes/:id`: Single bike details.
  - `GET /api/rides`: Active rides listing.
  - `POST /api/rides`: Unlock bike and initiate ride.
  - `POST /api/rides/:id/end`: Return bike to station, calculate cost, and finalize ride.
- Staging host: `https://bycme-staging.bycme-backend.workers.dev`.
