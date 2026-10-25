#!/usr/bin/env python3
"""System Administrator positive and negative test cases."""

import sys
from api_client import BycmeClient


def run_admin_tests(base_url: str = "") -> bool:
    """Execute admin role test matrix."""
    client = BycmeClient(base_url)
    all_passed = True

    def assert_test(name: str, passed: bool, detail: str = ""):
        nonlocal all_passed
        if not passed:
            all_passed = False
            print(f"  [FAIL] {name}: {detail}")
        else:
            print(f"  [PASS] {name}")

    print("=== System Administrator Test Suite ===")

    # Positive: Health check
    res = client.get("/api/health")
    assert_test("Health Check (200 OK)", res.status == 200 and res.data.get("status") == "healthy")

    # Negative: Admin login invalid password (feat002)
    res = client.login("admin@bycme.in", "WrongPassword123")
    assert_test("Admin Login Invalid Credentials (401)", res.status == 401)

    # Negative: Login with missing fields (feat002)
    anon_client = BycmeClient(base_url)
    res = anon_client.post("/api/auth/login", {})
    assert_test("Login Missing Fields Blocked (400)", res.status == 400)

    # Negative: Unauthenticated read of persons directory (fix001 / feat002)
    res = anon_client.get("/api/persons")
    assert_test("Unauthenticated Persons Directory Blocked (401)", res.status == 401)

    # Negative: Unauthenticated profile read (fix001 / feat002)
    res = anon_client.get("/api/auth/me")
    assert_test("Unauthenticated Auth Me Blocked (401)", res.status == 401)

    # Negative: Invalid token profile read (fix001 / feat002)
    res = anon_client.get("/api/auth/me", token="invalid-token-value")
    assert_test("Invalid Token Auth Me Blocked (401)", res.status == 401)

    # Positive: Admin login valid credentials (feat002)
    res = client.login("admin@bycme.in", "Admin@Bycme2026")
    assert_test("Admin Login Valid Credentials (200 OK)", res.status == 200 and "token" in res.data)

    # Positive: Authenticated read of own profile (feat002)
    res = client.get("/api/auth/me")
    assert_test(
        "Read Authenticated Profile (200 OK)",
        res.status == 200 and res.data.get("email") == "admin@bycme.in" and "Admin" in res.data.get("roles", []),
    )

    # Positive: Read persons directory (feat002)
    res = client.get("/api/persons")
    assert_test("Read Persons Directory (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Read cities list
    res = client.get("/api/cities")
    assert_test("Read Cities List (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Read buildings list
    res = client.get("/api/buildings")
    assert_test("Read Buildings List (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Read parkings list
    res = client.get("/api/parkings")
    assert_test("Read Parkings List (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Read pending manager requests
    res = client.get("/api/admin/manager-requests")
    assert_test("Read Manager Requests (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Read invitations
    res = client.get("/api/admin/invitations")
    assert_test("Read Admin Invitations (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Negative: Create manager invitation for PUBLIC facility (Guardrail check)
    # prk-tm-tower-a belongs to bld-tech-park (Public)
    res = client.post("/api/parkings/prk-tm-tower-a/manager-invitations", {"isPreapproved": True, "validHours": 24})
    assert_test(
        "Manager Invitation on Public Facility Blocked (400)",
        res.status == 400 and "private" in str(res.data.get("error", "")).lower(),
        f"Got status {res.status}: {res.data}",
    )

    # Positive: Create manager invitation for PRIVATE residential facility
    # prk-gw-gate1 belongs to bld-greenwood-res (Private)
    res = client.post("/api/parkings/prk-gw-gate1/manager-invitations", {"isPreapproved": False, "validHours": 12})
    created_inv_id = None
    if res.status == 201:
        created_inv_id = res.data.get("id")
    assert_test("Create Manager Invitation for Private Facility (201 Created)", res.status == 201)

    # Positive: Revoke created invitation
    if created_inv_id:
        res = client.post(f"/api/admin/invitations/{created_inv_id}/revoke")
        assert_test("Revoke Manager Invitation (200 OK)", res.status == 200)

    # Negative: Revoke non-existent invitation (404)
    res = client.post("/api/admin/invitations/non-existent-inv-id/revoke")
    assert_test("Revoke Invalid Invitation (404 Not Found)", res.status == 404)

    # Positive: Admin updates person details (feat012)
    res = client.put(
        "/api/persons/rdr-001",
        {
            "comments": "VIP resident commuter",
            "mobile": "+91 98111 22334",
            "emergencyContact": {
                "name": "Ramesh Sharma",
                "phone1": "+91 98111 99887",
            },
        },
    )
    assert_test(
        "Admin Update Person Profile (200 OK)",
        res.status == 200 and res.data.get("comments") == "VIP resident commuter",
        f"Got status {res.status}: {res.data}",
    )

    return all_passed


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    success = run_admin_tests(url)
    sys.exit(0 if success else 1)
