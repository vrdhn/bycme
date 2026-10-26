#!/usr/bin/env python3
"""Password reset test cases covering Admin and Manager permission boundaries."""

import sys
from api_client import BycmeClient


def run_password_reset_tests(base_url: str = "") -> bool:
    """Execute password reset test matrix."""
    admin_client = BycmeClient(base_url)
    anita_client = BycmeClient(base_url)
    rider_client = BycmeClient(base_url)
    anon_client = BycmeClient(base_url)
    all_passed = True

    def assert_test(name: str, passed: bool, detail: str = ""):
        nonlocal all_passed
        if not passed:
            all_passed = False
            print(f"  [FAIL] {name}: {detail}")
        else:
            print(f"  [PASS] {name}")

    print("=== Password Reset Test Suite ===")

    # 1. Unauthenticated reset generation blocked
    res = anon_client.post("/api/persons/rdr-001/password-reset", {})
    assert_test("Unauthenticated Reset Token Request Blocked (401)", res.status == 401)

    # 2. Login actors
    res_admin = admin_client.login("admin@bycme.in", "Admin@Bycme2026")
    assert_test("Admin Login (200 OK)", res_admin.status == 200)

    res_anita = anita_client.login("anita@bycme.in", "Admin@Bycme2026")
    assert_test("Manager (Anita) Login (200 OK)", res_anita.status == 200)

    res_rider = rider_client.login("kavita@bycme.in", "Admin@Bycme2026")
    assert_test("Rider (Kavita) Login (200 OK)", res_rider.status == 200)

    # 3. Rider cannot generate reset links (403 Forbidden)
    res = rider_client.post("/api/persons/rdr-001/password-reset", {})
    assert_test("Rider Cannot Generate Reset Link (403)", res.status == 403)

    # 4. Manager cannot reset password for rider outside their managed parking (403 Forbidden)
    # Rahim (rdr-002) belongs to Gate 2 (prk-gw-gate2), which Anita does not manage
    res = anita_client.post("/api/persons/rdr-002/password-reset", {})
    assert_test("Manager Blocked from Resetting Non-Managed Hub Rider (403)", res.status == 403)

    # 5. Manager can generate reset link for rider in their managed hub (200 OK)
    # Kavita (rdr-001) belongs to Gate 1 (prk-gw-gate1), managed by Anita
    res = anita_client.post("/api/persons/rdr-001/password-reset", {})
    assert_test(
        "Manager Generates Reset Link for Hub Rider (200 OK)",
        res.status == 200 and "token" in res.data and "whatsappUrl" in res.data and "wa.me" in res.data.get("whatsappUrl", ""),
        f"status: {res.status}, data: {res.data}"
    )

    # 6. Admin can generate reset link for any person (200 OK)
    # Admin resets Rahim (rdr-002)
    res = admin_client.post("/api/persons/rdr-002/password-reset", {})
    admin_reset_token = res.data.get("token") if res.status == 200 else None
    assert_test(
        "Admin Generates Reset Link for Any Person (200 OK)",
        res.status == 200 and admin_reset_token is not None and "whatsappUrl" in res.data,
        f"status: {res.status}, data: {res.data}"
    )

    # 7. Public token verification
    # Invalid token check (404)
    res = anon_client.get("/api/auth/reset-password/nonExistentToken999")
    assert_test("Invalid Reset Token Verification Rejected (404)", res.status == 404)

    # Valid token check (200 OK)
    if admin_reset_token:
        res = anon_client.get(f"/api/auth/reset-password/{admin_reset_token}")
        assert_test(
            "Valid Reset Token Verification (200 OK)",
            res.status == 200 and res.data.get("valid") is True and res.data.get("personEmail") == "rahim@bycme.in",
            f"status: {res.status}, data: {res.data}"
        )

    # 8. Password reset execution
    # Missing fields (400)
    res = anon_client.post("/api/auth/reset-password", {})
    assert_test("Password Reset Missing Fields Blocked (400)", res.status == 400)

    # Short password (400)
    res = anon_client.post("/api/auth/reset-password", {"token": admin_reset_token or "", "password": "123"})
    assert_test("Password Reset Too Short Blocked (400)", res.status == 400)

    # Successful password reset
    new_pwd = "RahimNewPassword@2026"
    res = anon_client.post("/api/auth/reset-password", {"token": admin_reset_token or "", "password": new_pwd})
    assert_test(
        "Execute Password Reset Successfully (200 OK)",
        res.status == 200 and res.data.get("success") is True,
        f"status: {res.status}, data: {res.data}"
    )

    # Reusing already consumed token (400)
    res = anon_client.post("/api/auth/reset-password", {"token": admin_reset_token or "", "password": "AnotherPassword@2026"})
    assert_test("Reuse of Consumed Reset Token Blocked (400)", res.status == 400)

    # Verify Rahim can log in with new password
    rahim_client = BycmeClient(base_url)
    res = rahim_client.login("rahim@bycme.in", new_pwd)
    assert_test("Login with New Reset Password (200 OK)", res.status == 200 and "token" in res.data)

    # Verify Rahim cannot log in with old password
    res_old = rahim_client.login("rahim@bycme.in", "Admin@Bycme2026")
    assert_test("Login with Previous Old Password Rejected (401)", res_old.status == 401)

    # Restore Rahim's password back to Admin@Bycme2026 for idempotent test runs
    res_token2 = admin_client.post("/api/persons/rdr-002/password-reset", {})
    if res_token2.status == 200:
        t2 = res_token2.data.get("token")
        anon_client.post("/api/auth/reset-password", {"token": t2, "password": "Admin@Bycme2026"})

    return all_passed


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    success = run_password_reset_tests(url)
    sys.exit(0 if success else 1)
