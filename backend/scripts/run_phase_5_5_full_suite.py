"""
Comprehensive Automated Test Suite for RepairTrack Phase 5.5:
Real Shop Owner Pickup Management Integration
Verifies all functional, role-based, ownership security, forward transitions,
rejection scenario, and cross-role customer reflection rules.
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
            resp_body = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = {"detail": err_body}
        return e.code, parsed


def run_phase_5_5_tests():
    passed = 0
    total = 0

    def test(cond: bool, code: str, title: str):
        nonlocal passed, total
        total += 1
        status = "PASS" if cond else "FAIL"
        print(f"[{status}] {code}: {title}")
        if not cond:
            print(f"FAILED on test {code}: {title}")
            sys.exit(1)
        passed += 1

    print("\n========================================================")
    print("REPAIRTRACK PHASE 5.5: SHOP OWNER PICKUP MANAGEMENT SUITE")
    print("========================================================\n")

    # ------------------------------------------------------------------
    # 1. AUTHENTICATION & MULTI-USER ROLES
    # ------------------------------------------------------------------
    # Customer Bob
    st, res = api_call("POST", "/auth/login", {"email": "bob@test.com", "password": "password123"})
    test(st == 200 and res["user"]["role"] == "CUSTOMER", "AUTH-01", "Customer Bob logs in")
    bob_token = res["access_token"]
    bob_id = res["user"]["id"]

    # Customer Charlie
    st, res = api_call("POST", "/auth/login", {"email": "charlie@test.com", "password": "password123"})
    test(st == 200 and res["user"]["role"] == "CUSTOMER", "AUTH-02", "Customer Charlie logs in")
    charlie_token = res["access_token"]
    charlie_id = res["user"]["id"]

    # Shop Owner A (Alice - Shop 1)
    st, res = api_call("POST", "/auth/login", {"email": "alice@test.com", "password": "password123"})
    test(st == 200 and res["user"]["role"] == "SHOP_OWNER", "AUTH-03", "Shop Owner Alice (Shop 1) logs in")
    alice_token = res["access_token"]

    # Shop Owner B (David - Shop 2)
    st, res = api_call("POST", "/auth/login", {"email": "david@test.com", "password": "password123"})
    test(st == 200 and res["user"]["role"] == "SHOP_OWNER", "AUTH-04", "Shop Owner David (Shop 2) logs in")
    david_token = res["access_token"]

    # Admin
    st, res = api_call("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    test(st == 200 and res["user"]["role"] == "ADMIN", "AUTH-05", "Admin logs in")
    admin_token = res["access_token"]

    # ------------------------------------------------------------------
    # 2. CUSTOMER CREATES PICKUP FOR SHOP 1
    # ------------------------------------------------------------------
    ts = int(time.time())
    pickup_payload_1 = {
        "shop_id": 1,
        "device_type": "Smartphone",
        "device_brand": "OnePlus",
        "device_model": "11 5G",
        "problem_description": f"Battery depleting rapidly and swollen back cover. [Ref {ts}-1]",
        "pickup_address": "Flat 304, Green Heights, MG Road, Indore",
        "preferred_date": "2026-10-10",
        "preferred_time": "11:00:00",
    }
    st, p1 = api_call("POST", "/pickups", pickup_payload_1, token=bob_token)
    test(st == 201 and p1["status"] == "PENDING", "FLOW-01", "Customer Bob creates pickup for Shop 1 -> 201 PENDING")
    p1_id = p1["id"]

    # ------------------------------------------------------------------
    # 3. SHOP OWNER LISTING & OWNERSHIP ISOLATION
    # ------------------------------------------------------------------
    # Alice (Shop 1) lists pickups
    st, alice_pickups = api_call("GET", "/shop-owner/pickups", token=alice_token)
    test(st == 200 and isinstance(alice_pickups, list), "LIST-01", "GET /api/v1/shop-owner/pickups returns 200 list")
    alice_ids = [p["id"] for p in alice_pickups]
    test(p1_id in alice_ids, "LIST-02", "Alice sees new pickup in her shop's pickup list")

    # David (Shop 2) lists pickups -> MUST NOT contain p1_id
    st, david_pickups = api_call("GET", "/shop-owner/pickups", token=david_token)
    test(st == 200 and isinstance(david_pickups, list), "ISO-01", "GET /api/v1/shop-owner/pickups for David returns 200")
    david_ids = [p["id"] for p in david_pickups]
    test(p1_id not in david_ids, "ISO-02", "David cannot see Alice's shop pickup in list")

    # Alice fetches single pickup detail
    st, p1_detail = api_call("GET", f"/shop-owner/pickups/{p1_id}", token=alice_token)
    test(st == 200 and p1_detail["id"] == p1_id, "DETAIL-01", "Alice can fetch single pickup details")
    test(p1_detail["customer"] is not None and "Bob" in p1_detail["customer"]["name"], "DETAIL-02", "Safe customer brief is present")
    test("password_hash" not in json.dumps(p1_detail), "SEC-01", "password_hash is NEVER exposed in pickup detail")

    # David attempts to fetch Alice's pickup detail -> 403 Forbidden!
    st, err_res = api_call("GET", f"/shop-owner/pickups/{p1_id}", token=david_token)
    test(st == 403, "ISO-03", "David fetching Alice's pickup detail returns 403 Forbidden")

    # David attempts to accept Alice's pickup -> 403 Forbidden!
    st, err_res = api_call("POST", f"/shop-owner/pickups/{p1_id}/accept", token=david_token)
    test(st == 403, "ISO-04", "David accepting Alice's pickup returns 403 Forbidden")

    # David attempts to reject Alice's pickup -> 403 Forbidden!
    st, err_res = api_call("POST", f"/shop-owner/pickups/{p1_id}/reject", {"rejection_reason": "No"}, token=david_token)
    test(st == 403, "ISO-05", "David rejecting Alice's pickup returns 403 Forbidden")

    # David attempts to update Alice's pickup status -> 403 Forbidden!
    st, err_res = api_call("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "SCHEDULED"}, token=david_token)
    test(st == 403, "ISO-06", "David updating Alice's pickup status returns 403 Forbidden")

    # ------------------------------------------------------------------
    # 4. ROLE RESTRICTIONS & AUTHORIZATION
    # ------------------------------------------------------------------
    # Customer Bob attempts to call shop owner accept endpoint -> 403 Forbidden
    st, err_res = api_call("POST", f"/shop-owner/pickups/{p1_id}/accept", token=bob_token)
    test(st == 403, "ROLE-01", "Customer cannot call /shop-owner/pickups/{id}/accept (403 Forbidden)")

    # Customer Bob attempts to call shop owner reject endpoint -> 403 Forbidden
    st, err_res = api_call("POST", f"/shop-owner/pickups/{p1_id}/reject", token=bob_token)
    test(st == 403, "ROLE-02", "Customer cannot call /shop-owner/pickups/{id}/reject (403 Forbidden)")

    # Customer Bob attempts to call shop owner status endpoint -> 403 Forbidden
    st, err_res = api_call("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "SCHEDULED"}, token=bob_token)
    test(st == 403, "ROLE-03", "Customer cannot call /shop-owner/pickups/{id}/status (403 Forbidden)")

    # Admin attempts to call shop owner endpoint -> 403 Forbidden (requires SHOP_OWNER)
    st, err_res = api_call("GET", "/shop-owner/pickups", token=admin_token)
    test(st == 403, "ROLE-04", "Admin cannot access /shop-owner/pickups (403 Forbidden)")

    # Unauthenticated request -> 401 Unauthorized
    st, err_res = api_call("GET", "/shop-owner/pickups")
    test(st == 401, "ROLE-05", "Unauthenticated request to /shop-owner/pickups returns 401")

    # ------------------------------------------------------------------
    # 5. COMPLETE STATUS PROGRESSION WORKFLOW & CUSTOMER REFLECTION
    # ------------------------------------------------------------------
    # Step A: Accept (PENDING -> ACCEPTED)
    st, accepted_p1 = api_call("POST", f"/shop-owner/pickups/{p1_id}/accept", token=alice_token)
    test(st == 200 and accepted_p1["status"] == "ACCEPTED", "WORKFLOW-01", "Alice accepts pickup: PENDING -> ACCEPTED")

    # Verify Customer Bob sees ACCEPTED via /pickups/{id}
    st, cust_view = api_call("GET", f"/pickups/{p1_id}", token=bob_token)
    test(st == 200 and cust_view["status"] == "ACCEPTED", "REFLECT-01", "Customer Bob reflects status: ACCEPTED")

    # Verify Customer Bob sees ACCEPTED via /pickups/my
    st, cust_my = api_call("GET", "/pickups/my", token=bob_token)
    test(st == 200 and any(p["id"] == p1_id and p["status"] == "ACCEPTED" for p in cust_my), "REFLECT-02", "Customer Bob's list reflects status: ACCEPTED")

    # Cannot accept already accepted pickup -> 409 Conflict
    st, err_res = api_call("POST", f"/shop-owner/pickups/{p1_id}/accept", token=alice_token)
    test(st == 409, "VAL-TRANS-01", "Accepting already ACCEPTED pickup returns 409 Conflict")

    # Step B: Schedule (ACCEPTED -> SCHEDULED)
    st, sched_p1 = api_call("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "SCHEDULED"}, token=alice_token)
    test(st == 200 and sched_p1["status"] == "SCHEDULED", "WORKFLOW-02", "Alice schedules pickup: ACCEPTED -> SCHEDULED")

    # Verify Customer Bob reflects SCHEDULED
    st, cust_view = api_call("GET", f"/pickups/{p1_id}", token=bob_token)
    test(st == 200 and cust_view["status"] == "SCHEDULED", "REFLECT-03", "Customer Bob reflects status: SCHEDULED")

    # Step C: Picked Up (SCHEDULED -> PICKED_UP)
    st, pickup_p1 = api_call("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "PICKED_UP"}, token=alice_token)
    test(st == 200 and pickup_p1["status"] == "PICKED_UP", "WORKFLOW-03", "Alice marks picked up: SCHEDULED -> PICKED_UP")

    # Verify Customer Bob reflects PICKED_UP
    st, cust_view = api_call("GET", f"/pickups/{p1_id}", token=bob_token)
    test(st == 200 and cust_view["status"] == "PICKED_UP", "REFLECT-04", "Customer Bob reflects status: PICKED_UP")

    # Step D: Received (PICKED_UP -> RECEIVED)
    st, recvd_p1 = api_call("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "RECEIVED"}, token=alice_token)
    test(st == 200 and recvd_p1["status"] == "RECEIVED", "WORKFLOW-04", "Alice marks received: PICKED_UP -> RECEIVED")

    # Verify Customer Bob reflects RECEIVED
    st, cust_view = api_call("GET", f"/pickups/{p1_id}", token=bob_token)
    test(st == 200 and cust_view["status"] == "RECEIVED", "REFLECT-05", "Customer Bob reflects status: RECEIVED")

    # Step E: Terminal state enforcement (Invalid backward/further transitions)
    st, err_res = api_call("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "ACCEPTED"}, token=alice_token)
    test(st == 409, "VAL-TRANS-02", "Transition RECEIVED -> ACCEPTED rejected with 409 Conflict")

    st, err_res = api_call("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "PENDING"}, token=alice_token)
    test(st == 409, "VAL-TRANS-03", "Transition RECEIVED -> PENDING rejected with 409 Conflict")

    st, err_res = api_call("POST", f"/shop-owner/pickups/{p1_id}/reject", token=alice_token)
    test(st == 409, "VAL-TRANS-04", "Rejecting a RECEIVED pickup returns 409 Conflict")

    # ------------------------------------------------------------------
    # 6. REJECTION SCENARIO
    # ------------------------------------------------------------------
    pickup_payload_2 = {
        "shop_id": 1,
        "device_type": "Tablet",
        "device_brand": "Apple",
        "device_model": "iPad Air 4",
        "problem_description": f"Damaged charging port and bent chassis. [Ref {ts}-2]",
        "pickup_address": "88 Scheme 78, Vijay Nagar, Indore",
    }
    st, p2 = api_call("POST", "/pickups", pickup_payload_2, token=bob_token)
    test(st == 201 and p2["status"] == "PENDING", "REJ-01", "Customer creates second pickup for Shop 1 -> PENDING")
    p2_id = p2["id"]

    # Alice rejects the pending pickup with a reason
    rej_reason = "Chassis repairs require specialized hydraulic jig currently under maintenance."
    st, rej_res = api_call(
        "POST",
        f"/shop-owner/pickups/{p2_id}/reject",
        {"rejection_reason": rej_reason},
        token=alice_token,
    )
    test(st == 200 and rej_res["status"] == "REJECTED", "REJ-02", "Alice rejects pickup: PENDING -> REJECTED")

    # Customer Bob reflects REJECTED
    st, cust_view_p2 = api_call("GET", f"/pickups/{p2_id}", token=bob_token)
    test(st == 200 and cust_view_p2["status"] == "REJECTED", "REJ-03", "Customer Bob reflects status: REJECTED")

    # Attempting to accept a rejected pickup must fail -> 409 Conflict
    st, err_res = api_call("POST", f"/shop-owner/pickups/{p2_id}/accept", token=alice_token)
    test(st == 409, "REJ-04", "Rejected pickup cannot be accepted later (409 Conflict)")

    # Attempting to update status of a rejected pickup must fail -> 409 Conflict
    st, err_res = api_call("PATCH", f"/shop-owner/pickups/{p2_id}/status", {"status": "SCHEDULED"}, token=alice_token)
    test(st == 409, "REJ-05", "Updating status on rejected pickup returns 409 Conflict")

    # ------------------------------------------------------------------
    # 7. FILTERING BY STATUS
    # ------------------------------------------------------------------
    st, pending_list = api_call("GET", "/shop-owner/pickups?status=PENDING", token=alice_token)
    test(st == 200 and all(p["status"] == "PENDING" for p in pending_list), "FILTER-01", "Status filter ?status=PENDING works")

    st, received_list = api_call("GET", "/shop-owner/pickups?status=RECEIVED", token=alice_token)
    test(st == 200 and all(p["status"] == "RECEIVED" for p in received_list), "FILTER-02", "Status filter ?status=RECEIVED works")

    st, rejected_list = api_call("GET", "/shop-owner/pickups?status=REJECTED", token=alice_token)
    test(st == 200 and all(p["status"] == "REJECTED" for p in rejected_list), "FILTER-03", "Status filter ?status=REJECTED works")

    # ------------------------------------------------------------------
    # 8. NON-EXISTENT RESOURCE ERROR HANDLING
    # ------------------------------------------------------------------
    st, err_res = api_call("GET", "/shop-owner/pickups/999999", token=alice_token)
    test(st == 404, "ERR-01", "Non-existent pickup returns 404 Not Found")

    st, err_res = api_call("POST", "/shop-owner/pickups/999999/accept", token=alice_token)
    test(st == 404, "ERR-02", "Accept on non-existent pickup returns 404 Not Found")

    st, err_res = api_call("POST", "/shop-owner/pickups/999999/reject", token=alice_token)
    test(st == 404, "ERR-03", "Reject on non-existent pickup returns 404 Not Found")

    st, err_res = api_call("PATCH", "/shop-owner/pickups/999999/status", {"status": "SCHEDULED"}, token=alice_token)
    test(st == 404, "ERR-04", "Status update on non-existent pickup returns 404 Not Found")

    # ------------------------------------------------------------------
    # 9. FRONTEND INTEGRATION CODE VERIFICATION
    # ------------------------------------------------------------------
    REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
    svc_code = (REPO_ROOT / "frontend/src/services/pickupService.js").read_text(encoding="utf-8")
    test("getShopOwnerPickups" in svc_code, "FE-01", "pickupService.js contains getShopOwnerPickups")
    test("getShopOwnerPickupById" in svc_code, "FE-02", "pickupService.js contains getShopOwnerPickupById")
    test("acceptPickup" in svc_code, "FE-03", "pickupService.js contains acceptPickup")
    test("rejectPickup" in svc_code, "FE-04", "pickupService.js contains rejectPickup")
    test("updatePickupStatus" in svc_code, "FE-05", "pickupService.js contains updatePickupStatus")

    dash_code = (REPO_ROOT / "frontend/src/pages/ShopOwnerDashboardPage.jsx").read_text(encoding="utf-8")
    test("getShopOwnerPickups" in dash_code, "FE-06", "ShopOwnerDashboardPage.jsx calls getShopOwnerPickups")
    test("MOCK_PICKUPS" not in dash_code, "FE-07", "ShopOwnerDashboardPage.jsx no longer imports MOCK_PICKUPS")

    reqs_code = (REPO_ROOT / "frontend/src/pages/shopowner/PickupRequestsPage.jsx").read_text(encoding="utf-8")
    test("getShopOwnerPickups" in reqs_code, "FE-08", "PickupRequestsPage.jsx calls getShopOwnerPickups")
    test("MOCK_PICKUPS" not in reqs_code, "FE-09", "PickupRequestsPage.jsx no longer imports MOCK_PICKUPS")
    test("updatePickupStatus" in reqs_code, "FE-10", "PickupRequestsPage.jsx calls updatePickupStatus")
    test("acceptPickup" in reqs_code, "FE-11", "PickupRequestsPage.jsx calls acceptPickup")
    test("rejectPickup" in reqs_code, "FE-12", "PickupRequestsPage.jsx calls rejectPickup")

    print("\n========================================================")
    print(f"ALL {passed}/{total} PHASE 5.5 INTEGRATION TESTS PASSED!")
    print("========================================================\n")


if __name__ == "__main__":
    run_phase_5_5_tests()
