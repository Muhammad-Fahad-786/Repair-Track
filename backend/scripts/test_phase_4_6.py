"""
Comprehensive Test Suite for RepairTrack Phase 4.6 -- Repair Management System
Tests all scenarios A through AF and all edge cases.
"""
import json
import pathlib
import socket
import sys
import threading
import time
import urllib.error
import urllib.request

# Ensure backend root is on sys.path
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

PORT = 8000
BASE = f"http://127.0.0.1:{PORT}/api/v1"


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def ensure_server_running():
    global PORT, BASE
    if is_port_in_use(PORT):
        # Verify it's our app
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{PORT}/api/v1/health")
            with urllib.request.urlopen(req, timeout=1) as resp:
                if resp.status == 200:
                    return
        except Exception:
            pass

    # If port 8000 is not our app or not in use, try port 8000 or 8765
    target_port = PORT if not is_port_in_use(PORT) else 8765
    PORT = target_port
    BASE = f"http://127.0.0.1:{PORT}/api/v1"

    import uvicorn
    from app.main import app

    config = uvicorn.Config(app, host="127.0.0.1", port=PORT, log_level="warning")
    server = uvicorn.Server(config)
    t = threading.Thread(target=server.run, daemon=True)
    t.start()

    # Wait for server to come up
    for _ in range(30):
        time.sleep(0.2)
        try:
            req = urllib.request.Request(f"{BASE}/health")
            with urllib.request.urlopen(req, timeout=1) as resp:
                if resp.status == 200:
                    return
        except Exception:
            pass
    raise RuntimeError(f"Could not start or connect to server on port {PORT}")


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
    ensure_server_running()

    passed = 0
    total = 0
    all_responses_dump = []

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
    print("STARTING REPAIRTRACK PHASE 4.6 TEST SUITE")
    print("==================================================\n")

    # A. Health endpoint
    status, data = api_request("GET", "/health")
    all_responses_dump.append(data)
    assert_test(status == 200 and data.get("status") == "ok", "A. Health endpoint still works")

    # B. Authentication checks
    # Bob (Customer 1)
    status, bob_login = api_request("POST", "/auth/login", {"email": "bob@test.com", "password": "password123"})
    all_responses_dump.append(bob_login)
    assert_test(status == 200 and "access_token" in bob_login, "B1. Bob (Customer 1) login works")
    bob_token = bob_login["access_token"]

    # Charlie (Customer 2)
    status, charlie_login = api_request("POST", "/auth/login", {"email": "charlie@test.com", "password": "password123"})
    if status != 200:
        status, charlie_reg = api_request("POST", "/auth/register", {"name": "Charlie", "email": "charlie@test.com", "password": "password123"})
        charlie_token = charlie_reg["access_token"]
    else:
        charlie_token = charlie_login["access_token"]
    assert_test(charlie_token is not None, "B2. Charlie (Customer 2) authenticated")

    # Admin
    status, admin_login = api_request("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    all_responses_dump.append(admin_login)
    assert_test(status == 200 and "access_token" in admin_login, "C. Admin login works")
    admin_token = admin_login["access_token"]

    # Alice (Shop 1 Owner)
    status, alice_login = api_request("POST", "/auth/login", {"email": "alice@test.com", "password": "password123"})
    all_responses_dump.append(alice_login)
    assert_test(status == 200 and "access_token" in alice_login, "D1. Alice (Shop Owner 1) login works")
    alice_token = alice_login["access_token"]

    # David (Shop 2 Owner)
    status, david_login = api_request("POST", "/auth/login", {"email": "david@test.com", "password": "password123"})
    all_responses_dump.append(david_login)
    assert_test(status == 200 and "access_token" in david_login, "D2. David (Shop Owner 2) login works")
    david_token = david_login["access_token"]

    # E. Pickup workflow to produce a fresh RECEIVED pickup for Alice's shop
    status, p1 = api_request("POST", "/pickups", {
        "shop_id": 1,
        "device_type": "Smartphone",
        "device_brand": "Samsung",
        "device_model": "Galaxy S22",
        "problem_description": "Cracked screen and damaged digitizer",
        "pickup_address": "123 Central Ave, Delhi",
        "preferred_date": "2026-11-01",
        "preferred_time": "10:00:00",
    }, token=bob_token)
    all_responses_dump.append(p1)
    assert_test(status == 201 and p1.get("status") == "PENDING", "E1. Fresh pickup request created (PENDING)")
    p1_id = p1["id"]

    # Edge: Create repair from pickup not RECEIVED -> 409
    status, err = api_request("POST", "/shop-owner/repairs", {"pickup_id": p1_id}, token=alice_token)
    assert_test(status == 409, "Edge: Create repair from pickup not RECEIVED -> 409")

    # Transition pickup to RECEIVED: PENDING -> ACCEPTED -> SCHEDULED -> PICKED_UP -> RECEIVED
    status, _ = api_request("POST", f"/shop-owner/pickups/{p1_id}/accept", token=alice_token)
    assert_test(status == 200, "E2. Alice accepts pickup (ACCEPTED)")
    status, _ = api_request("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "SCHEDULED"}, token=alice_token)
    assert_test(status == 200, "E3. Alice schedules pickup (SCHEDULED)")
    status, _ = api_request("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "PICKED_UP"}, token=alice_token)
    assert_test(status == 200, "E4. Alice marks pickup (PICKED_UP)")
    status, p1_recvd = api_request("PATCH", f"/shop-owner/pickups/{p1_id}/status", {"status": "RECEIVED"}, token=alice_token)
    assert_test(status == 200 and p1_recvd["status"] == "RECEIVED", "E5. Alice marks pickup as RECEIVED")

    # Edge: Create repair from nonexistent pickup -> 404
    status, err = api_request("POST", "/shop-owner/repairs", {"pickup_id": 999999}, token=alice_token)
    assert_test(status == 404, "Edge: Create repair from nonexistent pickup -> 404")

    # Edge: Shop owner David attempts to create repair from Alice's pickup -> 403
    status, err = api_request("POST", "/shop-owner/repairs", {"pickup_id": p1_id}, token=david_token)
    assert_test(status == 403, "Edge: David attempts to create repair for Alice's pickup -> 403")

    # F. Shop owner Alice creates repair from RECEIVED pickup -> 201
    status, rep1 = api_request("POST", "/shop-owner/repairs", {"pickup_id": p1_id}, token=alice_token)
    all_responses_dump.append(rep1)
    assert_test(status == 201 and "id" in rep1, "F. Alice creates repair from RECEIVED pickup -> 201")
    rep1_id = rep1["id"]
    rep1_code = rep1["repair_id"]

    # G. Repair starts with RECEIVED
    assert_test(rep1.get("status") == "RECEIVED", "G. Repair status starts as RECEIVED")

    # H. Repair ID exists and is unique, non-sequential
    assert_test(rep1_code.startswith("RT-SH001-") and len(rep1_code) >= 12, f"H. Repair ID '{rep1_code}' is formatted correctly")

    # I. Repair is linked to pickup and copies device details
    assert_test(
        rep1.get("pickup_request_id") == p1_id
        and rep1.get("device_type") == "Smartphone"
        and rep1.get("device_brand") == "Samsung"
        and rep1.get("device_model") == "Galaxy S22"
        and rep1.get("customer_id") is not None
        and rep1.get("shop_id") == 1,
        "I. Repair correctly links to pickup and copies device/customer/shop details",
    )

    # J. Initial history entry exists
    history = rep1.get("history", [])
    assert_test(
        len(history) >= 1 and history[0]["status"] == "RECEIVED",
        "J. Initial history entry exists with status RECEIVED",
    )

    # AE. Duplicate repair for same pickup is rejected -> 409
    status, err = api_request("POST", "/shop-owner/repairs", {"pickup_id": p1_id}, token=alice_token)
    assert_test(status == 409, "AE. Duplicate repair for same pickup is rejected -> 409")

    # K. Shop owner lists own repairs
    status, alice_repairs = api_request("GET", "/shop-owner/repairs", token=alice_token)
    all_responses_dump.append(alice_repairs)
    alice_rep_ids = [r["id"] for r in alice_repairs]
    assert_test(status == 200 and rep1_id in alice_rep_ids, "K1. Shop owner Alice lists own repairs")

    # Status filter on shop-owner list
    status, recvd_filter = api_request("GET", "/shop-owner/repairs?status=RECEIVED", token=alice_token)
    assert_test(status == 200 and any(r["id"] == rep1_id for r in recvd_filter), "K2. Shop owner filters repairs by status")

    # L. Shop owner David cannot access Alice's repair
    status, err = api_request("GET", f"/shop-owner/repairs/{rep1_id}", token=david_token)
    assert_test(status == 403, "L1. David cannot GET Alice's repair by id -> 403")
    status, err = api_request("GET", f"/shop-owner/repairs/{rep1_code}", token=david_token)
    assert_test(status == 403, "L2. David cannot GET Alice's repair by code -> 403")

    status, err = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/status", {"status": "DIAGNOSING"}, token=david_token)
    assert_test(status == 403, "L3. David cannot update status of Alice's repair -> 403")

    status, err = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/estimate", {"estimated_cost": 5000}, token=david_token)
    assert_test(status == 403, "L4. David cannot update estimate of Alice's repair -> 403")

    status, err = api_request("POST", f"/shop-owner/repairs/{rep1_id}/history", {"note": "Unauthorized note"}, token=david_token)
    assert_test(status == 403, "L5. David cannot add history note to Alice's repair -> 403")

    # M. Customer Bob sees own repair
    status, bob_repairs = api_request("GET", "/repairs/my", token=bob_token)
    all_responses_dump.append(bob_repairs)
    bob_rep_ids = [r["id"] for r in bob_repairs]
    assert_test(status == 200 and rep1_id in bob_rep_ids, "M1. Customer Bob sees own repair in GET /repairs/my")

    status, bob_single_rep = api_request("GET", f"/repairs/{rep1_id}", token=bob_token)
    all_responses_dump.append(bob_single_rep)
    assert_test(status == 200 and bob_single_rep["id"] == rep1_id, "M2. Customer Bob accesses single repair by ID")

    status, bob_single_rep_code = api_request("GET", f"/repairs/{rep1_code}", token=bob_token)
    assert_test(status == 200 and bob_single_rep_code["repair_id"] == rep1_code, "M3. Customer Bob accesses single repair by repair_id code")

    # N. Customer Charlie cannot see Bob's repair
    status, err = api_request("GET", f"/repairs/{rep1_id}", token=charlie_token)
    assert_test(status in (403, 404), f"N1. Customer Charlie cannot view Bob's repair (HTTP {status})")

    status, charlie_repairs = api_request("GET", "/repairs/my", token=charlie_token)
    assert_test(status == 200 and rep1_id not in [r["id"] for r in charlie_repairs], "N2. Charlie's repair list does not contain Bob's repair")

    # S1. Invalid status transitions rejected (from RECEIVED)
    status, err = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/status", {"status": "READY"}, token=alice_token)
    assert_test(status == 409, "S1. Invalid transition: RECEIVED -> READY rejected with 409")

    status, err = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/status", {"status": "COMPLETED"}, token=alice_token)
    assert_test(status == 409, "S2. Invalid transition: RECEIVED -> COMPLETED rejected with 409")

    status, err = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/status", {"status": "REPAIRING"}, token=alice_token)
    assert_test(status == 409, "S3. Invalid transition: RECEIVED -> REPAIRING rejected with 409")

    # O. Status transition: RECEIVED -> DIAGNOSING
    status, diag_rep = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/status", {
        "status": "DIAGNOSING",
        "note": "Diagnosing motherboard and display assembly",
    }, token=alice_token)
    all_responses_dump.append(diag_rep)
    assert_test(status == 200 and diag_rep["status"] == "DIAGNOSING", "O. Status: RECEIVED -> DIAGNOSING")

    # U. Shop owner adds repair note without changing status
    status, note_resp = api_request("POST", f"/shop-owner/repairs/{rep1_id}/history", {
        "note": "Motherboard circuits tested fine. Only display replacement required.",
    }, token=alice_token)
    all_responses_dump.append(note_resp)
    assert_test(status == 201 and note_resp["note"] == "Motherboard circuits tested fine. Only display replacement required.", "U. Shop owner adds repair note -> 201")

    # V. Shop owner sets estimated cost
    # Edge: Negative estimate fails validation -> 422
    status, err = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/estimate", {"estimated_cost": -250}, token=alice_token)
    assert_test(status == 422, "Edge: Negative estimate returns 422")

    status, est_rep = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/estimate", {"estimated_cost": 3200}, token=alice_token)
    all_responses_dump.append(est_rep)
    assert_test(status == 200 and float(est_rep["estimated_cost"]) == 3200.0, "V. Shop owner sets estimated cost to 3200")

    # W. Customer sees estimated cost
    status, cust_view = api_request("GET", f"/repairs/{rep1_id}", token=bob_token)
    all_responses_dump.append(cust_view)
    assert_test(status == 200 and float(cust_view["estimated_cost"]) == 3200.0 and cust_view.get("customer_approved") is not True, "W. Customer sees estimated cost")

    # Edge: Charlie attempts to approve Bob's estimate -> 403
    status, err = api_request("POST", f"/repairs/{rep1_id}/approve-estimate", token=charlie_token)
    assert_test(status == 403, "Edge: Charlie cannot approve Bob's estimate -> 403")

    # X. Customer Bob approves estimate
    status, approved_rep = api_request("POST", f"/repairs/{rep1_id}/approve-estimate", token=bob_token)
    all_responses_dump.append(approved_rep)
    assert_test(status == 200 and approved_rep.get("customer_approved") is True, "X. Customer approves estimate successfully")

    # P. Status: DIAGNOSING -> REPAIRING
    status, rep_state = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/status", {
        "status": "REPAIRING",
        "note": "Installed new genuine AMOLED panel",
    }, token=alice_token)
    all_responses_dump.append(rep_state)
    assert_test(status == 200 and rep_state["status"] == "REPAIRING", "P. Status: DIAGNOSING -> REPAIRING")

    # Q. Status: REPAIRING -> READY
    status, ready_state = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/status", {
        "status": "READY",
        "note": "Screen assembly complete, passes all calibration tests",
    }, token=alice_token)
    all_responses_dump.append(ready_state)
    assert_test(status == 200 and ready_state["status"] == "READY", "Q. Status: REPAIRING -> READY")

    # R. Status: READY -> COMPLETED
    status, comp_state = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/status", {
        "status": "COMPLETED",
        "note": "Device handed over to delivery / customer",
    }, token=alice_token)
    all_responses_dump.append(comp_state)
    assert_test(
        status == 200
        and comp_state["status"] == "COMPLETED"
        and comp_state.get("completed_at") is not None,
        "R. Status: READY -> COMPLETED with completed_at timestamp",
    )

    # S4. Attempting to update a COMPLETED repair -> 409
    status, err = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/status", {"status": "REPAIRING"}, token=alice_token)
    assert_test(status == 409, "S4. COMPLETED repair cannot transition to REPAIRING -> 409")

    # Edge: Estimate update on completed repair -> 409
    status, err = api_request("PATCH", f"/shop-owner/repairs/{rep1_id}/estimate", {"estimated_cost": 4000}, token=alice_token)
    assert_test(status == 409, "Edge: Updating estimate on COMPLETED repair -> 409")

    # Edge: Customer approves already completed repair -> 409
    status, err = api_request("POST", f"/repairs/{rep1_id}/approve-estimate", token=bob_token)
    assert_test(status == 409, "Edge: Approving estimate on COMPLETED repair -> 409")

    # T. History entries for all status changes
    hist_statuses = [h["status"] for h in comp_state.get("history", [])]
    assert_test(
        "RECEIVED" in hist_statuses
        and "DIAGNOSING" in hist_statuses
        and "REPAIRING" in hist_statuses
        and "READY" in hist_statuses
        and "COMPLETED" in hist_statuses,
        "T. Complete audit history exists: RECEIVED, DIAGNOSING, REPAIRING, READY, COMPLETED",
    )

    # Y. Public tracking endpoint (GET /track/{repair_id}) works WITHOUT login
    status, public_data = api_request("GET", f"/track/{rep1_code}")
    all_responses_dump.append(public_data)
    assert_test(
        status == 200
        and public_data.get("repair_id") == rep1_code
        and public_data.get("shop_name") in ("Alice's Phone Repairs", "Alice Repairs")
        and public_data.get("status") == "COMPLETED"
        and len(public_data.get("history", [])) >= 5,
        "Y. Public tracking endpoint works without login",
    )

    # Z. Public tracking does NOT expose customer private data
    public_str = json.dumps(public_data)
    assert_test(
        "bob@test.com" not in public_str
        and "customer_id" not in public_str
        and "customer" not in public_data
        and "pickup_address" not in public_str
        and "phone" not in public_data
        and "customer_phone" not in public_str
        and "password_hash" not in public_str,
        "Z. Public tracking does not expose customer email, phone, address, or customer_id",
    )

    # Edge: Nonexistent Repair ID in public tracking -> 404
    status, err = api_request("GET", "/track/NONEXISTENT-CODE")
    assert_test(status == 404, "Edge: Nonexistent Repair ID in public tracking -> 404")

    # AA. Admin can list all repairs
    status, admin_repairs = api_request("GET", "/admin/repairs", token=admin_token)
    all_responses_dump.append(admin_repairs)
    admin_rep_ids = [r["id"] for r in admin_repairs]
    assert_test(status == 200 and rep1_id in admin_rep_ids, "AA1. Admin lists all repairs")

    status, admin_comp_filter = api_request("GET", "/admin/repairs?status=COMPLETED", token=admin_token)
    assert_test(status == 200 and any(r["id"] == rep1_id for r in admin_comp_filter), "AA2. Admin filters repairs by status")

    # AB. Customer cannot access admin repairs -> 403
    status, err = api_request("GET", "/admin/repairs", token=bob_token)
    assert_test(status == 403, "AB. Customer cannot access /admin/repairs -> 403")

    # AC. Shop owner cannot access admin repairs -> 403
    status, err = api_request("GET", "/admin/repairs", token=alice_token)
    assert_test(status == 403, "AC. Shop owner cannot access /admin/repairs -> 403")

    # AD. Unauthenticated access to protected endpoints -> 401
    status, _ = api_request("GET", "/shop-owner/repairs")
    assert_test(status == 401, "AD1. Unauthenticated /shop-owner/repairs -> 401")
    status, _ = api_request("GET", "/repairs/my")
    assert_test(status == 401, "AD2. Unauthenticated /repairs/my -> 401")
    status, _ = api_request("GET", "/admin/repairs")
    assert_test(status == 401, "AD3. Unauthenticated /admin/repairs -> 401")

    # Test second repair for Cancelled workflow
    # Customer Charlie creates pickup for Alice's shop
    status, p2 = api_request("POST", "/pickups", {
        "shop_id": 1,
        "device_type": "Tablet",
        "device_brand": "Apple",
        "device_model": "iPad Air",
        "problem_description": "Battery replacement",
        "pickup_address": "456 University Rd, Noida",
    }, token=charlie_token)
    p2_id = p2["id"]
    api_request("POST", f"/shop-owner/pickups/{p2_id}/accept", token=alice_token)
    api_request("PATCH", f"/shop-owner/pickups/{p2_id}/status", {"status": "SCHEDULED"}, token=alice_token)
    api_request("PATCH", f"/shop-owner/pickups/{p2_id}/status", {"status": "PICKED_UP"}, token=alice_token)
    api_request("PATCH", f"/shop-owner/pickups/{p2_id}/status", {"status": "RECEIVED"}, token=alice_token)

    status, rep2 = api_request("POST", "/shop-owner/repairs", {"pickup_id": p2_id}, token=alice_token)
    rep2_id = rep2["id"]

    # Edge: Cancel directly from RECEIVED
    status, cancel_resp = api_request("PATCH", f"/shop-owner/repairs/{rep2_id}/status", {
        "status": "CANCELLED",
        "note": "Customer requested cancellation prior to diagnosis",
    }, token=alice_token)
    assert_test(status == 200 and cancel_resp["status"] == "CANCELLED", "Edge: Cancel repair directly from RECEIVED -> 200")

    # Edge: CANCELLED repair cannot transition -> 409
    status, err = api_request("PATCH", f"/shop-owner/repairs/{rep2_id}/status", {"status": "RECEIVED"}, token=alice_token)
    assert_test(status == 409, "Edge: CANCELLED repair cannot transition back to RECEIVED -> 409")

    # Edge: Cannot approve estimate on repair with no estimated cost
    # Customer Charlie creates pickup 3 -> RECEIVED -> Repair 3
    status, p3 = api_request("POST", "/pickups", {
        "shop_id": 1,
        "device_type": "Smartwatch",
        "device_brand": "Garmin",
        "pickup_address": "789 Cyber Hub, Gurugram",
    }, token=charlie_token)
    p3_id = p3["id"]
    api_request("POST", f"/shop-owner/pickups/{p3_id}/accept", token=alice_token)
    api_request("PATCH", f"/shop-owner/pickups/{p3_id}/status", {"status": "SCHEDULED"}, token=alice_token)
    api_request("PATCH", f"/shop-owner/pickups/{p3_id}/status", {"status": "PICKED_UP"}, token=alice_token)
    api_request("PATCH", f"/shop-owner/pickups/{p3_id}/status", {"status": "RECEIVED"}, token=alice_token)
    status, rep3 = api_request("POST", "/shop-owner/repairs", {"pickup_id": p3_id}, token=alice_token)
    rep3_id = rep3["id"]

    status, err = api_request("POST", f"/repairs/{rep3_id}/approve-estimate", token=charlie_token)
    assert_test(status == 409, "Edge: Approving estimate when no estimate has been set -> 409")

    # AF. Confirm no password_hash appears in any response
    full_dump_str = json.dumps(all_responses_dump)
    assert_test("password_hash" not in full_dump_str, "AF. Confirm no password_hash appears in any response payload")

    print("\n==================================================")
    print(f"RESULTS: {passed}/{total} TESTS PASSED (0 FAILURES)")
    print("==================================================\n")


if __name__ == "__main__":
    run_tests()
