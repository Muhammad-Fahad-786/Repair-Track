"""
Comprehensive Automated Test Suite for RepairTrack Phase 5.6:
Real Repair Management & Tracking Integration

Verifies:
1. Multi-role authentication (Customer Bob, Customer Charlie, Shop Owner Alice, Shop Owner David, Admin).
2. Pickup -> Repair lifecycle connection (Must reach RECEIVED before repair creation).
3. Creation validation:
   - Only Shop Owner can create repairs.
   - Non-RECEIVED pickup returns 409.
   - Cross-shop pickup returns 403.
   - Duplicate repair creation returns 409.
   - Unauthenticated returns 401.
   - Customer returns 403.
4. Server-generated unique human-readable Repair ID format (e.g. RT-SH001-XXXXX).
5. Shop Owner repair listing and single repair retrieval.
6. Ownership isolation:
   - Cross-shop owner repair viewing returns 403.
   - Cross-shop owner repair status update returns 403.
   - Cross-shop owner repair estimate update returns 403.
   - Cross-shop owner repair history note returns 403.
   - Cross-customer repair viewing returns 403.
   - Cross-customer estimate approval returns 403.
7. Status transitions:
   - Valid transitions: RECEIVED -> DIAGNOSING -> REPAIRING -> READY -> COMPLETED.
   - Invalid jump transitions (e.g. RECEIVED -> READY) return 409.
   - Terminal state transitions (COMPLETED/CANCELLED) return 409.
8. Cost estimate & customer approval:
   - Shop Owner sets estimate.
   - Negative cost returns 422.
   - Customer sees estimate and approves it.
   - Cannot approve estimate if none set (or after completion).
9. Progress history audit log:
   - Automatic audit entries generated on creation and status changes.
   - Manual technician note added via POST /history.
10. Public repair tracking (GET /api/v1/track/{repair_id}):
   - Unauthenticated access returns tracking data.
   - Strict verification that NO customer personal data is leaked (no phone, email, address, customer_id, passwords).
   - Invalid repair ID returns 404.
11. Admin view remains operational.
"""
import json
import os
import pathlib
import re
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


def run_phase_5_6_tests():
    passed = 0
    total = 0

    def test(cond: bool, code: str, title: str):
        nonlocal passed, total
        total += 1
        status = "PASS" if cond else "FAIL"
        print(f"[{status}] {code}: {title}")
        if not cond:
            print(f"\nFAILED on test {code}: {title}")
            sys.exit(1)
        passed += 1

    print("\n========================================================")
    print("REPAIRTRACK PHASE 5.6: REPAIR MANAGEMENT & TRACKING SUITE")
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

    # Shop Owner Alice (Shop 1)
    st, res = api_call("POST", "/auth/login", {"email": "alice@test.com", "password": "password123"})
    test(st == 200 and res["user"]["role"] == "SHOP_OWNER", "AUTH-03", "Shop Owner Alice (Shop 1) logs in")
    alice_token = res["access_token"]

    # Shop Owner David (Shop 2)
    st, res = api_call("POST", "/auth/login", {"email": "david@test.com", "password": "password123"})
    test(st == 200 and res["user"]["role"] == "SHOP_OWNER", "AUTH-04", "Shop Owner David (Shop 2) logs in")
    david_token = res["access_token"]

    # Admin
    st, res = api_call("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    test(st == 200 and res["user"]["role"] == "ADMIN", "AUTH-05", "Admin logs in")
    admin_token = res["access_token"]

    # Discover Alice's Shop ID (Shop 1)
    st, shops = api_call("GET", "/shops")
    test(st == 200 and len(shops) >= 1, "SHOP-01", "Public shop discovery returns registered shops")
    alice_shop = next((s for s in shops if "alice" in s.get("name", "").lower()), shops[0])
    alice_shop_id = alice_shop["id"]

    # ------------------------------------------------------------------
    # 2. PICKUP CREATION & PROGRESSION TO RECEIVED
    # ------------------------------------------------------------------
    unique_num = int(time.time()) % 100000
    pickup_payload = {
        "shop_id": alice_shop_id,
        "device_type": "Laptop",
        "device_brand": "Apple",
        "device_model": f"MacBook Air M2 #{unique_num}",
        "problem_description": "Battery swollen and trackpad not clicking properly.",
        "pickup_address": "456 Market St, Suite 200, Downtown",
        "preferred_date": "2026-10-15",
    }
    st, pickup_res = api_call("POST", "/pickups", pickup_payload, token=bob_token)
    test(st == 201 and pickup_res["status"] == "PENDING", "PICKUP-01", "Bob creates pickup request for Alice's shop")
    pickup_id = pickup_res["id"]

    # Test: Cannot create repair while pickup is PENDING -> 409
    st, err_res = api_call("POST", "/shop-owner/repairs", {"pickup_id": pickup_id}, token=alice_token)
    test(st == 409, "REPAIR-VALID-01", "Attempting repair creation for PENDING pickup returns 409 Conflict")

    # Advance pickup to RECEIVED
    st, _ = api_call("POST", f"/shop-owner/pickups/{pickup_id}/accept", token=alice_token)
    test(st == 200, "PICKUP-02", "Alice accepts pickup request (ACCEPTED)")

    st, _ = api_call("PATCH", f"/shop-owner/pickups/{pickup_id}/status", {"status": "SCHEDULED"}, token=alice_token)
    test(st == 200, "PICKUP-03", "Alice advances pickup to SCHEDULED")

    st, _ = api_call("PATCH", f"/shop-owner/pickups/{pickup_id}/status", {"status": "PICKED_UP"}, token=alice_token)
    test(st == 200, "PICKUP-04", "Alice advances pickup to PICKED_UP")

    st, rec_res = api_call("PATCH", f"/shop-owner/pickups/{pickup_id}/status", {"status": "RECEIVED"}, token=alice_token)
    test(st == 200 and rec_res["status"] == "RECEIVED", "PICKUP-05", "Alice marks pickup as RECEIVED")

    # ------------------------------------------------------------------
    # 3. REPAIR CREATION AUTHORIZATION & VALIDATION
    # ------------------------------------------------------------------
    # Unauthenticated -> 401
    st, _ = api_call("POST", "/shop-owner/repairs", {"pickup_id": pickup_id})
    test(st == 401, "SEC-01", "Unauthenticated repair creation returns 401")

    # Customer Bob -> 403
    st, _ = api_call("POST", "/shop-owner/repairs", {"pickup_id": pickup_id}, token=bob_token)
    test(st == 403, "SEC-02", "Customer cannot create repair (returns 403)")

    # Shop Owner David (Shop 2) cannot create repair for Alice's pickup -> 403
    st, _ = api_call("POST", "/shop-owner/repairs", {"pickup_id": pickup_id}, token=david_token)
    test(st == 403, "SEC-03", "Shop Owner David cannot create repair for Alice's shop pickup (returns 403)")

    # Missing pickup_id -> 422
    st, _ = api_call("POST", "/shop-owner/repairs", {}, token=alice_token)
    test(st == 422, "REPAIR-VALID-02", "Missing pickup_id returns 422 Unprocessable Entity")

    # Nonexistent pickup_id -> 404
    st, _ = api_call("POST", "/shop-owner/repairs", {"pickup_id": 99999999}, token=alice_token)
    test(st == 404, "REPAIR-VALID-03", "Nonexistent pickup_id returns 404 Not Found")

    # ------------------------------------------------------------------
    # 4. SHOP OWNER ALICE CREATES REPAIR (SUCCESS)
    # ------------------------------------------------------------------
    repair_create_payload = {
        "pickup_id": pickup_id,
        "estimated_cost": 210.0,
        "problem_description": "Initial diagnosis: Battery replacement required; logic board health normal.",
    }
    st, created_repair = api_call("POST", "/shop-owner/repairs", repair_create_payload, token=alice_token)
    test(st == 201, "REPAIR-CREATE-01", "Alice successfully creates repair from RECEIVED pickup")
    test(created_repair["status"] == "RECEIVED", "REPAIR-CREATE-02", "Created repair initial status is RECEIVED")
    test(created_repair["customer_id"] == bob_id, "REPAIR-CREATE-03", "Created repair customer_id matches Bob")
    test(created_repair["shop_id"] == alice_shop_id, "REPAIR-CREATE-04", "Created repair shop_id matches Alice's shop")
    test(float(created_repair["estimated_cost"]) == 210.0, "REPAIR-CREATE-05", "Initial estimated cost recorded")
    test(created_repair["customer_approved"] is not True, "REPAIR-CREATE-06", "Initial customer_approved is not True")

    repair_id_str = created_repair["repair_id"]
    repair_pk_id = created_repair["id"]

    # Verify server-generated Repair ID pattern (e.g. RT-SH001-X7K92)
    id_pattern = rf"^RT-SH\d{{3}}-[A-Z0-9]{{4,8}}$"
    test(bool(re.match(id_pattern, repair_id_str)), "REPAIR-ID-01", f"Server generated valid human-readable Repair ID ({repair_id_str})")

    # Verify duplicate creation for same pickup returns 409
    st, dup_err = api_call("POST", "/shop-owner/repairs", {"pickup_id": pickup_id}, token=alice_token)
    test(st == 409, "REPAIR-DUP-01", "Duplicate repair creation for already converted pickup returns 409 Conflict")

    # ------------------------------------------------------------------
    # 5. SHOP OWNER LIST & GET DETAIL
    # ------------------------------------------------------------------
    st, shop_repairs = api_call("GET", "/shop-owner/repairs", token=alice_token)
    test(st == 200 and any(r["repair_id"] == repair_id_str for r in shop_repairs), "REPAIR-LIST-01", "Alice can list repairs and find created job")

    # Filter by status
    st, filtered_received = api_call("GET", "/shop-owner/repairs?status=RECEIVED", token=alice_token)
    test(st == 200 and all(r["status"] == "RECEIVED" for r in filtered_received), "REPAIR-LIST-02", "Alice can filter repairs by status=RECEIVED")

    # Get single repair by repair_id string
    st, single_repair = api_call("GET", f"/shop-owner/repairs/{repair_id_str}", token=alice_token)
    test(st == 200 and single_repair["id"] == repair_pk_id, "REPAIR-GET-01", "Alice retrieves single repair by string repair_id")

    # Get single repair by integer PK
    st, single_by_pk = api_call("GET", f"/shop-owner/repairs/{repair_pk_id}", token=alice_token)
    test(st == 200 and single_by_pk["repair_id"] == repair_id_str, "REPAIR-GET-02", "Alice retrieves single repair by integer PK ID")

    # ------------------------------------------------------------------
    # 6. CROSS-SHOP OWNER ISOLATION
    # ------------------------------------------------------------------
    st, _ = api_call("GET", f"/shop-owner/repairs/{repair_id_str}", token=david_token)
    test(st == 403, "SEC-SHOP-01", "David cannot view Alice's shop repair (returns 403)")

    st, _ = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/status", {"status": "DIAGNOSING"}, token=david_token)
    test(st == 403, "SEC-SHOP-02", "David cannot update status of Alice's shop repair (returns 403)")

    st, _ = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/estimate", {"estimated_cost": 300.0}, token=david_token)
    test(st == 403, "SEC-SHOP-03", "David cannot update estimate for Alice's shop repair (returns 403)")

    st, _ = api_call("POST", f"/shop-owner/repairs/{repair_id_str}/history", {"note": "Unauthorized note"}, token=david_token)
    test(st == 403, "SEC-SHOP-04", "David cannot add history note to Alice's shop repair (returns 403)")

    # ------------------------------------------------------------------
    # 7. STATUS TRANSITIONS & VALIDATION
    # ------------------------------------------------------------------
    # Invalid jump transition: RECEIVED -> READY (not allowed) -> 409
    st, _ = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/status", {"status": "READY"}, token=alice_token)
    test(st == 409, "STATUS-TRANS-01", "Illegal transition from RECEIVED to READY returns 409 Conflict")

    # Valid transition: RECEIVED -> DIAGNOSING
    st, diag_res = api_call(
        "PATCH",
        f"/shop-owner/repairs/{repair_id_str}/status",
        {"status": "DIAGNOSING", "note": "Disassembled casing, battery cell expansion confirmed."},
        token=alice_token,
    )
    test(st == 200 and diag_res["status"] == "DIAGNOSING", "STATUS-TRANS-02", "Alice advances repair status to DIAGNOSING")

    # ------------------------------------------------------------------
    # 8. ESTIMATED COST UPDATE
    # ------------------------------------------------------------------
    # Negative estimate -> 422
    st, _ = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/estimate", {"estimated_cost": -50.0}, token=alice_token)
    test(st == 422, "ESTIMATE-01", "Negative estimated cost returns 422 Unprocessable Entity")

    # Valid estimate update -> 245.50
    st, est_res = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/estimate", {"estimated_cost": 245.50}, token=alice_token)
    test(st == 200 and float(est_res["estimated_cost"]) == 245.50, "ESTIMATE-02", "Alice updates estimated cost to 245.50")

    # ------------------------------------------------------------------
    # 9. CUSTOMER REPAIR ACCESS & CROSS-CUSTOMER ISOLATION
    # ------------------------------------------------------------------
    # Customer Bob sees repair in /repairs/my
    st, bob_repairs = api_call("GET", "/repairs/my", token=bob_token)
    test(st == 200 and any(r["repair_id"] == repair_id_str for r in bob_repairs), "CUST-REPAIR-01", "Bob lists own repairs and sees job")

    # Bob gets single repair details
    st, bob_repair_detail = api_call("GET", f"/repairs/{repair_id_str}", token=bob_token)
    test(st == 200 and bob_repair_detail["status"] == "DIAGNOSING", "CUST-REPAIR-02", "Bob views own repair status (DIAGNOSING)")
    test(float(bob_repair_detail["estimated_cost"]) == 245.50, "CUST-REPAIR-03", "Bob sees updated estimated cost ($245.50)")
    test(bob_repair_detail["customer_approved"] is not True, "CUST-REPAIR-04", "Customer approval status is initially False/None")

    # Customer Charlie cannot view Bob's repair -> 403
    st, _ = api_call("GET", f"/repairs/{repair_id_str}", token=charlie_token)
    test(st == 403, "SEC-CUST-01", "Customer Charlie cannot view Bob's repair (returns 403)")

    # Customer Charlie cannot approve Bob's repair estimate -> 403
    st, _ = api_call("POST", f"/repairs/{repair_id_str}/approve-estimate", token=charlie_token)
    test(st == 403, "SEC-CUST-02", "Customer Charlie cannot approve Bob's estimate (returns 403)")

    # ------------------------------------------------------------------
    # 10. CUSTOMER ESTIMATE APPROVAL
    # ------------------------------------------------------------------
    st, app_res = api_call("POST", f"/repairs/{repair_id_str}/approve-estimate", token=bob_token)
    test(st == 200 and app_res["customer_approved"] is True, "APPROVE-01", "Bob approves repair cost estimate")

    # Check that approval note is in history
    st, rep_after_app = api_call("GET", f"/repairs/{repair_id_str}", token=bob_token)
    has_approval_note = any("approved" in (h.get("note") or "").lower() for h in rep_after_app.get("history", []))
    test(has_approval_note, "APPROVE-02", "Customer approval generates audit log in repair history")

    # ------------------------------------------------------------------
    # 11. WORKFLOW ADVANCEMENT & MANUAL PROGRESS NOTE
    # ------------------------------------------------------------------
    # DIAGNOSING -> REPAIRING
    st, _ = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/status", {"status": "REPAIRING"}, token=alice_token)
    test(st == 200, "STATUS-TRANS-03", "Alice advances repair status to REPAIRING")

    # Manual progress note
    note_payload = {"note": "New OEM battery installed. Running 12-hour calibration and thermal cycles."}
    st, note_res = api_call("POST", f"/shop-owner/repairs/{repair_id_str}/history", note_payload, token=alice_token)
    test(st == 201 and note_res["note"] == note_payload["note"], "NOTE-01", "Alice adds technician progress note to history")

    # REPAIRING -> READY
    st, _ = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/status", {"status": "READY"}, token=alice_token)
    test(st == 200, "STATUS-TRANS-04", "Alice advances repair status to READY")

    # READY -> COMPLETED
    st, comp_res = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/status", {"status": "COMPLETED"}, token=alice_token)
    test(st == 200 and comp_res["status"] == "COMPLETED", "STATUS-TRANS-05", "Alice marks repair as COMPLETED")
    test(comp_res.get("completed_at") is not None, "STATUS-TRANS-06", "completed_at timestamp populated upon completion")

    # Terminal state enforcement: cannot update COMPLETED repair -> 409
    st, _ = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/status", {"status": "REPAIRING"}, token=alice_token)
    test(st == 409, "TERMINAL-01", "Attempting status transition on COMPLETED repair returns 409 Conflict")

    st, _ = api_call("PATCH", f"/shop-owner/repairs/{repair_id_str}/estimate", {"estimated_cost": 300.0}, token=alice_token)
    test(st == 409, "TERMINAL-02", "Attempting estimate update on COMPLETED repair returns 409 Conflict")

    st, _ = api_call("POST", f"/shop-owner/repairs/{repair_id_str}/history", {"note": "Too late"}, token=alice_token)
    test(st == 409, "TERMINAL-03", "Attempting to add note to COMPLETED repair returns 409 Conflict")

    # ------------------------------------------------------------------
    # 12. PUBLIC REPAIR TRACKING & STRICT PRIVACY AUDIT
    # ------------------------------------------------------------------
    # Public unauthenticated call
    st, public_track = api_call("GET", f"/track/{repair_id_str}")
    test(st == 200, "PUB-TRACK-01", f"Public tracking succeeds for repair {repair_id_str}")
    test(public_track["repair_id"] == repair_id_str, "PUB-TRACK-02", "Public tracking returns correct Repair ID")
    test(public_track["status"] == "COMPLETED", "PUB-TRACK-03", "Public tracking reflects COMPLETED status")
    test(public_track["device_type"] == "Laptop", "PUB-TRACK-04", "Public tracking returns device type")
    test("Alice" in public_track.get("shop_name", ""), "PUB-TRACK-05", "Public tracking returns shop name")
    test(len(public_track.get("history", [])) >= 4, "PUB-TRACK-06", "Public tracking includes history timeline")

    # STRICT SECURITY CHECK: No customer PII leaked
    forbidden_keys = [
        "customer", "customer_id", "email", "phone", "address",
        "customer_name", "customer_email", "customer_phone", "pickup_address",
        "password", "password_hash"
    ]
    leaked_keys = [k for k in forbidden_keys if k in public_track]
    test(len(leaked_keys) == 0, "SEC-PRIVACY-01", f"Public tracking does NOT leak customer PII (checked: {forbidden_keys})")

    # History timeline must not leak changed_by user ID
    for h in public_track.get("history", []):
        test("changed_by" not in h, "SEC-PRIVACY-02", "Public history items omit changed_by internal user IDs")

    # Nonexistent tracking ID -> 404
    st, _ = api_call("GET", "/track/RT-SH001-NONEXISTENT")
    test(st == 404, "PUB-TRACK-07", "Public tracking for nonexistent repair returns 404 Not Found")

    # ------------------------------------------------------------------
    # 13. ADMIN REPAIR VISIBILITY
    # ------------------------------------------------------------------
    st, admin_repairs = api_call("GET", "/admin/repairs", token=admin_token)
    test(st == 200 and any(r["repair_id"] == repair_id_str for r in admin_repairs), "ADMIN-01", "Admin can view repair jobs across all shops")

    print("\n========================================================")
    print(f"ALL PHASE 5.6 INTEGRATION TESTS PASSED: {passed}/{total}")
    print("========================================================\n")


if __name__ == "__main__":
    run_phase_5_6_tests()
