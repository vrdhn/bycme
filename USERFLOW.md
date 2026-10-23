# Bycme User Flows & State Machines

## 1. System Personas & Actor Hierarchy

### 1.1 Actors & Role Boundaries

```xml
<svg viewBox="0 0 920 320" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;font-family:system-ui,-apple-system,sans-serif;">
  <rect width="920" height="320" fill="#f8fafc" rx="12" stroke="#e2e8f0" stroke-width="1.5"/>
  
  <!-- System Administrator -->
  <g transform="translate(30, 30)">
    <rect width="260" height="260" rx="10" fill="#ffffff" stroke="#6366f1" stroke-width="2"/>
    <rect width="260" height="42" rx="10" fill="#6366f1"/>
    <text x="130" y="27" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700">🛡️ SYSTEM ADMINISTRATOR</text>
    <text x="20" y="70" font-size="12" font-weight="600" fill="#4338ca">Primary Capabilities:</text>
    <text x="25" y="95" font-size="11" fill="#475569">• Full Location Hierarchy (City/Bldg/Park)</text>
    <text x="25" y="118" font-size="11" fill="#475569">• Generate Manager Invitations</text>
    <text x="25" y="141" font-size="11" fill="#475569">• Review & Approve Manager Requests</text>
    <text x="25" y="164" font-size="11" fill="#475569">• View All Platform Users & Roles</text>
    <text x="25" y="187" font-size="11" fill="#475569">• Revoke Global Invitations</text>
    <rect x="20" y="220" width="220" height="28" rx="6" fill="#eef2ff" stroke="#c7d2fe"/>
    <text x="130" y="238" text-anchor="middle" fill="#4f46e5" font-size="11" font-weight="600">Workspace: 🛡️ Admin Console</text>
  </g>

  <!-- Parking Manager -->
  <g transform="translate(330, 30)">
    <rect width="260" height="260" rx="10" fill="#ffffff" stroke="#0d9488" stroke-width="2"/>
    <rect width="260" height="42" rx="10" fill="#0d9488"/>
    <text x="130" y="27" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700">🏢 PARKING MANAGER</text>
    <text x="20" y="70" font-size="12" font-weight="600" fill="#0f766e">Primary Capabilities:</text>
    <text x="25" y="95" font-size="11" fill="#475569">• Manage Station Bicycles & Fleets</text>
    <text x="25" y="118" font-size="11" fill="#475569">• Register Cycles & Edit Lock Codes</text>
    <text x="25" y="141" font-size="11" fill="#475569">• Generate Rider Invitations</text>
    <text x="25" y="164" font-size="11" fill="#475569">• Approve/Reject Resident Requests</text>
    <text x="25" y="187" font-size="11" fill="#475569">• Repair Cycles (Puncture/Broken)</text>
    <rect x="20" y="220" width="220" height="28" rx="6" fill="#f0fdfa" stroke="#99f6e4"/>
    <text x="130" y="238" text-anchor="middle" fill="#0f766e" font-size="11" font-weight="600">Workspace: 🏢 Manager Workspace</text>
  </g>

  <!-- Resident Rider -->
  <g transform="translate(630, 30)">
    <rect width="260" height="260" rx="10" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>
    <rect width="260" height="42" rx="10" fill="#16a34a"/>
    <text x="130" y="27" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700">🚲 RESIDENT RIDER</text>
    <text x="20" y="70" font-size="12" font-weight="600" fill="#15803d">Primary Capabilities:</text>
    <text x="25" y="95" font-size="11" fill="#475569">• Enrolled in 1 Home Parking Stand</text>
    <text x="25" y="118" font-size="11" fill="#475569">• View Station Fleet Availability</text>
    <text x="25" y="141" font-size="11" fill="#475569">• Checkout Bicycle (Reveals Lock Code)</text>
    <text x="25" y="164" font-size="11" fill="#475569">• Strict Limit: At most 1 Active Ride</text>
    <text x="25" y="187" font-size="11" fill="#475569">• Return Cycle with Damage Report</text>
    <rect x="20" y="220" width="220" height="28" rx="6" fill="#f0fdf4" stroke="#bbf7d0"/>
    <text x="130" y="238" text-anchor="middle" fill="#15803d" font-size="11" font-weight="600">Workspace: 🚲 Rider Workspace</text>
  </g>
</svg>
```

### 1.2 Persona & Workspace Access Matrix

| Role | Default Workspace | Gated API Scope | Multi-Assignment Policy |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `🛡️ Admin Console` | All endpoints (`/api/cities`, `/api/buildings`, `/api/parkings`, `/api/admin/*`, `/api/persons`) | Global platform scope |
| **Parking Manager** | `🏢 Manager Workspace` | Assigned parkings (`/api/me/parkings`, `/api/parkings/{id}/cycles`, `/api/parkings/{id}/rider-invitations`) | Allowed multiple private stands |
| **Resident Rider** | `🚲 Rider Workspace` | Assigned home stand (`/api/me/home-parking`, `/api/me/active-checkout`, `/api/cycles/{id}/checkout`) | Strict 1-stand limit (`parking_riders`) |
| **Anonymous Visitor** | Public Landing / Portal | Public lookup (`/api/health`, `/api/auth/*`, `/api/invitations/{token}`, `/api/cycles/lookup/{id}`) | None (Session unauthenticated) |

---

## 2. Location Infrastructure & Classification Flow

### 2.1 3-Tier Hierarchy & Facility Privacy Guardrails

```xml
<svg viewBox="0 0 940 380" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;font-family:system-ui,-apple-system,sans-serif;">
  <rect width="940" height="380" fill="#f8fafc" rx="12" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- City Node -->
  <g transform="translate(40, 140)">
    <rect width="180" height="80" rx="8" fill="#ffffff" stroke="#6366f1" stroke-width="2"/>
    <text x="90" y="32" text-anchor="middle" fill="#4338ca" font-size="13" font-weight="700">📍 CITY</text>
    <text x="90" y="52" text-anchor="middle" fill="#64748b" font-size="11">e.g. Pune, Maharashtra</text>
    <text x="90" y="68" text-anchor="middle" fill="#94a3b8" font-size="10">Table: cities</text>
  </g>

  <!-- Line City to Buildings -->
  <path d="M 220 180 L 290 180" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <path d="M 290 180 L 290 80 L 330 80" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
  <path d="M 290 180 L 290 280 L 330 280" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Building Node: Private -->
  <g transform="translate(330, 35)">
    <rect width="240" height="90" rx="8" fill="#f0fdfa" stroke="#0d9488" stroke-width="2"/>
    <rect x="14" y="10" width="120" height="20" rx="4" fill="#ccfbf1"/>
    <text x="74" y="24" text-anchor="middle" fill="#0f766e" font-size="10" font-weight="700">PRIVATE (RESIDENTIAL)</text>
    <text x="20" y="52" fill="#0f766e" font-size="13" font-weight="700">🏢 Apartment Society / Tower</text>
    <text x="20" y="72" fill="#475569" font-size="11">Eligible for Manager & Rider Invites</text>
  </g>

  <!-- Building Node: Public -->
  <g transform="translate(330, 235)">
    <rect width="240" height="90" rx="8" fill="#fff1f2" stroke="#e11d48" stroke-width="2"/>
    <rect x="14" y="10" width="130" height="20" rx="4" fill="#ffe4e6"/>
    <text x="79" y="24" text-anchor="middle" fill="#be123c" font-size="10" font-weight="700">PUBLIC (CAMPUS/TRANSIT)</text>
    <text x="20" y="52" fill="#be123c" font-size="13" font-weight="700">🚉 Metro / University Hub</text>
    <text x="20" y="72" fill="#475569" font-size="11">Manager Assignment Prohibited</text>
  </g>

  <!-- Line to Parkings -->
  <path d="M 570 80 L 630 80" fill="none" stroke="#0d9488" stroke-width="2"/>
  <path d="M 570 280 L 630 280" fill="none" stroke="#e11d48" stroke-width="2"/>

  <!-- Parking Node: Private Stand -->
  <g transform="translate(630, 25)">
    <rect width="270" height="110" rx="8" fill="#ffffff" stroke="#0d9488" stroke-width="1.5"/>
    <text x="20" y="28" fill="#0f766e" font-size="12" font-weight="700">🅿️ Residential Bicycle Stand</text>
    <text x="20" y="48" fill="#475569" font-size="11">• Managed by local Society Resident</text>
    <text x="20" y="68" fill="#475569" font-size="11">• Private Resident Fleet (1 dock / 1 cycle)</text>
    <rect x="20" y="80" width="220" height="22" rx="4" fill="#dcfce7"/>
    <text x="130" y="95" text-anchor="middle" fill="#166534" font-size="10" font-weight="700">✓ Manager & Rider Invitations Allowed</text>
  </g>

  <!-- Parking Node: Public Stand -->
  <g transform="translate(630, 225)">
    <rect width="270" height="110" rx="8" fill="#ffffff" stroke="#e11d48" stroke-width="1.5"/>
    <text x="20" y="28" fill="#be123c" font-size="12" font-weight="700">🅿️ Public Transit Stand</text>
    <text x="20" y="48" fill="#475569" font-size="11">• Centralized platform maintenance</text>
    <text x="20" y="68" fill="#475569" font-size="11">• Open public transit docking</text>
    <rect x="20" y="80" width="220" height="22" rx="4" fill="#fee2e2"/>
    <text x="130" y="95" text-anchor="middle" fill="#991b1b" font-size="10" font-weight="700">✕ Manager Invitations Blocked (400)</text>
  </g>
</svg>
```

---

## 3. Manager Invitation & Onboarding State Machine

### 3.1 Invitation Generation & Lifecycle

* **Link Route**: `https://bycme-staging.pages.dev/#/join/mgr/<token>`
* **Token Structure**: 16-byte cryptographically secure random base64url token (22 chars)
* **Parameters**: Expiration duration (`1h`, `6h`, `24h`, `7d`), Preapproval toggle (`isPreapproved: boolean`)

### 3.2 Decision State Diagram

```xml
<svg viewBox="0 0 920 540" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;font-family:system-ui,-apple-system,sans-serif;">
  <rect width="920" height="540" fill="#f8fafc" rx="12" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- Start Node -->
  <circle cx="100" cy="80" r="24" fill="#6366f1"/>
  <text x="100" y="85" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">OPEN URL</text>

  <!-- Path to Token Check -->
  <path d="M 124 80 L 190 80" fill="none" stroke="#64748b" stroke-width="2"/>
  
  <!-- Step 1: Token Validity -->
  <g transform="translate(190, 45)">
    <polygon points="70,0 140,35 70,70 0,35" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
    <text x="70" y="32" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e">Token Valid &amp;</text>
    <text x="70" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e">Unexpired?</text>
  </g>

  <!-- Invalid -> Stop -->
  <path d="M 260 45 L 260 20 L 380 20" fill="none" stroke="#ef4444" stroke-width="1.5"/>
  <rect x="380" y="8" width="180" height="26" rx="4" fill="#fee2e2" stroke="#ef4444"/>
  <text x="470" y="25" text-anchor="middle" font-size="10" font-weight="600" fill="#991b1b">Case 5: 404 Link Expired/Revoked</text>

  <!-- Valid -> Auth Check -->
  <path d="M 330 80 L 390 80" fill="none" stroke="#64748b" stroke-width="2"/>
  
  <g transform="translate(390, 45)">
    <polygon points="65,0 130,35 65,70 0,35" fill="#e0e7ff" stroke="#4f46e5" stroke-width="1.5"/>
    <text x="65" y="32" text-anchor="middle" font-size="10" font-weight="700" fill="#3730a3">Caller</text>
    <text x="65" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#3730a3">Logged In?</text>
  </g>

  <!-- No Auth -> Login Card -->
  <path d="M 455 115 L 455 170" fill="none" stroke="#d97706" stroke-width="1.5"/>
  <rect x="365" y="170" width="180" height="40" rx="6" fill="#fef3c7" stroke="#d97706"/>
  <text x="455" y="188" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e">Case 1: Unauthenticated</text>
  <text x="455" y="202" text-anchor="middle" font-size="9" fill="#92400e">Renders Login / Register Card</text>
  <path d="M 455 210 L 455 240 L 580 240 L 580 80 L 610 80" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3 3"/>

  <!-- Auth -> Parking Check -->
  <path d="M 520 80 L 610 80" fill="none" stroke="#64748b" stroke-width="2"/>

  <g transform="translate(610, 45)">
    <polygon points="75,0 150,35 75,70 0,35" fill="#ccfbf1" stroke="#0d9488" stroke-width="1.5"/>
    <text x="75" y="32" text-anchor="middle" font-size="10" font-weight="700" fill="#0f766e">Facility</text>
    <text x="75" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#0f766e">Private Stand?</text>
  </g>

  <!-- Public Parking -> Reject -->
  <path d="M 685 45 L 685 20 L 780 20" fill="none" stroke="#ef4444" stroke-width="1.5"/>
  <rect x="760" y="8" width="145" height="26" rx="4" fill="#fee2e2" stroke="#ef4444"/>
  <text x="832" y="25" text-anchor="middle" font-size="9" font-weight="700" fill="#991b1b">Case 6: 400 Public Block</text>

  <!-- Private -> Preapproved? -->
  <path d="M 685 115 L 685 280 L 480 280" fill="none" stroke="#0d9488" stroke-width="2"/>

  <g transform="translate(340, 250)">
    <polygon points="70,0 140,30 70,60 0,30" fill="#dcfce7" stroke="#16a34a" stroke-width="1.5"/>
    <text x="70" y="28" text-anchor="middle" font-size="10" font-weight="700" fill="#15803d">Is Invitation</text>
    <text x="70" y="42" text-anchor="middle" font-size="10" font-weight="700" fill="#15803d">Pre-Approved?</text>
  </g>

  <!-- Pre-Approved YES -> Direct Assign -->
  <path d="M 340 280 L 220 280" fill="none" stroke="#16a34a" stroke-width="2"/>
  <rect x="30" y="255" width="190" height="50" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="125" y="275" text-anchor="middle" font-size="11" font-weight="700" fill="#15803d">Case 2: Direct Assignment</text>
  <text x="125" y="293" text-anchor="middle" font-size="9" fill="#15803d">• Add Manager role to user</text>

  <!-- Pre-Approved NO -> Request Flow -->
  <path d="M 410 310 L 410 370" fill="none" stroke="#0284c7" stroke-width="2"/>
  
  <g transform="translate(290, 370)">
    <rect width="240" height="55" rx="6" fill="#f0f9ff" stroke="#0284c7" stroke-width="1.5"/>
    <text x="120" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#0369a1">Case 3: Standard Request</text>
    <text x="120" y="42" text-anchor="middle" font-size="9" fill="#0284c7">Creates record in manager_requests ('pending')</text>
  </g>

  <!-- Admin Approval Step -->
  <path d="M 410 425 L 410 465" fill="none" stroke="#6366f1" stroke-width="2"/>
  
  <g transform="translate(230, 465)">
    <rect width="360" height="55" rx="6" fill="#ffffff" stroke="#6366f1" stroke-width="1.5"/>
    <text x="180" y="22" text-anchor="middle" font-size="11" font-weight="700" fill="#4338ca">Admin Console Review Queue</text>
    <text x="180" y="40" text-anchor="middle" font-size="9" fill="#64748b">Admin Clicks 'Approve' ➔ Assigns Stand + Grants Manager Role</text>
  </g>

  <!-- Case 4: Already Manager -->
  <g transform="translate(680, 260)">
    <rect width="200" height="50" rx="6" fill="#f8fafc" stroke="#94a3b8"/>
    <text x="100" y="22" text-anchor="middle" font-size="10" font-weight="700" fill="#334155">Case 4: Already Manager</text>
    <text x="100" y="38" text-anchor="middle" font-size="9" fill="#64748b">Shows 'Already Managing' badge</text>
  </g>
</svg>
```

---

## 4. Rider Invitation & Single-Shed Transfer Flow

### 4.1 Strict Single-Shed Policy
* Every resident rider is strictly bound to **at most one** bicycle parking stand (`parking_riders.person_id UNIQUE`).
* When an active rider accepts an invitation to a new parking stand, the system presents an explicit **Switch Parking Shed Confirmation Dialog**.

### 4.2 Rider Acceptance & Shed Transfer Decision Matrix

```xml
<svg viewBox="0 0 940 500" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;font-family:system-ui,-apple-system,sans-serif;">
  <rect width="940" height="500" fill="#f8fafc" rx="12" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- Start -->
  <g transform="translate(40, 40)">
    <rect width="180" height="60" rx="8" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>
    <text x="90" y="26" text-anchor="middle" font-size="12" font-weight="700" fill="#15803d">RIDER ACCEPTS INVITE</text>
    <text x="90" y="44" text-anchor="middle" font-size="10" fill="#64748b">/#/join/rider/&lt;token&gt;</text>
  </g>

  <path d="M 220 70 L 290 70" fill="none" stroke="#64748b" stroke-width="2"/>

  <!-- Check Existing Stand -->
  <g transform="translate(290, 35)">
    <polygon points="75,0 150,35 75,70 0,35" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
    <text x="75" y="32" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e">Assigned to an</text>
    <text x="75" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e">Existing Stand?</text>
  </g>

  <!-- NO Existing Stand -> Clean Join -->
  <path d="M 365 105 L 365 190" fill="none" stroke="#16a34a" stroke-width="2"/>
  
  <g transform="translate(265, 190)">
    <rect width="200" height="65" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
    <text x="100" y="25" text-anchor="middle" font-size="11" font-weight="700" fill="#15803d">First-Time Resident Rider</text>
    <text x="100" y="42" text-anchor="middle" font-size="9" fill="#166534">Direct Enrollment or</text>
    <text x="100" y="55" text-anchor="middle" font-size="9" fill="#166534">Manager Approval Request</text>
  </g>

  <!-- YES Existing Stand -> Interlock Check -->
  <path d="M 440 70 L 520 70" fill="none" stroke="#d97706" stroke-width="2"/>

  <g transform="translate(520, 35)">
    <polygon points="75,0 150,35 75,70 0,35" fill="#fed7aa" stroke="#ea580c" stroke-width="1.5"/>
    <text x="75" y="32" text-anchor="middle" font-size="10" font-weight="700" fill="#9a3412">Target Stand ==</text>
    <text x="75" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#9a3412">Current Stand?</text>
  </g>

  <!-- Same Stand -> Idempotent -->
  <path d="M 670 70 L 740 70" fill="none" stroke="#64748b" stroke-width="1.5"/>
  <rect x="740" y="45" width="160" height="50" rx="6" fill="#f1f5f9" stroke="#94a3b8"/>
  <text x="820" y="68" text-anchor="middle" font-size="10" font-weight="700" fill="#334155">Already Member</text>
  <text x="820" y="84" text-anchor="middle" font-size="9" fill="#64748b">No Action Required</text>

  <!-- Different Stand -> Switch Warning Dialog -->
  <path d="M 595 105 L 595 180" fill="none" stroke="#ea580c" stroke-width="2"/>

  <g transform="translate(470, 180)">
    <rect width="250" height="90" rx="8" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
    <text x="125" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#c2410c">⚠️ Switch Shed Confirmation Dialog</text>
    <text x="12" y="46" font-size="9" fill="#7c2d12">"You are registered at [Current Stand]."</text>
    <text x="12" y="62" font-size="9" fill="#7c2d12">"Joining [New Stand] will disconnect you from"</text>
    <text x="12" y="78" font-size="9" fill="#7c2d12">"your current home stand. Are you sure?"</text>
  </g>

  <!-- User Confirms Transfer -->
  <path d="M 595 270 L 595 330" fill="none" stroke="#ea580c" stroke-width="2"/>

  <g transform="translate(440, 330)">
    <rect width="310" height="70" rx="8" fill="#ffffff" stroke="#c2410c" stroke-width="1.5"/>
    <text x="155" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#9a3412">Rider Confirms Switch (confirmSwitch: true)</text>
    <text x="155" y="44" text-anchor="middle" font-size="9" fill="#64748b">Preapproved: atomic DELETE old stand + INSERT new stand</text>
    <text x="155" y="58" text-anchor="middle" font-size="9" fill="#64748b">Standard: logs previous_parking_id in rider_requests</text>
  </g>

  <!-- Manager Queue for Transfer -->
  <path d="M 595 400 L 595 440" fill="none" stroke="#64748b" stroke-width="1.5"/>
  <rect x="420" y="440" width="350" height="40" rx="6" fill="#f8fafc" stroke="#64748b"/>
  <text x="595" y="465" text-anchor="middle" font-size="10" font-weight="600" fill="#334155">
    Manager views transfer badge: "🔄 Switching from [Old Stand]"
  </text>
</svg>
```

---

## 5. Cycle Fleet Management & Condition State Machine

### 5.1 Cycle Attributes
* `public_cycle_id`: Auto-assigned sequence (`PUN-001`, `BLR-001`, `CYC-001`)
* `lock_code`: Secret mechanical code (hidden from public view, numbers-only)
* `qr_code`: Scannable compact token deep-linked to `/#/cycle/<qr_code>`
* `status`: Current physical condition

### 5.2 Condition State Machine

```xml
<svg viewBox="0 0 860 300" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;font-family:system-ui,-apple-system,sans-serif;">
  <rect width="860" height="300" fill="#f8fafc" rx="12" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- Working State (Green) -->
  <g transform="translate(60, 90)">
    <rect width="180" height="100" rx="10" fill="#f0fdf4" stroke="#22c55e" stroke-width="2.5"/>
    <text x="90" y="38" text-anchor="middle" font-size="15" font-weight="800" fill="#15803d">✓ WORKING</text>
    <text x="90" y="60" text-anchor="middle" font-size="11" fill="#166534">Available to Ride</text>
    <text x="90" y="78" text-anchor="middle" font-size="10" fill="#475569">Visible in Rider Fleet</text>
  </g>

  <!-- Transitions to Damaged States -->
  <path d="M 240 115 L 420 60" fill="none" stroke="#eab308" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="330" y="75" text-anchor="middle" font-size="9" font-weight="700" fill="#854d0e">Rider returns with 'Puncture'</text>

  <path d="M 240 165 L 420 220" fill="none" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="330" y="210" text-anchor="middle" font-size="9" font-weight="700" fill="#991b1b">Rider returns with 'Broken'</text>

  <!-- Puncture State (Yellow) -->
  <g transform="translate(420, 20)">
    <rect width="180" height="85" rx="10" fill="#fefce8" stroke="#eab308" stroke-width="2"/>
    <text x="90" y="34" text-anchor="middle" font-size="14" font-weight="800" fill="#854d0e">⚠️ PUNCTURE</text>
    <text x="90" y="54" text-anchor="middle" font-size="10" fill="#713f12">Flat tyre detected</text>
    <text x="90" y="70" text-anchor="middle" font-size="10" font-weight="600" fill="#dc2626">OUT OF SERVICE</text>
  </g>

  <!-- Broken State (Red) -->
  <g transform="translate(420, 180)">
    <rect width="180" height="85" rx="10" fill="#fef2f2" stroke="#ef4444" stroke-width="2"/>
    <text x="90" y="34" text-anchor="middle" font-size="14" font-weight="800" fill="#991b1b">❌ BROKEN</text>
    <text x="90" y="54" text-anchor="middle" font-size="10" fill="#7f1d1d">Mechanical failure</text>
    <text x="90" y="70" text-anchor="middle" font-size="10" font-weight="600" fill="#dc2626">OUT OF SERVICE</text>
  </g>

  <!-- Manager Repair Return Paths -->
  <path d="M 600 60 L 720 60 L 720 140 L 240 140" fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="4 3"/>
  <path d="M 600 220 L 720 220 L 720 140" fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="4 3"/>
  <rect x="650" y="125" width="140" height="30" rx="6" fill="#f0fdf4" stroke="#16a34a"/>
  <text x="720" y="144" text-anchor="middle" font-size="10" font-weight="700" fill="#15803d">Manager Repairs</text>
</svg>
```

---

## 6. Scan-to-Ride QR & Checkout Flow (`/#/cycle/<qr_code>`)

### 6.1 Scan-to-Ride 5-Gate Verification Flowchart

```xml
<svg viewBox="0 0 940 520" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;font-family:system-ui,-apple-system,sans-serif;">
  <rect width="940" height="520" fill="#f8fafc" rx="12" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- Start -->
  <g transform="translate(30, 230)">
    <rect width="130" height="50" rx="8" fill="#0d9488"/>
    <text x="65" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">CAMERA SCAN</text>
    <text x="65" y="38" text-anchor="middle" font-size="9" fill="#ccfbf1">/#/cycle/&lt;qr_code&gt;</text>
  </g>

  <!-- Gate 1: Rider Role -->
  <path d="M 160 255 L 200 255" fill="none" stroke="#64748b" stroke-width="2"/>
  <g transform="translate(200, 220)">
    <rect width="115" height="70" rx="6" fill="#ffffff" stroke="#6366f1" stroke-width="1.5"/>
    <text x="57" y="24" text-anchor="middle" font-size="10" font-weight="700" fill="#4338ca">GATE 1</text>
    <text x="57" y="42" text-anchor="middle" font-size="10" fill="#334155">Caller holds</text>
    <text x="57" y="56" text-anchor="middle" font-size="10" font-weight="600" fill="#4338ca">Rider Role?</text>
  </g>
  <path d="M 257 220 L 257 150 L 320 150" fill="none" stroke="#ef4444" stroke-width="1.5"/>
  <text x="325" y="153" font-size="9" fill="#dc2626">FAIL: Show Join Invitation Prompt</text>

  <!-- Gate 2: Home Stand Match -->
  <path d="M 315 255 L 350 255" fill="none" stroke="#64748b" stroke-width="2"/>
  <g transform="translate(350, 220)">
    <rect width="115" height="70" rx="6" fill="#ffffff" stroke="#6366f1" stroke-width="1.5"/>
    <text x="57" y="24" text-anchor="middle" font-size="10" font-weight="700" fill="#4338ca">GATE 2</text>
    <text x="57" y="42" text-anchor="middle" font-size="10" fill="#334155">Belongs to</text>
    <text x="57" y="56" text-anchor="middle" font-size="10" font-weight="600" fill="#4338ca">Home Stand?</text>
  </g>
  <path d="M 407 220 L 407 110 L 470 110" fill="none" stroke="#ef4444" stroke-width="1.5"/>
  <text x="475" y="113" font-size="9" fill="#dc2626">FAIL: "Cycle belongs to different stand"</text>

  <!-- Gate 3: Working Condition -->
  <path d="M 465 255 L 500 255" fill="none" stroke="#64748b" stroke-width="2"/>
  <g transform="translate(500, 220)">
    <rect width="115" height="70" rx="6" fill="#ffffff" stroke="#6366f1" stroke-width="1.5"/>
    <text x="57" y="24" text-anchor="middle" font-size="10" font-weight="700" fill="#4338ca">GATE 3</text>
    <text x="57" y="42" text-anchor="middle" font-size="10" fill="#334155">Status ==</text>
    <text x="57" y="56" text-anchor="middle" font-size="10" font-weight="600" fill="#15803d">'Working'?</text>
  </g>
  <path d="M 557 220 L 557 70 L 620 70" fill="none" stroke="#ef4444" stroke-width="1.5"/>
  <text x="625" y="73" font-size="9" fill="#dc2626">FAIL: "Cycle out of service (Puncture/Broken)"</text>

  <!-- Gate 4: Not In Use by Other -->
  <path d="M 615 255 L 650 255" fill="none" stroke="#64748b" stroke-width="2"/>
  <g transform="translate(650, 220)">
    <rect width="115" height="70" rx="6" fill="#ffffff" stroke="#6366f1" stroke-width="1.5"/>
    <text x="57" y="24" text-anchor="middle" font-size="10" font-weight="700" fill="#4338ca">GATE 4</text>
    <text x="57" y="42" text-anchor="middle" font-size="10" fill="#334155">Cycle Not in</text>
    <text x="57" y="56" text-anchor="middle" font-size="10" font-weight="600" fill="#4338ca">Active Use?</text>
  </g>
  <path d="M 707 220 L 707 30 L 770 30" fill="none" stroke="#ef4444" stroke-width="1.5"/>
  <text x="775" y="33" font-size="9" fill="#dc2626">FAIL: "In use by another resident"</text>

  <!-- Gate 5: Caller Zero Active Rides -->
  <path d="M 765 255 L 800 255" fill="none" stroke="#64748b" stroke-width="2"/>
  <g transform="translate(800, 220)">
    <rect width="115" height="70" rx="6" fill="#ffffff" stroke="#6366f1" stroke-width="1.5"/>
    <text x="57" y="24" text-anchor="middle" font-size="10" font-weight="700" fill="#4338ca">GATE 5</text>
    <text x="57" y="42" text-anchor="middle" font-size="10" fill="#334155">Caller Has 0</text>
    <text x="57" y="56" text-anchor="middle" font-size="10" font-weight="600" fill="#4338ca">Active Rides?</text>
  </g>
  <path d="M 857 290 L 857 360 L 700 360" fill="none" stroke="#ef4444" stroke-width="1.5"/>
  <text x="500" y="364" font-size="9" fill="#dc2626">FAIL: "You already have an active checkout (Limit 1)"</text>

  <!-- All Gates Pass -> Unlocked Session -->
  <path d="M 857 220 L 857 190 L 920 190" fill="none" stroke="#16a34a" stroke-width="2"/>
  
  <g transform="translate(480, 410)">
    <rect width="430" height="90" rx="10" fill="#f0fdf4" stroke="#22c55e" stroke-width="2.5"/>
    <text x="215" y="28" text-anchor="middle" font-size="13" font-weight="800" fill="#15803d">✓ ALL 5 GATES PASSED: CYCLE UNLOCKED</text>
    <text x="215" y="50" text-anchor="middle" font-size="10" fill="#166534">1. POST /api/cycles/{id}/checkout creates cycle_checkouts record</text>
    <text x="215" y="68" text-anchor="middle" font-size="11" font-weight="700" fill="#15803d">2. Reveals Combination Lock Code: 🔒 [lock_code]</text>
  </g>
  <path d="M 857 220 L 857 180 L 920 180 L 920 455 L 910 455" fill="none" stroke="#16a34a" stroke-width="2"/>
</svg>
```

---

## 7. Cycle Return & Damage Reporting Flow

### 7.1 Condition Reporting Flowchart

```xml
<svg viewBox="0 0 940 420" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;font-family:system-ui,-apple-system,sans-serif;">
  <rect width="940" height="420" fill="#f8fafc" rx="12" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- Return Button Trigger -->
  <g transform="translate(30, 160)">
    <rect width="180" height="60" rx="8" fill="#16a34a"/>
    <text x="90" y="28" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">CLICK "RETURN CYCLE"</text>
    <text x="90" y="46" text-anchor="middle" font-size="10" fill="#dcfce7">Workspace or QR Portal</text>
  </g>

  <!-- Modal Dialog -->
  <path d="M 210 190 L 270 190" fill="none" stroke="#64748b" stroke-width="2"/>

  <g transform="translate(270, 100)">
    <rect width="250" height="180" rx="10" fill="#ffffff" stroke="#6366f1" stroke-width="2"/>
    <text x="125" y="28" text-anchor="middle" font-size="12" font-weight="800" fill="#4338ca">ReturnCycleModal</text>
    
    <rect x="20" y="45" width="210" height="30" rx="4" fill="#f0fdf4" stroke="#22c55e"/>
    <text x="125" y="64" text-anchor="middle" font-size="10" font-weight="700" fill="#15803d">● Working (Good Condition)</text>
    
    <rect x="20" y="82" width="210" height="30" rx="4" fill="#fefce8" stroke="#eab308"/>
    <text x="125" y="101" text-anchor="middle" font-size="10" font-weight="700" fill="#854d0e">● Puncture (Flat Tyre)</text>
    
    <rect x="20" y="119" width="210" height="30" rx="4" fill="#fef2f2" stroke="#ef4444"/>
    <text x="125" y="138" text-anchor="middle" font-size="10" font-weight="700" fill="#991b1b">● Broken (Mechanical Damage)</text>

    <text x="125" y="165" text-anchor="middle" font-size="9" fill="#64748b">+ Optional Damage Notes</text>
  </g>

  <!-- Branching Backend Actions -->
  <path d="M 520 190 L 590 190" fill="none" stroke="#64748b" stroke-width="2"/>

  <g transform="translate(590, 60)">
    <rect width="310" height="110" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
    <text x="155" y="26" text-anchor="middle" font-size="12" font-weight="700" fill="#15803d">Condition: 'Working'</text>
    <text x="20" y="52" font-size="10" fill="#166534">• cycle_checkouts: status='returned'</text>
    <text x="20" y="70" font-size="10" fill="#166534">• returned_at = datetime('now')</text>
    <text x="20" y="88" font-size="10" font-weight="700" fill="#15803d">• Cycle remains available for next rider</text>
  </g>

  <g transform="translate(590, 220)">
    <rect width="310" height="140" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
    <text x="155" y="26" text-anchor="middle" font-size="12" font-weight="700" fill="#991b1b">Condition: 'Puncture' / 'Broken'</text>
    <text x="20" y="52" font-size="10" fill="#991b1b">• cycle_checkouts: return_condition &amp; notes logged</text>
    <text x="20" y="70" font-size="10" fill="#991b1b">• UPDATE cycles SET status = [Puncture|Broken]</text>
    <text x="20" y="88" font-size="10" font-weight="700" fill="#dc2626">• AUTOMATICALLY TAKEN OUT OF SERVICE</text>
    <text x="20" y="106" font-size="10" fill="#475569">• Barred from checkouts by other riders</text>
    <text x="20" y="124" font-size="10" fill="#475569">• Manager alerted with damaged badge</text>
  </g>
</svg>
```

### 7.2 Post-Return Verification Summary

| Checkpoint | Working Return | Puncture / Broken Return |
| :--- | :--- | :--- |
| `cycle_checkouts.status` | Set to `'returned'` | Set to `'returned'` |
| `cycle_checkouts.return_condition` | `'Working'` | `'Puncture'` or `'Broken'` |
| `cycle_checkouts.return_notes` | Null or optional note | Problem description saved |
| `cycles.status` | Unchanged (`'Working'`) | Updated immediately to `'Puncture'` or `'Broken'` |
| Next Rider Availability | Available immediately | **Blocked** (Gate 3 rejects checkout) |
| Manager Workspace Action | None required | Status badge alerts manager to repair cycle |
