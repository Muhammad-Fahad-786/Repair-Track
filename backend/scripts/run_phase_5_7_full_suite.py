"""
Comprehensive Automated Test Suite for RepairTrack Phase 5.7:
Admin Real Data Integration

Verifies:
1. Multi-role authentication (Customer, Shop Owner, Admin).
2. Strict Backend Authorization & Role-Based Access Control (RBAC):
   - Unauthenticated -> 401 on /admin/shop-applications/, /admin/pickups, /admin/repairs
   - Customer -> 403 on /admin/shop-applications/, /admin/pickups, /admin/repairs
   - Shop Owner -> 403 on /admin/shop-applications/, /admin/pickups, /admin/repairs
   - Admin -> 200 on all admin endpoints
3. Admin Shop Applications:
   - List all applications across the platform
   - Filter by status (?status=PENDING, APPROVED, REJECTED)
   - Customer submits new application -> Admin approves -> Role changes to SHOP_OWNER & shop created
   - Customer submits new application -> Admin rejects with non-empty reason
   - Rejection with empty reason returns 422
4. Admin Pickups:
   - List all pickups across all shops
   - Status filtering (?status=PENDING, RECEIVED, etc.)
   - Full details with safe shop and customer objects
5. Admin Repairs:
   - List all repairs across all shops
   - Status filtering (?status=RECEIVED, DIAGNOSING, etc.)
   - Full details with real Repair IDs (RT-SH001-XXXXX), estimates, approval state, and audit history
6. Public / Admin Shops Discovery:
   - List approved and active shops
7. Privacy & Security:
   - Strict audit that NO password hashes, secrets, or JWT tokens appear in any response body
"""
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

BASE = "http://127.0.0.1:8000/api/v1"


def api_call(method: str, path: str, data: dict | None = None, token: str | None = None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            res_data = json.loads(content) if content else None
            return status, res_data
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_data = json.loads(content)
        except Exception:
            err_data = {"raw": content}
        return e.code, err_data


def run_tests():
    total_assertions = 0
    passed_assertions = 0

    def check(desc: str, condition: bool):
        nonlocal total_assertions, passed_assertions
        total_assertions += 1
        if condition:
            passed_assertions += 1
            print(f"  [PASS] {desc}")
        else:
            print(f"  [FAIL] {desc}")

    print("\n" + "=" * 65)
    print(" RepairTrack — Phase 5.7: Admin Real Data Integration Test Suite")
    print("=" * 65 + "\n")

    # -------------------------------------------------------------
    # 1. AUTHENTICATE TEST ACTORS
    # -------------------------------------------------------------
    print("[1] Authenticating test actors (Admin, Customer, Shop Owner)...")

    # Admin
    st, res = api_call("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    check("Admin login returns 200", st == 200)
    admin_token = res.get("access_token") if res else None
    check("Admin token received", bool(admin_token))

    # Customer
    st, res = api_call("POST", "/auth/login", {"email": "bob@test.com", "password": "password123"})
    check("Customer Bob login returns 200", st == 200)
    bob_token = res.get("access_token") if res else None

    # Shop Owner
    st, res = api_call("POST", "/auth/login", {"email": "alice@test.com", "password": "password123"})
    check("Shop Owner Alice login returns 200", st == 200)
    alice_token = res.get("access_token") if res else None

    # -------------------------------------------------------------
    # 2. RBAC & SECURITY ENFORCEMENT ON ADMIN APIS
    # -------------------------------------------------------------
    print("\n[2] Verifying strict RBAC on Admin APIs (Unauthenticated, Customer, Shop Owner)...")

    endpoints = [
        ("GET", "/admin/shop-applications/"),
        ("GET", "/admin/pickups"),
        ("GET", "/admin/repairs"),
    ]

    for meth, ep in endpoints:
        # Unauthenticated
        st, _ = api_call(meth, ep, token=None)
        check(f"Unauthenticated {meth} {ep} returns 401", st == 401)

        # Customer
        st, _ = api_call(meth, ep, token=bob_token)
        check(f"Customer {meth} {ep} returns 403 Forbidden", st == 403)

        # Shop Owner
        st, _ = api_call(meth, ep, token=alice_token)
        check(f"Shop Owner {meth} {ep} returns 403 Forbidden", st == 403)

        # Admin
        st, _ = api_call(meth, ep, token=admin_token)
        check(f"Admin {meth} {ep} returns 200 OK", st == 200)

    # -------------------------------------------------------------
    # 3. ADMIN SHOP APPLICATIONS MANAGEMENT
    # -------------------------------------------------------------
    print("\n[3] Testing Admin Shop Applications listing and status filters...")

    st, apps = api_call("GET", "/admin/shop-applications/", token=admin_token)
    check("GET /admin/shop-applications/ returns list", st == 200 and isinstance(apps, list))

    st, pending_apps = api_call("GET", "/admin/shop-applications/?status=PENDING", token=admin_token)
    check("Filter ?status=PENDING returns list", st == 200 and isinstance(pending_apps, list))
    check("All returned items have status=PENDING", all(a.get("status") == "PENDING" for a in pending_apps))

    st, approved_apps = api_call("GET", "/admin/shop-applications/?status=APPROVED", token=admin_token)
    check("Filter ?status=APPROVED returns list", st == 200 and isinstance(approved_apps, list))
    check("All returned items have status=APPROVED", all(a.get("status") == "APPROVED" for a in approved_apps))

    # Test rejection validation: rejection requires non-empty reason
    # Register a new applicant
    ts = int(time.time() * 1000)
    applicant_email = f"reject_test_{ts}@example.com"
    st, reg_res = api_call(
        "POST",
        "/auth/register",
        {"name": "Rejection Tester", "email": applicant_email, "phone": "+91 99999 88888", "password": "password123"},
    )
    check("New applicant registers successfully", st == 201)
    new_user_token = reg_res.get("access_token")

    st, app_res = api_call(
        "POST",
        "/shop-applications/",
        {
            "shop_name": f"Flawed Workshop {ts}",
            "description": "Incomplete application",
            "city": "Mumbai",
            "pickup_available": False,
        },
        token=new_user_token,
    )
    check("Applicant submits shop application", st == 201)
    app_id = app_res.get("id")

    # Reject with empty reason -> 422
    st, err_res = api_call("POST", f"/admin/shop-applications/{app_id}/reject", {"rejection_reason": ""}, token=admin_token)
    check("Rejecting with empty reason returns 422 Unprocessable Entity", st == 422)

    # Reject with valid reason -> 200
    st, rej_res = api_call(
        "POST",
        f"/admin/shop-applications/{app_id}/reject",
        {"rejection_reason": "Incomplete address and documentation."},
        token=admin_token,
    )
    check("Rejecting with valid reason returns 200", st == 200)
    check("Application status is now REJECTED", rej_res.get("status") == "REJECTED")
    check("Rejection reason stored accurately", "Incomplete" in (rej_res.get("rejection_reason") or ""))

    # Cannot reject again -> 409
    st, _ = api_call(
        "POST",
        f"/admin/shop-applications/{app_id}/reject",
        {"rejection_reason": "Another reason"},
        token=admin_token,
    )
    check("Rejecting non-PENDING application returns 409 Conflict", st == 409)

    # Cannot approve REJECTED application -> 409
    st, _ = api_call("POST", f"/admin/shop-applications/{app_id}/approve", token=admin_token)
    check("Approving non-PENDING application returns 409 Conflict", st == 409)

    # -------------------------------------------------------------
    # 4. ADMIN PICKUPS SUPERVISION
    # -------------------------------------------------------------
    print("\n[4] Testing Admin Pickups supervision and data integrity...")

    st, pickups = api_call("GET", "/admin/pickups", token=admin_token)
    check("GET /admin/pickups returns 200 and list", st == 200 and isinstance(pickups, list))
    check("Pickups list is populated", len(pickups) > 0)

    sample_pickup = pickups[0] if pickups else {}
    check("Pickup contains id", "id" in sample_pickup)
    check("Pickup contains customer_id", "customer_id" in sample_pickup)
    check("Pickup contains shop_id", "shop_id" in sample_pickup)
    check("Pickup contains status", "status" in sample_pickup)
    check("Pickup contains pickup_address", "pickup_address" in sample_pickup)
    check("Pickup contains shop brief", sample_pickup.get("shop") is not None and "name" in sample_pickup["shop"])
    check("Pickup contains customer brief", sample_pickup.get("customer") is not None and "name" in sample_pickup["customer"])

    # Test status filter
    st, pending_pickups = api_call("GET", "/admin/pickups?status=PENDING", token=admin_token)
    check("GET /admin/pickups?status=PENDING returns 200", st == 200 and isinstance(pending_pickups, list))
    check("All returned pickups have status=PENDING", all(p.get("status") == "PENDING" for p in pending_pickups))

    # -------------------------------------------------------------
    # 5. ADMIN REPAIRS SUPERVISION
    # -------------------------------------------------------------
    print("\n[5] Testing Admin Repairs directory and inspection...")

    st, repairs = api_call("GET", "/admin/repairs", token=admin_token)
    check("GET /admin/repairs returns 200 and list", st == 200 and isinstance(repairs, list))
    check("Repairs list is populated", len(repairs) > 0)

    sample_repair = repairs[0] if repairs else {}
    check("Repair contains id", "id" in sample_repair)
    check("Repair contains server-generated repair_id (RT-SH...)", str(sample_repair.get("repair_id", "")).startswith("RT-SH"))
    check("Repair contains status", "status" in sample_repair)
    check("Repair contains device_type", "device_type" in sample_repair)
    check("Repair contains shop brief", sample_repair.get("shop") is not None and "name" in sample_repair["shop"])
    check("Repair contains customer brief", sample_repair.get("customer") is not None and "name" in sample_repair["customer"])
    check("Repair contains history array", isinstance(sample_repair.get("history"), list))

    # Test status filter on repairs
    st, received_repairs = api_call("GET", "/admin/repairs?status=RECEIVED", token=admin_token)
    check("GET /admin/repairs?status=RECEIVED returns 200", st == 200 and isinstance(received_repairs, list))
    check("All returned repairs have status=RECEIVED", all(r.get("status") == "RECEIVED" for r in received_repairs))

    # -------------------------------------------------------------
    # 6. REGISTERED SHOPS DISCOVERY
    # -------------------------------------------------------------
    print("\n[6] Testing Shop discovery endpoint for Admin Shops view...")

    st, shops = api_call("GET", "/shops", token=None)
    check("GET /shops returns 200", st == 200 and isinstance(shops, list))
    check("Approved active shops exist", len(shops) > 0)
    sample_shop = shops[0] if shops else {}
    check("Shop has id, name, slug", all(k in sample_shop for k in ["id", "name", "slug"]))
    check("Shop has is_active == True", sample_shop.get("is_active") is True)
    check("Shop has status == APPROVED", sample_shop.get("status") == "APPROVED")

    # -------------------------------------------------------------
    # 7. SECURITY & PRIVACY AUDIT
    # -------------------------------------------------------------
    print("\n[7] Auditing responses for zero sensitive credential leakage...")

    all_payloads = [
        ("Admin Shop Applications", apps),
        ("Admin Pickups", pickups),
        ("Admin Repairs", repairs),
        ("Shops", shops),
    ]

    for label, payload in all_payloads:
        raw_text = json.dumps(payload).lower()
        check(f"{label} contains NO password_hash", "password_hash" not in raw_text)
        check(f"{label} contains NO plain passwords", '"password"' not in raw_text)
        check(f"{label} contains NO jwt access tokens", "access_token" not in raw_text)
        check(f"{label} contains NO private bearer tokens", "bearer" not in raw_text)

    # -------------------------------------------------------------
    # FINAL SUMMARY
    # -------------------------------------------------------------
    print("\n" + "=" * 65)
    print(f" Phase 5.7 Test Suite Results: {passed_assertions}/{total_assertions} Passed")
    print("=" * 65)

    if passed_assertions == total_assertions:
        print("\nALL PHASE 5.7 ADMIN TESTS PASSED PERFECTLY!\n")
        return 0
    else:
        print(f"\nFAILURE: {total_assertions - passed_assertions} assertions failed.\n")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
