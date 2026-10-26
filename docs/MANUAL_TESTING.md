# Manual Testing Guide & Test Specification

## 1. System Architecture & Scope Overview

### 1.1 Architecture & Components
- **API Contracts**: [`typespec/main.tsp`](file:///data/Work/vrdhn/bycme-repo/typespec/main.tsp) defines canonical REST endpoints and DTO models.
- **Code Generation**: Automated artifacts in [`generated/schema/openapi.json`](file:///data/Work/vrdhn/bycme-repo/generated/schema/openapi.json) and [`generated/shared/index.ts`](file:///data/Work/vrdhn/bycme-repo/generated/shared/index.ts).
- **Backend Service**: Cloudflare Worker in [`backend/src/index.ts`](file:///data/Work/vrdhn/bycme-repo/backend/src/index.ts) with Cloudflare D1 database.
- **Frontend SPA**: Vite + React 18 in [`frontend/src/App.tsx`](file:///data/Work/vrdhn/bycme-repo/frontend/src/App.tsx) with HashRouter.
- **Database Migrations & Seeds**: Located at [`sqlsource/migrations/`](file:///data/Work/vrdhn/bycme-repo/sqlsource/migrations) and [`sqlsource/seeds/`](file:///data/Work/vrdhn/bycme-repo/sqlsource/seeds).

### 1.2 System Personas & Role Matrix
| Persona (GUI Alias) | Seed Account | Workspace | Scope & Invariants |
| :--- | :--- | :--- | :--- |
| **System Administrator** (`ClubHero`) | `admin@bycme.in` | `🛡️ ClubHero Console` | Global access: cities, buildings (Clubs), parkings (Hubs), manager requests, invitations, user directory |
| **Parking Manager** (`HubHero`) | `anita@bycme.in`<br>`vikram@bycme.in`<br>`suresh@bycme.in`<br>`priya@bycme.in`<br>`rahul@bycme.in` | `👔 HubHero Workspace` | Hub-scoped access: cycle fleet, rider invitations, rider access requests, resident riders roster |
| **Resident Rider** | `kavita@bycme.in`<br>`rahim@bycme.in`<br>`deepak@bycme.in` | `🚲 Rider Workspace` | Strict 1-hub invariant (`parking_riders`), 1 active checkout limit |
| **Anonymous Visitor** | N/A | Landing / QR Lookup / Reset | Public cycle lookup (lock code hidden), public invitation inspection, password reset execution |

---

## 2. Manual Test Matrix: Positive & Negative Cases

### 2.1 Authentication & RBAC Access Controls

| Test ID | Persona | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-P01** | Admin / Manager / Rider | Positive | Valid login with correct credentials | Submit `email` and password `Admin@Bycme2026` via login form | Session token returned, user routed to authorized workspace |
| **AUTH-P02** | Any Authenticated | Positive | Read own authenticated user profile | Call `GET /api/auth/me` with Bearer session token | Returns `200 OK` with user ID, name, email, roles, profile details |
| **AUTH-N01** | Any | Negative | Login attempt with invalid password | Submit valid email with invalid password `WrongPassword` | Returns `401 Unauthorized` with error alert |
| **AUTH-N02** | Any | Negative | Login attempt with non-existent email | Submit `unknown@domain.com` | Returns `401 Unauthorized` with invalid credentials error |
| **AUTH-N03** | Manager | Negative | Manager attempts to access Admin endpoints | Call `GET /api/admin/manager-requests` with manager session token | Returns `403 Forbidden` |
| **AUTH-N04** | Rider | Negative | Rider attempts to access Manager endpoints | Call `GET /api/me/parkings` with rider session token | Returns `403 Forbidden` |
| **AUTH-N05** | Unauthenticated | Negative | Anonymous call to protected endpoints | Call `GET /api/me/home-parking` without `Authorization` header | Returns `401 Unauthorized` |
| **AUTH-N06** | Any | Negative | Login with missing email or password | Call `POST /api/auth/login` with `{}` payload | Returns `400 Bad Request` ("Email and password required") |
| **AUTH-N07** | Any | Negative | Call protected endpoint with invalid bearer token | Pass `Authorization: Bearer invalid-token` | Returns `401 Unauthorized` |
| **AUTH-N08** | Manager | Negative | Manager attempts to list persons directory | Call `GET /api/persons` with manager session token | Returns `403 Forbidden` |
| **AUTH-N09** | Rider | Negative | Rider attempts to list persons directory | Call `GET /api/persons` with rider session token | Returns `403 Forbidden` |

---

### 2.2 Facility Classification & Infrastructure Guardrails

| Test ID | Persona | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FAC-P01** | Admin | Positive | Create Private residential building | City: Pune, Name: Greenwood Enclave, Type: `Private` | Returns `201 Created`, building persisted |
| **FAC-P02** | Admin | Positive | Create Public transit / campus building | City: Pune, Name: Tech Park Station, Type: `Public` | Returns `201 Created`, building persisted |
| **FAC-P03** | Admin | Positive | Generate Manager Invitation for Private parking stand | Select residential parking stand `prk-gw-gate1`, valid hours: 24 | Returns `201 Created` with invite link & WhatsApp snippet |
| **FAC-N01** | Admin | Negative | Attempt Manager Invitation on Public parking stand | Select transit parking stand `prk-tm-tower-a` (Public building) | Returns `400 Bad Request` ("restricted to private residential parkings") |

---

### 2.3 Manager Onboarding & Invitation Lifecycle

| Test ID | Persona | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MGR-P01** | Anonymous | Positive | View manager invitation landing page | Open `/#/join/mgr/<token>` for active invitation | Stand name, city, and login/register prompts displayed |
| **MGR-P02** | Authenticated | Positive | Claim pre-approved manager invitation | Log in, visit pre-approved invite link, click Accept | Manager role added, stand assigned in `parking_managers` |
| **MGR-P03** | Authenticated | Positive | Apply via standard manager invitation | Log in, submit standard invite link | Request added to `manager_requests` with status `pending` |
| **MGR-P04** | Admin | Positive | Approve pending manager request | Open ClubHero Console -> HubHero Requests -> Click Approve | Request status `approved`, stand assigned to manager |
| **MGR-N01** | Any | Negative | Claim expired or revoked invitation | Visit `/#/join/mgr/<token>` for revoked/expired token | Returns `404 Not Found` with expiry alert banner |
| **MGR-N02** | Manager | Negative | Manager generates invite for unmanaged stand | Anita (`prk-gw-gate1`) calls POST on `prk-palm-east` | Returns `403 Forbidden` |
| **MGR-N03** | Admin | Negative | Approve or reject non-pending request | Attempt approve/reject on already processed manager request | Returns `400 Bad Request` or `409 Conflict` |

---

### 2.4 Rider Invitation & Single-Shed Transfer Flow

| Test ID | Persona | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RDR-P01** | Manager | Positive | Generate pre-approved rider invitation | Open HubHero Workspace -> Invite Rider -> Pre-approved = Yes | Returns `201 Created` with shareable link |
| **RDR-P02** | Unassigned User | Positive | Accept pre-approved rider invitation | Visit link, log in as new resident, click Join | Assigned to parking stand, role `Rider` added |
| **RDR-P03** | Existing Rider | Positive | Idempotent visit to own home stand invite | Kavita (at Gate 1) opens Gate 1 rider invite link | Displays "Already registered at this stand", no duplicate record |
| **RDR-P04** | Existing Rider | Positive | Switch parking stand with confirmation | Rahim (at Clubhouse) opens Gate 1 invite, confirms switch dialog | Old stand deleted, new stand assigned in single atomic transaction |
| **RDR-N01** | Existing Rider | Negative | Switch parking stand without confirmation | Rahim opens Gate 1 invite without setting `confirmSwitch: true` | Action `switch_required` returned, presents Switch Confirmation modal |
| **RDR-N02** | Any | Negative | Respond to already used or revoked invitation | Submit respond call to already redeemed/revoked token | Returns `404 Not Found` or `409 Conflict`, prevents double-redemption |
| **RDR-N03** | Manager | Negative | Approve or reject non-pending rider request | Attempt approve/reject on already processed rider request | Returns `400 Bad Request` or `409 Conflict` |

---

### 2.5 Fleet Inventory Management & Lock Code Confidentiality

| Test ID | Persona | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FLT-P01** | Manager | Positive | Register new bicycle to parking stand (backend sequence assignment) | Enter Company: Hero, Model: Sprint, Colour: Red, Lock: unique code (public ID control removed from UI) | Returns `201 Created`, backend auto-assigns sequence `PUN-xxx` |
| **FLT-P02** | Manager | Positive | Repair out-of-order bicycle | Select cycle in `Puncture` status, update status to `Working` | Cycle status updated to `Working`, eligible for checkout |
| **FLT-P03** | Public Visitor | Positive | Lookup cycle by QR / public ID anonymously | Call `GET /api/cycles/lookup/PUN-001` without auth | Returns cycle model, colour, status; `lockCode` is **hidden** |
| **FLT-P04** | Active Rider | Positive | Lookup cycle currently checked out by caller | Call `GET /api/cycles/lookup/PUN-001` with active rider token | Returns cycle info including `lockCode` ("4521") |
| **FLT-N01** | Public Visitor | Negative | Attempt to read lock code unauthenticated | Inspect anonymous lookup response payload | `lockCode` property is absent / undefined |

---

### 2.6 Scan-to-Ride QR & The 5-Gate Verification Flow

| Test ID | Gate | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CHK-N01** | **Gate 1: Role** | Negative | Anonymous / non-rider attempts checkout | Call `POST /api/cycles/{id}/checkout` without rider token | Returns `401 Unauthorized` or `403 Forbidden` |
| **CHK-N02** | **Gate 2: Stand** | Negative | Rider attempts checkout from foreign stand | Rahim (Clubhouse stand) attempts checkout of PUN-002 (Gate 1 stand) | Returns `403 Forbidden` ("Cycle belongs to Gate 1. Only checkout at home stand.") |
| **CHK-N03** | **Gate 3: Condition** | Negative | Rider attempts checkout of damaged cycle | Rider attempts checkout of cycle with status `Puncture` or `Broken` | Returns `400 Bad Request` ("Cycle marked as Puncture and unavailable") |
| **CHK-N04** | **Gate 4: In Use** | Negative | Rider attempts checkout of actively checked out cycle | Rider attempts checkout of PUN-001 (already checked out by Kavita) | Returns `409 Conflict` ("Cycle is currently in use by another resident") |
| **CHK-N05** | **Gate 5: Limit** | Negative | Rider with active checkout attempts second checkout | Kavita (has active checkout) attempts checkout of PUN-002 | Returns `400 Bad Request` ("Return active cycle before checking out another") |
| **CHK-P01** | All Gates | Positive | Eligible rider checks out working cycle at home stand | Rider at Gate 1 with 0 active checkouts checks out PUN-002 | Returns `201 Created`, creates active checkout, reveals lock code |

---

### 2.7 Cycle Return & Damage Reporting Flow

| Test ID | Persona | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RET-P01** | Rider | Positive | Return bicycle in Working condition | Open Return Modal -> Condition: `Working`, Notes: empty -> Submit | Checkout session `returned`, cycle status remains `Working` |
| **RET-P02** | Rider | Positive | Return bicycle reporting flat tyre (`Puncture`) | Open Return Modal -> Condition: `Puncture`, Notes: "Rear tyre flat" | Checkout session `returned`, cycle status updated to `Puncture` |
| **RET-P03** | Rider | Positive | Return bicycle reporting mechanical issue (`Broken`) | Open Return Modal -> Condition: `Broken`, Notes: "Chain broken" | Checkout session `returned`, cycle status updated to `Broken` |
| **RET-N01** | Rider | Negative | Return already returned checkout session | Call `POST /api/checkouts/{id}/return` on completed checkout | Returns `400 Bad Request` ("Already marked returned") |
| **RET-N02** | Rider | Negative | Return checkout owned by another rider | Rider 2 attempts to return Rider 1's checkout session ID | Returns `403 Forbidden` ("Do not own this checkout session") |

---

### 2.8 Personal Details & Emergency Contact Management (`feat012`)

| Test ID | Persona | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PRF-P01** | Rider / Any | Positive | Self-service update of profile details | Call `PUT /api/auth/me` with `mobile`, `address`, `emergencyContact` | Returns `200 OK`, updated profile persisted |
| **PRF-P02** | Admin | Positive | Admin updates person record & comments | Call `PUT /api/persons/{id}` with `comments`, `mobile`, `emergencyContact` | Returns `200 OK`, administrative comments updated |
| **PRF-N01** | Rider / Manager | Negative | Non-admin attempts admin person update | Non-admin calls `PUT /api/persons/{id}` | Returns `403 Forbidden` |
| **PRF-N02** | Unauthenticated | Negative | Anonymous attempt to update profile | Call `PUT /api/auth/me` without `Authorization` header | Returns `401 Unauthorized` |

---

### 2.9 Unique Lock Code Enforcement per Hub (`feat013`)

| Test ID | Persona | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LCK-N01** | Manager | Negative | Register cycle with duplicate lock code in same hub | Submit `POST /api/parkings/{id}/cycles` with lock code already stationed at hub | Returns `400 Bad Request` ("Lock code is already in use by cycle <ID> in this hub") |
| **LCK-N02** | Manager | Negative | Update cycle lock code to duplicate existing hub lock code | Submit `PUT /api/cycles/{id}` with lock code of another cycle in same hub | Returns `400 Bad Request` ("Lock code is already in use by cycle <ID> in this hub") |
| **LCK-P01** | Manager | Positive | Register cycle with identical lock code at DIFFERENT hub | Register cycle with lock code `4521` at `prk-gw-clubhouse` (different hub) | Returns `201 Created`, accepted across distinct hubs |

---

### 2.10 Password Reset & Recovery Flows (`feat014`)

| Test ID | Persona | Type | Description | Steps / Inputs | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RST-P01** | Admin | Positive | Admin generates reset link for any person | Admin clicks "🔑 Reset Pwd" on user in Person Directory | Returns `200 OK` with 24h single-use token, reset link, and `wa.me` URL |
| **RST-P02** | Manager | Positive | Manager generates reset link for rider in managed hub | Manager clicks "🔑 Reset Pwd" in Hub Riders table | Returns `200 OK` with reset link and `wa.me` URL |
| **RST-N01** | Manager | Negative | Manager attempts reset for person outside managed hub | Call `POST /api/persons/{id}/password-reset` for rider from unmanaged hub | Returns `403 Forbidden` |
| **RST-N02** | Rider | Negative | Rider attempts to generate password reset link | Call `POST /api/persons/{id}/password-reset` with rider session token | Returns `403 Forbidden` |
| **RST-N03** | Unauthenticated | Negative | Anonymous attempt to generate reset link | Call `POST /api/persons/{id}/password-reset` without session token | Returns `401 Unauthorized` |
| **RST-P03** | Public | Positive | Public verification of valid reset token | Call `GET /api/auth/reset-password/{token}` | Returns `200 OK` with `valid: true`, recipient name, and email |
| **RST-N04** | Public | Negative | Verification of invalid / expired / consumed token | Call `GET /api/auth/reset-password/{token}` with invalid token | Returns `404 Not Found` or `400 Bad Request` |
| **RST-P04** | Public | Positive | Execute password reset with valid token | Submit `POST /api/auth/reset-password` with token and new password (>=6 chars) | Returns `200 OK`; credentials updated; token marked consumed |
| **RST-N05** | Public | Negative | Re-execute password reset using already consumed token | Submit `POST /api/auth/reset-password` with same token again | Returns `400 Bad Request` |
| **RST-N06** | Public | Negative | Execute password reset with short password | Submit `POST /api/auth/reset-password` with password shorter than 6 chars | Returns `400 Bad Request` ("Password must be at least 6 characters") |

---

## 3. Automated Test Execution Guide

The test suite runs against the backend using the `./btool test` CLI driver or directly via Python 3:

```bash
# Run all automated test suites (Multi-User + Password Reset) via CLI driver
./btool test [--env <name>]

# Run specific suite subsets via CLI driver
./btool test --suite admin
./btool test --suite manager
./btool test --suite rider
./btool test --suite reset
./btool test --suite multi

# Run directly via Python 3 standard library
python3 scripts/test_multi_user.py
python3 scripts/test_admin.py
python3 scripts/test_manager.py
python3 scripts/test_rider.py
python3 scripts/test_password_reset.py
```
