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

### `feat003`: City, Building & Parking Hierarchy Management
* **Location Infrastructure**:
  * 3-tier hierarchy: Cities -> Buildings -> Parking Stands.
  * Support for Private (campus/office) and Public (transit/metro) building classifications.
  * Dock capacity configuration on each parking stand.
* **Inline Name & Spelling Editing**:
  * Direct editing and spelling correction for Cities (name, state), Buildings (name, city, type), and Parkings (name, building, capacity).
* **Location Console**:
  * Subtabbed interface in `/app` workspace for managing Cities, Buildings, and Parkings.
  * Inline creation forms and live editable table rows.
* **Modular Seed**:
  * `seed-002-locations.sql` populating test hubs in Pune (Maharashtra), Bengaluru (Karnataka), and Hyderabad (Telangana).

### `feat004`: Inviting Managers to Parking
* **Manager Invitation Flow**:
  * Admin generates invitation to manage a specific parking lot.
  * Role-scoped endpoints (`/api/parkings/{id}/manager-invitations`) preventing collision with future rider invitations.
* **Compact Uniform URL Scheme**:
  * Unpadded base64url-encoded 16-byte UUID tokens (22 alphanumeric characters, e.g. `v7K9Lm3XqP1oZ8wA2bC4dE`).
  * Route: `https://bycme-staging.pages.dev/#/join/mgr/<token>`.
* **Configurable Expiry**:
  * Dropdown duration options (1h, 6h, 12h, 24h default, 3d, 7d).
  * Automatic API-level filtering of expired invitations (`datetime(expires_at) > datetime('now')`).
* **WhatsApp Invitation Sharing**:
  * Pre-formatted WhatsApp text with admin name, parking lot name, city, expiry duration, and link.
  * Single-click clipboard copy with user feedback toast.
* **Modular Seed**:
  * `seed-003-invitations.sql` configuring active sample manager invitation.

### `fix002`: Pre-Approved Manager Invitations (Direct 1-Time Assignment)
* **Pre-Approved vs Standard Mode**:
  * Toggle in `ManagerInviteModal` to mark manager invitations as pre-approved (`is_preapproved = 1`).
  * Pre-approved invitations are single-use tokens granting immediate manager assignment without administrative review.
  * Standard invitations allow submission of management requests requiring admin approval.
* **Database & Contract Enhancements**:
  * `is_preapproved INTEGER NOT NULL DEFAULT 0` added to `invitations` table via migration `0004_invitation_preapproved.sql`.
  * TypeSpec and TypeScript client models updated with `isPreapproved` flag.
  * Tailored WhatsApp copy reflecting pre-approved status.

### `feat005`: Create Managers & Management Requests
* **Separated Data Architecture**:
  * Dedicated `manager_requests` table tracking application state (`pending`, `approved`, `rejected`) with foreign key to originating invitation.
  * Dedicated `parking_managers` table representing active authorized parking managers.
* **Unified Invitation & Auth Flow**:
  * Public lookup endpoint (`/api/invitations/{token}`) rendering invitation details without prior authentication.
  * Single unified authentication card supporting both login for existing users and inline registration (`/api/auth/register`) for new applicants.
  * Pre-approved invitation acceptance immediately assigns the `Manager` role and records active manager binding, marking token as `used`.
  * Standard invitation submission generates a `pending` request, displaying existing application status to prevent duplicates.
* **Admin Management Console ("Requests" Tab)**:
  * Admin workspace tab for reviewing all manager requests across parkings.
  * Single-click Approve (marks request `approved`, grants `Manager` role, binds to `parking_managers`) and Reject (marks request `rejected`).

### `fix003`: Admin Invitations Console & Parking Context
* **Parking Station Context on Modal List**:
  * Explicit parking name, building, and city tags on every invitation card in `ManagerInviteModal`.
  * In-situ "Expire" button to immediately revoke specific links directly from the modal.
* **Global Admin Invitations Console ("Invitations" Tab)**:
  * Dedicated tab in Admin workspace aggregating invitations across all parking stations.
  * Multi-status filtering (`Active`, `Used`, `Revoked`, `All`).
  * Instant clipboard copy of WhatsApp message template and single-click link revocation.
* **API Endpoints**:
  * `GET /api/admin/invitations`: Lists invitations across all stations with joined location data.
  * `POST /api/admin/invitations/{id}/revoke`: Immediately marks invitation as `revoked`.

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

#### Table: `cities`
| Column | Type | Constraints | Description | Feature |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique city identifier | `feat003` |
| `name` | `TEXT` | `UNIQUE NOT NULL COLLATE NOCASE` | City name | `feat003` |
| `state` | `TEXT` | `NOT NULL` | State or region | `feat003` |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp | `feat003` |

* **Indexes**:
  * `idx_cities_name` on `cities(name)` (`feat003`)

#### Table: `buildings`
| Column | Type | Constraints | Description | Feature |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique building identifier | `feat003` |
| `city_id` | `TEXT` | `NOT NULL REFERENCES cities(id) ON DELETE CASCADE` | Parent city foreign key | `feat003` |
| `name` | `TEXT` | `NOT NULL` | Building facility name | `feat003` |
| `building_type` | `TEXT` | `NOT NULL CHECK (building_type IN ('Private', 'Public'))` | Facility type classification | `feat003` |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp | `feat003` |

* **Indexes**:
  * `idx_buildings_city_id` on `buildings(city_id)` (`feat003`)

#### Table: `parkings`
| Column | Type | Constraints | Description | Feature |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique parking stand identifier | `feat003` |
| `building_id` | `TEXT` | `NOT NULL REFERENCES buildings(id) ON DELETE CASCADE` | Parent building foreign key | `feat003` |
| `name` | `TEXT` | `NOT NULL` | Parking stand name | `feat003` |
| `capacity` | `INTEGER` | `NOT NULL DEFAULT 10` | Maximum docking capacity | `feat003` |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp | `feat003` |

* **Indexes**:
  * `idx_parkings_building_id` on `parkings(building_id)` (`feat003`)

#### Table: `invitations`
| Column | Type | Constraints | Description | Feature |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique invitation record ID | `feat004` |
| `token` | `TEXT` | `UNIQUE NOT NULL` | Compact 22-char base64url random UUID | `feat004` |
| `parking_id` | `TEXT` | `NOT NULL REFERENCES parkings(id) ON DELETE CASCADE` | Target parking stand foreign key | `feat004` |
| `role` | `TEXT` | `NOT NULL CHECK (role IN ('Manager', 'Rider'))` | Target invitation role | `feat004` |
| `created_by` | `TEXT` | `NOT NULL REFERENCES persons(id) ON DELETE CASCADE` | Issuer foreign key to `persons.id` | `feat004` |
| `status` | `TEXT` | `NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked'))` | Invitation state | `feat004` |
| `is_preapproved` | `INTEGER` | `NOT NULL DEFAULT 0` | 1 if single-use direct assignment, 0 if request approval | `fix002` |
| `expires_at` | `DATETIME` | `NOT NULL` | Expiry timestamp | `feat004` |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp | `feat004` |

* **Indexes**:
  * `idx_invitations_token` on `invitations(token)` (`feat004`)
  * `idx_invitations_parking_id` on `invitations(parking_id)` (`feat004`)
  * `idx_invitations_parking_role_status` on `invitations(parking_id, role, status, expires_at)` (`feat004`)

#### Table: `manager_requests`
| Column | Type | Constraints | Description | Feature |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique request record ID | `feat005` |
| `parking_id` | `TEXT` | `NOT NULL REFERENCES parkings(id) ON DELETE CASCADE` | Target parking stand foreign key | `feat005` |
| `person_id` | `TEXT` | `NOT NULL REFERENCES persons(id) ON DELETE CASCADE` | Applicant person foreign key | `feat005` |
| `invitation_id` | `TEXT` | `REFERENCES invitations(id) ON DELETE SET NULL` | Originating invitation link | `feat005` |
| `status` | `TEXT` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))` | Application review state | `feat005` |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Submission timestamp | `feat005` |
| `updated_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Decision timestamp | `feat005` |

* **Constraints**:
  * `UNIQUE(parking_id, person_id, status)` (`feat005`)
* **Indexes**:
  * `idx_manager_requests_person` on `manager_requests(person_id)` (`feat005`)
  * `idx_manager_requests_parking` on `manager_requests(parking_id, status)` (`feat005`)

#### Table: `parking_managers`
| Column | Type | Constraints | Description | Feature |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique manager assignment record ID | `feat005` |
| `parking_id` | `TEXT` | `NOT NULL REFERENCES parkings(id) ON DELETE CASCADE` | Target parking stand foreign key | `feat005` |
| `person_id` | `TEXT` | `NOT NULL REFERENCES persons(id) ON DELETE CASCADE` | Assigned manager person foreign key | `feat005` |
| `assigned_by` | `TEXT` | `REFERENCES persons(id) ON DELETE SET NULL` | Administrator / system issuer | `feat005` |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Assignment timestamp | `feat005` |

* **Constraints**:
  * `UNIQUE(parking_id, person_id)` (`feat005`)
* **Indexes**:
  * `idx_parking_managers_person` on `parking_managers(person_id)` (`feat005`)
  * `idx_parking_managers_parking` on `parking_managers(parking_id)` (`feat005`)

### Migrations
| Migration | Description | Feature |
| :--- | :--- | :--- |
| `sqlsource/migrations/0001_auth.sql` | Authentication tables, roles, and indexes | `feat002` |
| `sqlsource/migrations/0002_locations.sql` | Location hierarchy: cities, buildings, parkings | `feat003` |
| `sqlsource/migrations/0003_invitations.sql` | Invitations table for managers and riders with expiry | `feat004` |
| `sqlsource/migrations/0004_invitation_preapproved.sql` | Pre-approved single-use flag on invitations | `fix002` |
| `sqlsource/migrations/0005_managers.sql` | Manager requests and parking managers rosters | `feat005` |

### Seed Files
| Seed File | Description | Feature |
| :--- | :--- | :--- |
| `sqlsource/seeds/seed-001-admin.sql` | Initial System Administrator (`admin@bycme.in`) | `feat002` |
| `sqlsource/seeds/seed-002-locations.sql` | Baseline Indian cities, buildings, and parking stands | `feat003` |
| `sqlsource/seeds/seed-003-invitations.sql` | Active sample parking manager invitation | `feat004, fix002` |
| `sqlsource/seeds/seed-004-managers.sql` | Sample applicant user and initial pending manager request | `feat005` |

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
* `RegisterRequest`: `{ name: string, email: string, password: string }` (`feat005`)
* `City`: `{ id: string, name: string, state: string, createdAt: string }` (`feat003`)
* `CreateCityRequest`: `{ name: string, state: string }` (`feat003`)
* `UpdateCityRequest`: `{ name?: string, state?: string }` (`feat003`)
* `BuildingType`: `"Private" | "Public"` (`feat003`)
* `Building`: `{ id: string, cityId: string, name: string, buildingType: BuildingType, createdAt: string, cityName?: string }` (`feat003`)
* `CreateBuildingRequest`: `{ cityId: string, name: string, buildingType: BuildingType }` (`feat003`)
* `UpdateBuildingRequest`: `{ cityId?: string, name?: string, buildingType?: BuildingType }` (`feat003`)
* `Parking`: `{ id: string, buildingId: string, name: string, capacity: int32, createdAt: string, buildingName?: string, cityName?: string }` (`feat003`)
* `CreateParkingRequest`: `{ buildingId: string, name: string, capacity: int32 }` (`feat003`)
* `UpdateParkingRequest`: `{ buildingId?: string, name?: string, capacity?: int32 }` (`feat003`)
* `InvitationStatus`: `"active" | "used" | "revoked"` (`feat004`)
* `CreateManagerInvitationRequest`: `{ durationHours?: int32, isPreapproved?: boolean }` (`feat004, fix002`)
* `ManagerInvitation`: `{ id: string, token: string, parkingId: string, role: PersonRole, createdBy: string, status: InvitationStatus, isPreapproved: boolean, expiresAt: string, inviteUrl: string, whatsappMessage: string, parkingName?: string, cityName?: string, createdByName?: string, createdAt: string }` (`feat004, fix002`)
* `InvitationDetails`: `{ token: string, role: PersonRole, isPreapproved: boolean, parkingId: string, parkingName: string, buildingName?: string, cityName?: string, createdByName?: string, expiresAt: string }` (`feat005`)
* `ManagerRequestStatus`: `"pending" | "approved" | "rejected"` (`feat005`)
* `ManagerRequest`: `{ id: string, parkingId: string, personId: string, invitationId?: string, status: ManagerRequestStatus, createdAt: string, updatedAt: string, parkingName?: string, cityName?: string, personName?: string, personEmail?: string }` (`feat005`)
* `ParkingManager`: `{ id: string, parkingId: string, personId: string, assignedBy?: string, createdAt: string, parkingName?: string, cityName?: string, personName?: string, personEmail?: string }` (`feat005`)
* `RespondInvitationResponse`: `{ action: string, status: string, message: string, request?: ManagerRequest, parkingManager?: ParkingManager }` (`feat005`)

### Endpoints Table

| Feature | Method | URL | Description | Auth / Headers | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `feat001` | `GET` | `/api/health` | Health check and heartbeat | None | None | `HealthStatus` |
| `feat002` | `POST` | `/api/auth/login` | Authenticate credentials; return session token + user profile | None | `LoginRequest` | `LoginResponse` |
| `feat005` | `POST` | `/api/auth/register` | Register new applicant account; return session token + profile | None | `RegisterRequest` | `LoginResponse` |
| `feat002, fix001` | `GET` | `/api/auth/me` | Return active authenticated user profile & roles | `Authorization: Bearer <token>` | None | `Person` |
| `feat002, fix001` | `GET` | `/api/persons` | List persons and assigned roles | `Authorization: Bearer <token>` (Admin) | None | `Person[]` |
| `feat003` | `GET` | `/api/cities` | List all cities | `Authorization: Bearer <token>` | None | `City[]` |
| `feat003` | `POST` | `/api/cities` | Create new city | `Authorization: Bearer <token>` (Admin) | `CreateCityRequest` | `City` |
| `feat003` | `PUT` | `/api/cities/{id}` | Update city spelling / state | `Authorization: Bearer <token>` (Admin) | `UpdateCityRequest` | `City` |
| `feat003` | `GET` | `/api/buildings` | List all buildings with city details | `Authorization: Bearer <token>` | None | `Building[]` |
| `feat003` | `POST` | `/api/buildings` | Create new building in a city | `Authorization: Bearer <token>` (Admin) | `CreateBuildingRequest` | `Building` |
| `feat003` | `PUT` | `/api/buildings/{id}` | Update building spelling / details | `Authorization: Bearer <token>` (Admin) | `UpdateBuildingRequest` | `Building` |
| `feat003` | `GET` | `/api/parkings` | List all parking stands with parent details | `Authorization: Bearer <token>` | None | `Parking[]` |
| `feat003` | `POST` | `/api/parkings` | Create new parking stand | `Authorization: Bearer <token>` (Admin) | `CreateParkingRequest` | `Parking` |
| `feat003` | `PUT` | `/api/parkings/{id}` | Update parking stand spelling / capacity | `Authorization: Bearer <token>` (Admin) | `UpdateParkingRequest` | `Parking` |
| `feat004, fix002` | `POST` | `/api/parkings/{id}/manager-invitations` | Generate manager invitation link & WhatsApp text with expiry | `Authorization: Bearer <token>` (Admin) | `CreateManagerInvitationRequest` | `ManagerInvitation` |
| `feat004, fix002` | `GET` | `/api/parkings/{id}/manager-invitations` | List unexpired active manager invitations for parking | `Authorization: Bearer <token>` (Admin) | None | `ManagerInvitation[]` |
| `feat005` | `GET` | `/api/invitations/{token}` | Public inspection of invitation link details | None | None | `InvitationDetails` |
| `feat005` | `POST` | `/api/invitations/{token}/respond` | Submit management request or claim pre-approved assignment | `Authorization: Bearer <token>` | None | `RespondInvitationResponse` |
| `feat005` | `GET` | `/api/me/manager-requests` | List current user's submitted manager requests | `Authorization: Bearer <token>` | None | `ManagerRequest[]` |
| `feat005` | `GET` | `/api/admin/manager-requests` | List all submitted manager requests across parkings | `Authorization: Bearer <token>` (Admin) | None | `ManagerRequest[]` |
| `feat005` | `POST` | `/api/admin/manager-requests/{id}/approve` | Approve manager request, create manager assignment, add role | `Authorization: Bearer <token>` (Admin) | None | `ManagerRequest` |
| `feat005` | `POST` | `/api/admin/manager-requests/{id}/reject` | Reject manager request | `Authorization: Bearer <token>` (Admin) | None | `ManagerRequest` |
| `fix003` | `GET` | `/api/admin/invitations` | List invitations across all parking stations with joined details | `Authorization: Bearer <token>` (Admin) | None | `ManagerInvitation[]` |
| `fix003` | `POST` | `/api/admin/invitations/{id}/revoke` | Revoke / expire invitation link immediately | `Authorization: Bearer <token>` (Admin) | None | `ManagerInvitation` |
