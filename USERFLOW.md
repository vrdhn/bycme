# Bycme User Flows & State Machines

## 1. System Personas & Actor Hierarchy

### 1.1 Actors & Role Boundaries

![System Actors and Role Boundaries](docs/diagrams/01-actors-and-roles.svg)

### 1.2 Persona & Workspace Access Matrix

| Role (Backend) | GUI Persona (`feat011`) | Default Workspace | Gated API Scope | Multi-Assignment Policy |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | **`ClubHero`** | `🛡️ ClubHero Console` | Global access (`/api/cities`, `/api/buildings`, `/api/parkings`, `/api/admin/*`, `/api/persons`) | Global platform scope |
| **Parking Manager** | **`HubHero`** | `👔 HubHero Workspace` | Assigned hubs (`/api/me/parkings`, `/api/parkings/{id}/cycles`, `/api/parkings/{id}/rider-invitations`) | Multiple private residential hubs |
| **Resident Rider** | **Resident Rider** | `🚲 Rider Workspace` | Assigned home hub (`/api/me/home-parking`, `/api/me/active-checkout`, `/api/cycles/{id}/checkout`) | Strict 1-hub invariant (`parking_riders`) |
| **Anonymous Visitor** | **Public Visitor** | Landing / QR Portal / Reset | Public lookups (`/api/health`, `/api/auth/*`, `/api/invitations/{token}`, `/api/cycles/lookup/{id}`, `/api/auth/reset-password/*`) | None (Unauthenticated) |

### 1.3 GUI Terminology Mapping (`feat011`)

| Relational / Backend Entity | GUI Terminology | Description |
| :--- | :--- | :--- |
| `buildings` | **Club** | Society, office campus, or public facility |
| `parkings` | **Hub** | Physical cycle docking station within a Club |
| `Admin` role | **ClubHero** | System administrator with full facility and user governance |
| `Manager` role | **HubHero** | On-site hub manager responsible for fleet & resident riders |

---

## 2. Location Infrastructure & Classification Flow

### 2.1 3-Tier Hierarchy & Club Privacy Guardrails

![Location Hierarchy and Facility Guardrails](docs/diagrams/02-location-infrastructure.svg)

### 2.2 Club Classification Rules

| Club Type | Domain Context | HubHero Eligibility | Resident Rider Scope |
| :--- | :--- | :--- | :--- |
| **Private (Residential)** | Apartment societies, residential towers | **Eligible** (Assigned by ClubHero or claimed via invite) | Private resident roster with active single-hub checkouts |
| **Public (Campus / Office / Transit)** | Metro stations, university campuses, IT parks | **Blocked** (`400 Bad Request` on invitation generation) | Open transit docking; central platform management |

---

## 3. HubHero Invitation & Onboarding State Machine

### 3.1 Invitation Generation & Lifecycle
* **Link Route**: `https://bycme-staging.pages.dev/#/join/mgr/<token>`
* **Token Structure**: 16-byte cryptographically secure random base64url token (22 chars)
* **Parameters**: Expiration duration (`1h`, `6h`, `24h`, `7d`), Preapproval toggle (`isPreapproved: boolean`)

### 3.2 Decision State Diagram

![Manager Invitation and Onboarding Decision Diagram](docs/diagrams/03-manager-onboarding.svg)

### 3.3 HubHero Onboarding Decision Matrix

| Case | Scenario | User State | System Action | Resulting Assignment |
| :--- | :--- | :--- | :--- | :--- |
| **Case 1** | Unauthenticated link visit | No session token | Presents login / registration modal | Prompts credentials before evaluating link |
| **Case 2** | Preapproved invitation | Authenticated user | Direct claim without ClubHero review | Hub assigned in `parking_managers`; role upgraded to `Manager` (`HubHero`) |
| **Case 3** | Standard (non-preapproved) invitation | Authenticated user | Creates record in `manager_requests` (`status = 'pending'`) | Awaits ClubHero approval from `🛡️ ClubHero Console` |
| **Case 4** | Already managing target hub | Assigned HubHero | Displays idempotent "Already Managing" badge | No duplicate record created |
| **Case 5** | Expired or revoked link | Any user | Returns `404 Not Found` with error alert | Terminal state |
| **Case 6** | Public club invitation attempt | Any user | Rejection with `400 Bad Request` | Invitations restricted to Private residential clubs/hubs |

---

## 4. Rider Invitation & Single-Hub Transfer Flow

### 4.1 Strict Single-Hub Policy
* Every resident rider is strictly bound to **at most one** bicycle docking hub (`parking_riders.person_id UNIQUE`).
* When an active rider accepts an invitation to a new hub, the system presents an explicit **Switch Hub Confirmation Dialog**.

### 4.2 Rider Acceptance & Hub Transfer Decision Matrix

![Rider Invitation and Single-Shed Transfer Flow](docs/diagrams/04-rider-transfer.svg)

### 4.3 Rider Transfer Decision Matrix

| Scenario | Prior Enrollment | User Action | System Execution | Final State |
| :--- | :--- | :--- | :--- | :--- |
| **First-Time Rider (Preapproved)** | None | Accept invitation | Adds `Rider` role + inserts `parking_riders` | Direct home hub activation |
| **First-Time Rider (Standard)** | None | Request access | Submits `rider_requests` (`is_switch = 0`) | HubHero approval queue |
| **Existing Rider (Preapproved)** | Hub A | Confirms switch (`confirmSwitch: true`) | Atomic transaction: deletes Hub A + inserts Hub B | Seamlessly transferred to Hub B |
| **Existing Rider (Standard)** | Hub A | Confirms switch (`confirmSwitch: true`) | Submits `rider_requests` with `previous_parking_id = Hub A` | HubHero reviews transfer with previous hub badge |
| **Idempotent Visit** | Hub A | Visits Hub A invite | Displays "Already Registered at This Hub" | No state change |

---

## 5. Cycle Fleet Management & Condition State Machine

### 5.1 Cycle Attributes
* `public_cycle_id`: Auto-assigned sequence (`PUN-001`, `BLR-001`, `CYC-001`)
* `lock_code`: Secret mechanical combination code (hidden from public view, numbers-only)
* `qr_code`: Scannable compact token deep-linked to `/#/cycle/<qr_code>`
* `status`: Current physical condition

### 5.2 Condition State Machine

![Cycle Fleet Condition State Machine](docs/diagrams/05-cycle-condition-state-machine.svg)

### 5.3 Physical Status Lifecycle

| Status | Availability | Trigger | Next Allowed Transition |
| :--- | :--- | :--- | :--- |
| **`Working`** | **Available** (Eligible for checkout) | HubHero initial registration or post-repair reset | ➔ `Puncture` or `Broken` upon rider return |
| **`Puncture`** | **Blocked** (Out of service) | Rider reports flat tyre on return modal | ➔ `Working` once repaired by HubHero |
| **`Broken`** | **Blocked** (Out of service) | Rider reports mechanical damage on return modal | ➔ `Working` once repaired by HubHero |

---

## 6. Scan-to-Ride QR & Checkout Flow (`/#/cycle/<qr_code>`)

### 6.1 Scan-to-Ride 5-Gate Verification Flowchart

![Scan-to-Ride 5-Gate Verification Flowchart](docs/diagrams/06-scan-to-ride-gates.svg)

### 6.2 Five Verification Gates Specification

| Gate | Validation Check | Failure Code & UI Message |
| :--- | :--- | :--- |
| **Gate 1: Role** | Caller holds `Rider` role in `person_roles` | `403 Forbidden`: Displays prompt to register or accept resident invitation |
| **Gate 2: Hub** | Cycle stationed at rider's assigned home hub | `400 Bad Request`: "Cycle belongs to [Hub]. You can only checkout cycles at your home hub." |
| **Gate 3: Condition** | Cycle condition is strictly `'Working'` | `400 Bad Request`: "This cycle is currently marked as '[Puncture/Broken]' and is unavailable." |
| **Gate 4: In Use** | Zero active checkouts on this specific cycle | `400 Bad Request`: "This cycle is currently in use by another resident." |
| **Gate 5: Limit** | Caller has zero active checkouts (Strict 1-cycle limit) | `400 Bad Request`: "You already have an active cycle checkout. Return your active cycle first." |

---

## 7. Cycle Return & Damage Reporting Flow

### 7.1 Condition Reporting Flowchart

![Cycle Return and Damage Reporting Flowchart](docs/diagrams/07-cycle-return-reporting.svg)

### 7.2 Post-Return Verification Summary

| Checkpoint | Working Return | Puncture / Broken Return |
| :--- | :--- | :--- |
| `cycle_checkouts.status` | Set to `'returned'` | Set to `'returned'` |
| `cycle_checkouts.return_condition` | `'Working'` | `'Puncture'` or `'Broken'` |
| `cycle_checkouts.return_notes` | Null or optional note | Problem description saved |
| `cycles.status` | Unchanged (`'Working'`) | Updated immediately to `'Puncture'` or `'Broken'` |
| Next Rider Availability | Available immediately | **Blocked** (Gate 3 rejects checkout) |
| HubHero Workspace Action | None required | Status badge alerts HubHero to repair cycle |

---

## 8. User Profile & Personal Details Management Flow (`feat012`)

### 8.1 Personal Profile Lifecycles

* **Self-Service Channel**:
  * Authenticated users access `UserProfileModal` by clicking user status pill in `StatusBar`.
  * Allows editing `name`, `dob`, `gender`, `mobile`, `address`, and emergency contact (`emergency_name`, `emergency_phone1`, `emergency_phone2`).
  * Persisted via `PUT /api/auth/me`.
* **ClubHero Administrative Channel**:
  * ClubHero administrators open `AdminEditPersonModal` from the User Directory in `🛡️ ClubHero Console`.
  * Allows inspecting and editing all profile attributes plus internal `comments`.
  * Persisted via `PUT /api/persons/{id}`. Non-ClubHero calls return `403 Forbidden`.
* **HubHero Operational Visibility**:
  * Roster view in `👔 HubHero Workspace` (`👥 Riders & Access`) displays rider contact details (`mobile`) and primary emergency contact (`emergency_name`, `emergency_phone1`) for safety and on-site support.

### 8.2 Profile Update Permission Matrix

| Actor | Target Endpoint | Editable Fields | Read Access |
| :--- | :--- | :--- | :--- |
| **Self (Any Role)** | `PUT /api/auth/me` | Name, DOB, Gender, Mobile, Address, Emergency Contact | Own profile |
| **ClubHero** | `PUT /api/persons/{id}` | Name, DOB, Gender, Mobile, Address, Emergency Contact, Comments | All persons directory |
| **HubHero** | Roster display only | Read-only inspection of managed hub riders | Managed hub riders |
| **Unauthenticated** | Blocked | None (`401 Unauthorized`) | None |

---

## 9. Hub-Scoped Unique Lock Code Guardrail Flow (`feat013`)

### 9.1 Multi-Layer Invariant Enforcement

```
┌────────────────────────────────────────────────────────┐
│ HubHero Inputs Combination Lock Code (e.g. "4521")      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ Gate 1: Frontend Assertion│ Duplicate in modal? ──► [Block Submission with Alert]
              └─────────────┬─────────────┘
                            │ Unique locally
                            ▼
              ┌───────────────────────────┐
              │ Gate 2: Worker Pre-Check  │ Duplicate in hub DB? ─► [400 Bad Request with Message]
              └─────────────┬─────────────┘
                            │ Unique in target hub
                            ▼
              ┌───────────────────────────┐
              │ Gate 3: DB SQLite Index   │ Conflict detected? ───► [SQLITE_CONSTRAINT Exception]
              └─────────────┬─────────────┘
                            │ Success
                            ▼
              ┌───────────────────────────┐
              │ Cycle Persisted to Fleet  │
              └───────────────────────────┘
```

### 9.2 Validation Outcomes

| Context | Target Hub | Lock Code | System Action | Status Code |
| :--- | :--- | :--- | :--- | :--- |
| **New Cycle Registration** | Gate 1 Hub | `1234` (New to Gate 1) | Insert accepted | `201 Created` |
| **Duplicate Code Collision** | Gate 1 Hub | `4521` (Already at Gate 1) | Rejected with collision message | `400 Bad Request` |
| **Identical Code Across Hubs** | Clubhouse Hub | `4521` (Stationed at Gate 1) | Accepted (Scope restricted to same hub) | `201 Created` |
| **Cycle Update Collision** | Gate 1 Hub | Updated to duplicate code | Rejected with collision message | `400 Bad Request` |

---

## 10. WhatsApp Password Reset & Recovery State Machine (`feat014`)

### 10.1 Out-of-Band Recovery Lifecycle

* **Link Route**: `https://bycme-staging.pages.dev/#/reset-password/<token>`
* **Token Structure**: 16-byte random unpadded base64url UUID token (22 chars)
* **Expiry Window**: Strictly 24 hours from generation
* **WhatsApp Share URL**: `https://wa.me/<mobile>?text=<encoded_message>`

### 10.2 Permission Boundary Matrix

| Actor | Target Subject | Action | API Endpoint | Result |
| :--- | :--- | :--- | :--- | :--- |
| **ClubHero** | Any registered person | Generate reset token | `POST /api/persons/{id}/password-reset` | `200 OK` with reset link & `wa.me` URL |
| **HubHero** | Rider / HubHero at managed hub | Generate reset token | `POST /api/persons/{id}/password-reset` | `200 OK` with reset link & `wa.me` URL |
| **HubHero** | User outside managed hub | Attempt token generation | `POST /api/persons/{id}/password-reset` | `403 Forbidden` |
| **Rider / Anonymous** | Any user | Attempt token generation | `POST /api/persons/{id}/password-reset` | `401 Unauthorized` / `403 Forbidden` |

### 10.3 Token Verification & Credential Reset Lifecycle

| Step | State | Action | Validation Rules | Next State |
| :--- | :--- | :--- | :--- | :--- |
| **1. Token Verification** | Unconsumed | Open `/#/reset-password/<token>` | Calls `GET /api/auth/reset-password/{token}` | Displays recipient name & password form |
| **2. Expiry / Revocation** | Expired / Used | Open consumed link | Token is expired (`expires_at < now`) or consumed (`used_at IS NOT NULL`) | `404 Not Found` with expired warning |
| **3. Credential Update** | Form Submit | Submit new password | Enforces minimum length >= 6 characters | Updates PBKDF2 hash, marks `used_at = CURRENT_TIMESTAMP` |
| **4. Token Invalidation** | Consumed | Re-submit with same token | `used_at` already populated | `400 Bad Request` (Single-use token already consumed) |
| **5. Post-Reset Auth** | Completed | Login with new password | Authenticates against updated credentials | `200 OK` session established; old password rejected |
