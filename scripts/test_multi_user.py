#!/usr/bin/env python3
"""Multi-user end-to-end simulation and test runner for Bycme platform."""

import sys
import time
from api_client import BycmeClient
from test_admin import run_admin_tests
from test_manager import run_manager_tests
from test_rider import run_rider_tests


def run_cross_user_workflow(base_url: str = "") -> bool:
    """Execute multi-user cross-actor workflow scenario."""
    print("\n=== Multi-User Cross-Actor Workflow Scenario ===")
    all_passed = True

    def assert_test(name: str, passed: bool, detail: str = ""):
        nonlocal all_passed
        if not passed:
            all_passed = False
            print(f"  [FAIL] {name}: {detail}")
        else:
            print(f"  [PASS] {name}")

    admin = BycmeClient(base_url)
    mgr_anita = BycmeClient(base_url)
    rdr_kavita = BycmeClient(base_url)
    rdr_rahim = BycmeClient(base_url)
    visitor = BycmeClient(base_url)

    # 1. Authenticate users
    admin.login("admin@bycme.in", "Admin@Bycme2026")
    mgr_anita.login("anita@bycme.in", "Admin@Bycme2026")
    rdr_kavita.login("kavita@bycme.in", "Admin@Bycme2026")
    rdr_rahim.login("rahim@bycme.in", "Admin@Bycme2026")

    # 2. Manager Anita generates a pre-approved Rider Invitation for Gate 1 Stand
    res = mgr_anita.post("/api/parkings/prk-gw-gate1/rider-invitations", {"isPreapproved": True, "validHours": 24})
    assert_test("Manager Anita Creates Preapproved Rider Invite", res.status == 201)
    invite_token = res.data.get("token") if res.status == 201 else None

    if invite_token:
        # 3. Anonymous visitor views invitation details publicly
        res = visitor.get(f"/api/invitations/{invite_token}")
        assert_test(
            "Anonymous Visitor Inspects Rider Invite Publicly",
            res.status == 200 and res.data.get("role") == "Rider",
        )

        # 4. Rider Kavita (already at Gate 1) attempts to claim invite
        res = rdr_kavita.post(f"/api/invitations/{invite_token}/respond")
        assert_test(
            "Rider Kavita Gets 'Already Registered' Idempotency",
            res.status == 200 and res.data.get("action") == "already_exists",
        )

        # 5. Rider Rahim (registered at Clubhouse) views/responds without switch confirmation
        res = rdr_rahim.post(f"/api/invitations/{invite_token}/respond", {"confirmSwitch": False})
        assert_test(
            "Rider Rahim Warned to Confirm Shed Switch",
            res.status == 200 and res.data.get("action") == "switch_required",
        )

        # 6. Revoke invitation to clean up state
        inv_id = res.data.get("id") or ""
        # Fetch invitation id from manager invitations list
        inv_list = mgr_anita.get("/api/parkings/prk-gw-gate1/rider-invitations")
        if inv_list.ok and isinstance(inv_list.data, list):
            for inv in inv_list.data:
                if inv.get("token") == invite_token:
                    mgr_anita.post(f"/api/parkings/prk-gw-gate1/rider-invitations/{inv.get('id')}/revoke")
                    break

    return all_passed


def main() -> int:
    """Run complete test suite across all personas."""
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    target_display = url or "https://bycme-staging.bycme-backend.workers.dev"
    print(f"Target Environment: {target_display}\n")

    start_time = time.time()
    results = {}

    results["admin"] = run_admin_tests(url)
    results["manager"] = run_manager_tests(url)
    results["rider"] = run_rider_tests(url)
    results["cross_user"] = run_cross_user_workflow(url)

    elapsed = round(time.time() - start_time, 2)
    print("\n" + "=" * 50)
    print("Test Suite Execution Summary")
    print("=" * 50)
    print(f"System Administrator Suite:     {'PASS' if results['admin'] else 'FAIL'}")
    print(f"Parking Manager Suite:          {'PASS' if results['manager'] else 'FAIL'}")
    print(f"Resident Rider & 5-Gate Suite:  {'PASS' if results['rider'] else 'FAIL'}")
    print(f"Multi-User Cross-Actor Suite:   {'PASS' if results['cross_user'] else 'FAIL'}")
    print(f"Execution Duration:             {elapsed} seconds")
    print("=" * 50)

    overall_pass = all(results.values())
    return 0 if overall_pass else 1


if __name__ == "__main__":
    sys.exit(main())
