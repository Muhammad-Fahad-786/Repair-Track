"""
Comprehensive Test Suite for RepairTrack Phase 4.5 -- Pickup Request System
Tests all scenarios A through U and all edge cases.
"""
import json
import sys
import urllib.error
import urllib.request

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

    def assert_test(cond, title):
        nonlocal passed, total
        total += 1
        if cond:
            passed += 1
            print(f"[PASS] {title}")
        else:
            print(f"[FAIL] {title}")
            sys.exit(1)

    print("\n==================================================")
    print("STARTING REPAIRTRACK PHASE 4.5 TEST SUITE")
    print("==================================================\n")

    # A. Health check
    status, data = api_request("GET", "/health")
    assert_test(status == 200 and data.get("status") == "ok", "A. Health endpoint still works")

    # B. Customer registration & login
    # Login Bob (Customer 1)
    status, bob_login = api_request("POST", "/auth/login", {"email": "bob@test.com", "password": "password123"})
    assert_test(status == 200 and "access_token" in bob_login, "B1. Bob (Customer) login works")
    bob_token = bob_login["access_token"]

    # Register Charlie (Customer 2) if not already done, or login
    status, charlie_login = api_request("POST", "/auth/login", {"email": "charlie@test.com", "password": "password123"})
    if status != 200:
        status, charlie_reg = api_request("POST", "/auth/register", {"name": "Charlie", "email": "charlie@test.com", "password": "password123"})
        charlie_token = charlie_reg["access_token"]
    else:
        charlie_token = charlie_login["access_token"]
    assert_test(charlie_token is not None, "B2. Charlie (Customer 2) authenticated")

    # C. Admin login
    status, admin_login = api_request("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    assert_test(status == 200 and "access_token" in admin_login, "C. Admin login works")
    admin_token = admin_login["access_token"]

    # D. Approved shop owner login (Alice owns Shop 1)
    status, alice_login = api_request("POST", "/auth/login", {"email": "alice@test.com", "password": "password123"})
    assert_test(status == 200 and "access_token" in alice_login, "D. Alice (Shop Owner) login works")
    alice_token = alice_login["access_token"]

    # Edge Case: Customer creates pickup for nonexistent shop (404)
    status, err = api_request("POST", "/pickups", {
        "shop_id": 99999,
        "device_type": "Phone",
        "pickup_address": "123 Test St",
    }, token=bob_token)
    assert_test(status == 404, "Edge: Customer creates pickup for nonexistent shop -> 404")

    # E. Customer creates pickup -> 201 + PENDING
    status, pickup1 = api_request("POST", "/pickups", {
        "shop_id": 1,
        "device_type": "Smartphone",
        "device_brand": "Apple",
        "device_model": "iPhone 13 Pro",
        "problem_description": "Broken OLED display",
        "pickup_address": "456 Elm St, Karachi",
        "preferred_date": "2026-10-15",
        "preferred_time": "14:30:00",
    }, token=bob_token)
    assert_test(
        status == 201 and pickup1.get("status") == "PENDING" and pickup1.get("id") is not None,
        "E. Customer creates pickup -> 201 + PENDING",
    )
    p1_id = pickup1["id"]

    # Customer creates a second pickup for testing rejection
    status, pickup2 = api_request("POST", "/pickups", {
        "shop_id": 1,
        "device_type": "Laptop",
        "device_brand": "Dell",
        "device_model": "XPS 15",
        "problem_description": "Water spill",
        "pickup_address": "789 Pine St, Karachi",
    }, token=bob_token)
    assert_test(status == 201 and pickup2.get("status") == "PENDING", "E2. Customer creates second pickup")
    p2_id = pickup2["id"]

    # F. Customer sees own pickup
    status, my_pickups = api_request("GET", "/pickups/my", token=bob_token)
    bob_ids = [p["id"] for p in my_pickups]
    assert_test(status == 200 and p1_id in bob_ids and p2_id in bob_ids, "F1. Customer sees own pickups via GET /pickups/my")

    status, single_p1 = api_request("GET", f"/pickups/{p1_id}", token=bob_token)
    assert_test(status == 200 and single_p1["id"] == p1_id, "F2. Customer sees single pickup via GET /pickups/{id}")

    # G. Customer cannot see another customer's pickup
    status, charlie_view_p1 = api_request("GET", f"/pickups/{p1_id}", token=charlie_token)
    assert_test(status in (403, 404), f"G. Charlie cannot see Bob's pickup (returned HTTP {status})")

    # H. Shop owner sees pickup for own shop
    status, shop_pickups = api_request("GET", "/shop-owner/pickups", token=alice_token)
    shop_p_ids = [p["id"] for p in shop_pickups]
    assert_test(status == 200 and p1_id in shop_p_ids and p2_id in shop_p_ids, "H. Shop owner sees pickup requests for own shop")

    # I. Shop owner cannot see another shop's pickup
    # Register and approve a second shop owner (David)
    status, david_login = api_request("POST", "/auth/login", {"email": "david@test.com", "password": "password123"})
    if status != 200:
        _, david_reg = api_request("POST", "/auth/register", {"name": "David", "email": "david@test.com", "password": "password123"})
        david_token = david_reg["access_token"]
    else:
        david_token = david_login["access_token"]

    # Check David's profile / role
    _, david_me = api_request("GET", "/auth/me", token=david_token)
    if david_me.get("role") != "SHOP_OWNER":
        # Check if David already has an application
        _, my_apps = api_request("GET", "/shop-applications/my", token=david_token)
        if not my_apps:
            _, david_app = api_request("POST", "/shop-applications/", {"shop_name": "David Quick Fix", "address": "101 Market St", "city": "Karachi"}, token=david_token)
            app_id = david_app["id"]
        else:
            app_id = my_apps[0]["id"]
        # Admin approves David's application
        api_request("POST", f"/admin/shop-applications/{app_id}/approve", token=admin_token)
        # Re-login David to get new token with updated permissions
        _, david_login = api_request("POST", "/auth/login", {"email": "david@test.com", "password": "password123"})
        david_token = david_login["access_token"]

    # David tries to view Alice's pickup -> must be denied (403 or 404)
    status, david_view_p1 = api_request("GET", f"/shop-owner/pickups/{p1_id}", token=david_token)
    assert_test(status in (403, 404), f"I1. Shop owner David cannot access Alice's pickup (returned HTTP {status})")

    # David's list of pickups should not include Alice's pickup
    status, david_pickups = api_request("GET", "/shop-owner/pickups", token=david_token)
    david_p_ids = [p["id"] for p in david_pickups]
    assert_test(status == 200 and p1_id not in david_p_ids, "I2. David's shop pickup list does not contain Alice's pickup")

    # J. Shop owner accepts: PENDING -> ACCEPTED
    status, accepted_p1 = api_request("POST", f"/shop-owner/pickups/{p1_id}/accept", token=alice_token)
    assert_test(status == 200 and accepted_p1["status"] == "ACCEPTED", "J. Shop owner accepts: PENDING -> ACCEPTED")

    # Edge: Accept already accepted pickup -> 409
    status, err = api_request("POST", f"/shop-owner/pickups/{p1_id}/accept", token=alice_token)
    assert_test(status == 409, "Edge: Accept already accepted pickup -> 409")

    # K. Shop owner schedules: ACCEPTED -> SCHEDULED
    status, sched_p1 = api_request("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "SCHEDULED"}, token=alice_token)
    assert_test(status == 200 and sched_p1["status"] == "SCHEDULED", "K. Shop owner schedules: ACCEPTED -> SCHEDULED")

    # L. Shop owner marks picked up: SCHEDULED -> PICKED_UP
    status, picked_p1 = api_request("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "PICKED_UP"}, token=alice_token)
    assert_test(status == 200 and picked_p1["status"] == "PICKED_UP", "L. Shop owner marks picked up: SCHEDULED -> PICKED_UP")

    # M. Shop owner marks received: PICKED_UP -> RECEIVED
    status, recvd_p1 = api_request("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "RECEIVED"}, token=alice_token)
    assert_test(status == 200 and recvd_p1["status"] == "RECEIVED", "M. Shop owner marks received: PICKED_UP -> RECEIVED")

    # N. Invalid transition is rejected (e.g. RECEIVED -> PENDING or RECEIVED -> SCHEDULED)
    status, err = api_request("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "PENDING"}, token=alice_token)
    assert_test(status == 409, "N1. Invalid transition from RECEIVED -> PENDING is rejected with 409")
    status, err = api_request("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "ACCEPTED"}, token=alice_token)
    assert_test(status == 409, "N2. Invalid transition from RECEIVED -> ACCEPTED is rejected with 409")

    # O. Shop owner rejects another pending pickup: PENDING -> REJECTED
    status, rej_p2 = api_request("POST", f"/shop-owner/pickups/{p2_id}/reject", {"rejection_reason": "Device out of service area"}, token=alice_token)
    assert_test(status == 200 and rej_p2["status"] == "REJECTED", "O. Shop owner rejects pickup: PENDING -> REJECTED")

    # Edge: Reject already rejected pickup -> 409
    status, err = api_request("POST", f"/shop-owner/pickups/{p2_id}/reject", token=alice_token)
    assert_test(status == 409, "Edge: Reject already rejected pickup -> 409")

    # P. Rejected pickup cannot be accepted later
    status, err = api_request("POST", f"/shop-owner/pickups/{p2_id}/accept", token=alice_token)
    assert_test(status == 409, "P. Rejected pickup cannot be accepted later -> 409")

    # Q. Admin can list all pickups
    status, admin_pickups = api_request("GET", "/admin/pickups", token=admin_token)
    admin_ids = [p["id"] for p in admin_pickups]
    assert_test(status == 200 and p1_id in admin_ids and p2_id in admin_ids, "Q1. Admin lists all pickups")

    # Admin filters by status
    status, admin_recvd = api_request("GET", "/admin/pickups?status=RECEIVED", token=admin_token)
    assert_test(status == 200 and all(p["status"] == "RECEIVED" for p in admin_recvd), "Q2. Admin filters pickups by status")

    # R. Customer cannot access admin pickup endpoint -> 403
    status, err = api_request("GET", "/admin/pickups", token=bob_token)
    assert_test(status == 403, "R. Customer cannot access admin pickup endpoint -> 403")

    # S. Shop owner cannot access admin pickup endpoint -> 403
    status, err = api_request("GET", "/admin/pickups", token=alice_token)
    assert_test(status == 403, "S. Shop owner cannot access admin pickup endpoint -> 403")

    # Edge: Shop owner tries to create pickup as customer -> 403
    status, err = api_request("POST", "/pickups", {"shop_id": 1, "device_type": "Phone", "pickup_address": "Test"}, token=alice_token)
    assert_test(status == 403, "Edge: Shop owner cannot create customer pickup -> 403")

    # Edge: Customer tries to access shop owner endpoints -> 403
    status, err = api_request("GET", "/shop-owner/pickups", token=bob_token)
    assert_test(status == 403, "Edge: Customer cannot access shop owner pickups -> 403")

    # T. Unauthenticated protected endpoint returns 401
    status, _ = api_request("GET", "/pickups/my")
    assert_test(status == 401, "T1. Unauthenticated /pickups/my -> 401")
    status, _ = api_request("GET", "/shop-owner/pickups")
    assert_test(status == 401, "T2. Unauthenticated /shop-owner/pickups -> 401")
    status, _ = api_request("GET", "/admin/pickups")
    assert_test(status == 401, "T3. Unauthenticated /admin/pickups -> 401")

    # U. Confirm no password_hash appears in responses
    all_json_str = json.dumps(admin_pickups) + json.dumps(my_pickups) + json.dumps(single_p1)
    assert_test("password_hash" not in all_json_str, "U. Confirm no password_hash appears in any response")

    # Edge: Nonexistent pickup -> 404
    status, _ = api_request("GET", "/pickups/99999", token=bob_token)
    assert_test(status == 404, "Edge: Customer requests nonexistent pickup -> 404")
    status, _ = api_request("GET", "/shop-owner/pickups/99999", token=alice_token)
    assert_test(status == 404, "Edge: Shop owner requests nonexistent pickup -> 404")

    print("\n==================================================")
    print(f"RESULTS: {passed}/{total} TESTS PASSED (0 FAILURES)")
    print("==================================================\n")


if __name__ == "__main__":
    run_tests()
