# Bycme System Design

## 1. Features & Subfeatures

### `feat001`: Landing Page
* **Top Status Bar**:
  * Fixed 44px frosted header with brand title (`🚲 Bycme`).
  * Theme mode toggle cycling through `system` ➔ `light` ➔ `dark` with local persistence.
  * Live API health dot indicator (`green` = online, `red` = offline, `gray` = connecting).
* **Welcome Screen**:
  * "Welcome by Bycme" hero title, icon, and platform description.
  * Primary action button: "Proceed to App ➔" switching to `/app` workspace view.
  * Navigation breadcrumb and "← Back to Landing Page" button in the `/app` view.
* **Design System**:
  * Teal accent palette (`#0d9488`, `#0f766e`), slate neutral scales, responsive dark mode via CSS variables and `data-theme`.

### `feat002`: Admin User, Auth Schema, and CLI Password Tooling
* **Identity & Credential Management**:
  * Dual-table schema: `persons` and `person_roles`.
  * Multi-role support (`Admin`, `Manager`, `Rider`).
  * Cryptographic password storage using PBKDF2-HMAC-SHA256 (100,000 iterations, 32-byte salt).
* **Modular Seeding**:
  * Directory: `sqlsource/seeds/`.
  * Initial seed slice: `seed-001-admin.sql` configuring `admin@bycme.in` with default password `Admin@Bycme2026`.
* **CLI Administration (`btool`)**:
  * `./btool dbseed [--env <name>] [--dev]`: Sequential execution of `seed-*.sql` slices against D1.
  * `./btool passwd <email> [-p <pwd>] [--env <name>] [--dev]`: Updates password hash and salt for any user directly in D1.
* **API Endpoints**:
  * Credential authentication (`/api/auth/login`), profile retrieval (`/api/auth/me`), and user listing (`/api/persons`).

### `fix001`: Fixing Auth Enforcement
* **Bearer Authentication Gate**:
  * Enforced Bearer authorization requirement on `/api/persons` and `/api/auth/me`.
  * Strict 401 Unauthorized for missing/invalid tokens; 403 Forbidden for non-Admin access to person directory.
* **Session & Login Flow**:
  * Frontend login card in Junta Cycle styling supporting credential authentication against `/api/auth/login`.
  * Session token persistence in `localStorage`.
  * Active user status pill and one-click Logout control in `StatusBar`.
  * Protected App workspace gating all downstream views behind valid authenticated sessions.

---

## 2. Database

### Relational Schema

#### Table: `persons`
| Column | Type | Constraints | Description | Feature |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique person identifier | `feat002` |
| `email` | `TEXT` | `UNIQUE NOT NULL COLLATE NOCASE` | Unique user email address | `feat002` |
| `name` | `TEXT` | `NOT NULL` | Display name | `feat002` |
| `password_hash` | `TEXT` | `NOT NULL` | 64-character hex PBKDF2-HMAC-SHA256 key | `feat002` |
| `password_salt` | `TEXT` | `NOT NULL` | 64-character hex 32-byte cryptographic salt | `feat002` |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp | `feat002` |

* **Indexes**:
  * `idx_persons_email` on `persons(email)` (`feat002`)

#### Table: `person_roles`
| Column | Type | Constraints | Description | Feature |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique role assignment identifier | `feat002` |
| `person_id` | `TEXT` | `NOT NULL REFERENCES persons(id) ON DELETE CASCADE` | Foreign key to `persons.id` | `feat002` |
| `role` | `TEXT` | `NOT NULL CHECK (role IN ('Admin', 'Manager', 'Rider'))` | Assigned persona role | `feat002` |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Assignment timestamp | `feat002` |

* **Constraints**:
  * `UNIQUE(person_id, role)` (`feat002`)
* **Indexes**:
  * `idx_person_roles_person_id` on `person_roles(person_id)` (`feat002`)

### Migrations
| Migration | Description | Feature |
| :--- | :--- | :--- |
| `sqlsource/migrations/0001_auth.sql` | Authentication tables, roles, and indexes | `feat002` |

### Seed Files
| Seed File | Description | Feature |
| :--- | :--- | :--- |
| `sqlsource/seeds/seed-001-admin.sql` | Initial System Administrator (`admin@bycme.in`) | `feat002` |

---

## 3. REST API

### Base URL
* Staging: `https://bycme-staging.bycme-backend.workers.dev`

### Contract Models
* `HealthStatus`: `{ status: string, timestamp: string, environment: string }` (`feat001`)
* `PersonRole`: `"Admin" | "Manager" | "Rider"` (`feat002`)
* `Person`: `{ id: string, email: string, name: string, roles: PersonRole[], createdAt: string }` (`feat002`)
* `LoginRequest`: `{ email: string, password: string }` (`feat002`)
* `LoginResponse`: `{ token: string, user: Person }` (`feat002`)

### Endpoints Table

| Feature | Method | URL | Description | Auth / Headers | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `feat001` | `GET` | `/api/health` | Health check and heartbeat | None | None | `HealthStatus` |
| `feat002` | `POST` | `/api/auth/login` | Authenticate credentials; return session token + user profile | None | `LoginRequest` | `LoginResponse` |
| `feat002, fix001` | `GET` | `/api/auth/me` | Return active authenticated user profile & roles | `Authorization: Bearer <token>` | None | `Person` |
| `feat002, fix001` | `GET` | `/api/persons` | List persons and assigned roles | `Authorization: Bearer <token>` (Admin) | None | `Person[]` |
