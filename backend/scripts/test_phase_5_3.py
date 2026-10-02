"""
Test Suite for RepairTrack Phase 5.3: Real Shop Registration & Admin Approval Integration
Tests all API contracts, role transitions, duplicate protections, rejection and approval workflows,
and public shop visibility.
"""
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

BASE = "http://127.0.0.1:8000/api/v1"


def api_request(method: str, path: str, data: dict | None = None, token: str | None = None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = {"detail": err_body}
        return e.code, parsed


def run_tests():
    passed = 0
    total = 0

    def assert_test(cond: bool, title: str):
        nonlocal passed, total
        total += 1
        if cond:
            passed += 1
            print(f"[PASS] {title}")
        else:
            print(f"[FAIL] {title}")
            sys.exit(1)

    print("\n==================================================")
    print("STARTING REPAIRTRACK PHASE 5.3 TEST SUITE")
    print("==================================================\n")

    # 1. Health check
    status, data = api_request("GET", "/health")
    assert_test(status == 200 and data.get("status") == "ok", "1. Health endpoint responsive")

    # 2. Authentications
    # Admin login
    status, admin_login = api_request("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    assert_test(status == 200 and "access_token" in admin_login, "2A. Admin login works")
    admin_token = admin_login["access_token"]

    # Shop Owner login
    status, alice_login = api_request("POST", "/auth/login", {"email": "alice@test.com", "password": "password123"})
    assert_test(status == 200 and "access_token" in alice_login, "2B. Shop Owner login works")
    alice_token = alice_login["access_token"]

    # Customer login
    status, bob_login = api_request("POST", "/auth/login", {"email": "bob@test.com", "password": "password123"})
    assert_test(status == 200 and "access_token" in bob_login, "2C. Customer login works")
    bob_token = bob_login["access_token"]

    # 3. Create fresh customer for Phase 5.3 approval workflow
    ts = int(time.time())
    cust_email = f"cust_approve_{ts}@test.com"
    status, cust_reg = api_request("POST", "/auth/register", {
        "name": f"Fahad Applicant {ts}",
        "email": cust_email,
        "password": "password123",
        "phone": "+91 98765 00001",
    })
    assert_test(status == 201 and "access_token" in cust_reg, "3A. Fresh customer registration works")
    cust_token = cust_reg["access_token"]

    # Verify initial role is CUSTOMER
    status, me_cust = api_request("GET", "/auth/me", token=cust_token)
    assert_test(status == 200 and me_cust.get("role") == "CUSTOMER", "3B. Customer initial role is CUSTOMER")

    # 4. Check initial applications for new customer (should be empty)
    status, my_apps_init = api_request("GET", "/shop-applications/my", token=cust_token)
    assert_test(status == 200 and len(my_apps_init) == 0, "4. Initial customer has 0 applications")

    # 5. Submit shop application as customer
    app_shop_name = f"QuickFix Electro {ts}"
    status, app_res = api_request("POST", "/shop-applications/", {
        "shop_name": app_shop_name,
        "description": "Expert smartphone and laptop motherboard repair workshop.",
        "address": "42 MG Road, South Extension",
        "city": "Indore",
        "services": "Screen Replacement, Battery Replacement, Diagnostics",
        "pickup_available": True,
    }, token=cust_token)
    assert_test(status == 201, "5A. Customer submits shop application successfully (201 Created)")
    assert_test(app_res.get("status") == "PENDING", "5B. Application status is PENDING")
    assert_test(app_res.get("shop_name") == app_shop_name, "5C. Application shop_name matches")
    assert_test(app_res.get("pickup_available") is True, "5D. Application pickup_available is True")
    app_id = app_res["id"]

    # 6. Verify customer can retrieve their application via /shop-applications/my
    status, my_apps = api_request("GET", "/shop-applications/my", token=cust_token)
    assert_test(status == 200 and len(my_apps) == 1, "6A. /shop-applications/my returns submitted application")
    assert_test(my_apps[0]["id"] == app_id and my_apps[0]["status"] == "PENDING", "6B. Application details and PENDING status verified")

    # 7. Duplicate application protection (conflict 409)
    status, dup_err = api_request("POST", "/shop-applications/", {
        "shop_name": f"Another Shop {ts}",
        "city": "Indore",
    }, token=cust_token)
    assert_test(status == 409, "7. Duplicate application returns 409 Conflict")

    # 8. Non-customer cannot submit shop application (403 Forbidden)
    status, owner_err = api_request("POST", "/shop-applications/", {
        "shop_name": "Forbidden Shop",
        "city": "Indore",
    }, token=alice_token)
    assert_test(status == 403, "8A. Shop Owner cannot submit shop application (403 Forbidden)")

    status, admin_err = api_request("POST", "/shop-applications/", {
        "shop_name": "Admin Forbidden Shop",
        "city": "Indore",
    }, token=admin_token)
    assert_test(status == 403, "8B. Admin cannot submit customer shop application (403 Forbidden)")

    # 9. Admin listing applications
    status, admin_apps = api_request("GET", "/admin/shop-applications/", token=admin_token)
    assert_test(status == 200 and isinstance(admin_apps, list), "9A. Admin can list all shop applications")
    found_in_admin = any(a["id"] == app_id for a in admin_apps)
    assert_test(found_in_admin, "9B. New application is visible in admin list")

    # Test status filter ?status=PENDING
    status, pending_apps = api_request("GET", "/admin/shop-applications/?status=PENDING", token=admin_token)
    assert_test(status == 200 and all(a["status"] == "PENDING" for a in pending_apps), "9C. Admin status filter ?status=PENDING works")

    # 10. Rejection workflow test with a separate customer
    reject_cust_email = f"cust_reject_{ts}@test.com"
    status, rej_cust_reg = api_request("POST", "/auth/register", {
        "name": f"Reject Candidate {ts}",
        "email": reject_cust_email,
        "password": "password123",
    })
    assert_test(status == 201, "10A. Second customer registered for rejection test")
    rej_cust_token = rej_cust_reg["access_token"]

    status, rej_app = api_request("POST", "/shop-applications/", {
        "shop_name": f"Flawed Shop {ts}",
        "address": "Incomplete Address",
        "city": "Delhi",
        "services": "General Repair",
    }, token=rej_cust_token)
    assert_test(status == 201, "10B. Second customer submits shop application")
    rej_app_id = rej_app["id"]

    # Reject without reason -> 422
    status, no_reason_err = api_request("POST", f"/admin/shop-applications/{rej_app_id}/reject", {}, token=admin_token)
    assert_test(status == 422, "10C. Admin rejecting without reason returns 422 Validation Error")

    # Reject with empty string -> 422
    status, empty_reason_err = api_request("POST", f"/admin/shop-applications/{rej_app_id}/reject", {"rejection_reason": ""}, token=admin_token)
    assert_test(status == 422, "10D. Admin rejecting with empty reason returns 422 Validation Error")

    # Reject with valid reason
    rejection_text = "Incomplete workshop physical address and unverified phone contact."
    status, rej_res = api_request("POST", f"/admin/shop-applications/{rej_app_id}/reject", {"rejection_reason": rejection_text}, token=admin_token)
    assert_test(status == 200 and rej_res.get("status") == "REJECTED", "10E. Admin rejects application with reason (200 OK)")
    assert_test(rej_res.get("rejection_reason") == rejection_text, "10F. Rejection reason stored correctly")

    # Applicant verifies rejection status on /shop-applications/my
    status, rej_my_apps = api_request("GET", "/shop-applications/my", token=rej_cust_token)
    assert_test(status == 200 and rej_my_apps[0]["status"] == "REJECTED", "10G. Applicant /shop-applications/my shows REJECTED status")
    assert_test(rej_my_apps[0]["rejection_reason"] == rejection_text, "10H. Applicant receives stored rejection reason")

    # Verify applicant's role remains CUSTOMER
    status, rej_me = api_request("GET", "/auth/me", token=rej_cust_token)
    assert_test(status == 200 and rej_me.get("role") == "CUSTOMER", "10I. Rejected applicant role remains CUSTOMER")

    # Verify rejected application does NOT create a public shop
    status, public_shops = api_request("GET", "/shops")
    assert_test(not any(s["name"] == f"Flawed Shop {ts}" for s in public_shops), "10J. Rejected shop is NOT in public shops directory")

    # 11. Approval workflow test on first customer application
    status, approve_res = api_request("POST", f"/admin/shop-applications/{app_id}/approve", token=admin_token)
    assert_test(status == 200 and approve_res.get("status") == "APPROVED", "11A. Admin approves application (200 OK)")

    # 12. Verify Role Promotion: CUSTOMER -> SHOP_OWNER
    status, promoted_me = api_request("GET", "/auth/me", token=cust_token)
    assert_test(status == 200 and promoted_me.get("role") == "SHOP_OWNER", "12. Approved applicant role is immediately SHOP_OWNER via /auth/me")

    # 13. Verify Shop Creation & Public Visibility
    status, public_shops_after = api_request("GET", "/shops")
    matching_shop = next((s for s in public_shops_after if s["name"] == app_shop_name), None)
    assert_test(matching_shop is not None, "13A. Approved shop automatically appears in public /shops directory")
    assert_test(matching_shop["city"] == "Indore", "13B. Public shop city matches application")
    assert_test(matching_shop["pickup_available"] is True, "13C. Public shop pickup_available matches application")
    assert_test("Screen Replacement" in (matching_shop.get("services") or ""), "13D. Public shop services match application")

    # 14. Verify Shop profile by slug
    shop_slug = matching_shop["slug"]
    status, slug_shop = api_request("GET", f"/shops/slug/{shop_slug}")
    assert_test(status == 200 and slug_shop["name"] == app_shop_name, "14. Approved shop is accessible by its slug /shops/slug/{slug}")

    # 15. Verify Cannot approve an already approved application -> 409 Conflict
    status, re_approve_err = api_request("POST", f"/admin/shop-applications/{app_id}/approve", token=admin_token)
    assert_test(status == 409, "15. Re-approving already approved application returns 409 Conflict")

    # 16. Verify Cannot reject an already approved application -> 409 Conflict
    status, rej_approved_err = api_request("POST", f"/admin/shop-applications/{app_id}/reject", {"rejection_reason": "late"}, token=admin_token)
    assert_test(status == 409, "16. Rejecting an already approved application returns 409 Conflict")

    print("\n==================================================")
    print(f"ALL {passed}/{total} TESTS PASSED SUCCESSFULLY!")
    print("==================================================\n")


if __name__ == "__main__":
    run_tests()
