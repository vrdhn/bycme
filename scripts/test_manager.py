#!/usr/bin/env python3
"""Parking Manager positive and negative test cases."""

import sys
from api_client import BycmeClient


def run_manager_tests(base_url: str = "") -> bool:
    """Execute manager role test matrix."""
    client = BycmeClient(base_url)
    all_passed = True

    def assert_test(name: str, passed: bool, detail: str = ""):
        nonlocal all_passed
        if not passed:
            all_passed = False
            print(f"  [FAIL] {name}: {detail}")
        else:
            print(f"  [PASS] {name}")

    print("=== Parking Manager Test Suite ===")

    # Negative: Manager login invalid password
    res = client.login("anita@bycme.in", "WrongPassword999")
    assert_test("Manager Login Invalid Credentials (401)", res.status == 401)

    # Positive: Manager login valid credentials
    res = client.login("anita@bycme.in", "Admin@Bycme2026")
    assert_test("Manager Login Valid Credentials (200 OK)", res.status == 200 and "token" in res.data)

    # Positive: Read managed parkings
    res = client.get("/api/me/parkings")
    assert_test("Read Managed Parkings (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Read fleet cycles at managed stand
    # Anita manages prk-gw-gate1
    res = client.get("/api/parkings/prk-gw-gate1/cycles")
    assert_test("Read Fleet Cycles at Managed Stand (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Read rider invitations at managed stand
    res = client.get("/api/parkings/prk-gw-gate1/rider-invitations")
    assert_test("Read Rider Invitations at Managed Stand (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Read rider requests at managed stand
    res = client.get("/api/me/parkings/prk-gw-gate1/rider-requests")
    assert_test("Read Pending Rider Requests (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Read registered riders at managed stand
    res = client.get("/api/me/parkings/prk-gw-gate1/riders")
    assert_test("Read Registered Riders (200 OK)", res.status == 200 and isinstance(res.data, list))

    # Positive: Create rider invitation for managed stand
    res = client.post("/api/parkings/prk-gw-gate1/rider-invitations", {"isPreapproved": True, "validHours": 24})
    created_invite_id = None
    if res.status == 201:
        created_invite_id = res.data.get("id")
    assert_test("Create Rider Invitation for Managed Stand (201 Created)", res.status == 201)

    # Positive: Revoke created rider invitation
    if created_invite_id:
        res = client.post(f"/api/parkings/prk-gw-gate1/rider-invitations/{created_invite_id}/revoke")
        assert_test("Revoke Rider Invitation (200 OK)", res.status == 200)

    # Negative: Manager attempting Admin scope endpoint (RBAC boundary check)
    res = client.get("/api/admin/manager-requests")
    assert_test(
        "Manager Blocked From Admin Requests Scope (403)",
        res.status == 403,
        f"Got status {res.status}",
    )

    # Negative: Manager attempting to create manager invitation (RBAC boundary check)
    res = client.post("/api/parkings/prk-gw-gate1/manager-invitations", {"isPreapproved": True, "validHours": 24})
    assert_test(
        "Manager Blocked From Creating Manager Invitations (403)",
        res.status == 403,
        f"Got status {res.status}",
    )

    # Negative: Manager creating rider invitation for UNASSIGNED stand
    # Anita does NOT manage prk-palm-east
    res = client.post("/api/parkings/prk-palm-east/rider-invitations", {"isPreapproved": True, "validHours": 24})
    assert_test(
        "Manager Blocked From Generating Invites for Unmanaged Stand (403)",
        res.status == 403,
        f"Got status {res.status}",
    )

    # Negative: Register cycle with duplicate lock code in same parking stand (feat013)
    res = client.post(
        "/api/parkings/prk-gw-gate1/cycles",
        {
            "brand": "Btwin",
            "cycleModel": "Riverside 500",
            "colour": "Navy Blue",
            "status": "Working",
            "lockCode": "4521",
        },
    )
    assert_test(
        "Duplicate Lock Code on Cycle Registration Blocked (400)",
        res.status == 400 and "already in use" in str(res.data.get("error", "")).lower(),
        f"Got status {res.status}: {res.data}",
    )

    # Negative: Update cycle to duplicate another cycle's lock code in same parking stand (feat013)
    res = client.put(
        "/api/cycles/cyc-sample-002",
        {
            "lockCode": "4521",
        },
    )
    assert_test(
        "Duplicate Lock Code on Cycle Update Blocked (400)",
        res.status == 400 and "already in use" in str(res.data.get("error", "")).lower(),
        f"Got status {res.status}: {res.data}",
    )

    return all_passed


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    success = run_manager_tests(url)
    sys.exit(0 if success else 1)
