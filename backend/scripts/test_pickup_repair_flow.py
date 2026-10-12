"""
Verification of Shop Owner Pickup -> Repair Flow & Duplicate Protection
Tests:
1. Alice logs in
2. Pickup #1 is RECEIVED and has associated repair RT-2026-DEL-001
3. Backend duplicate protection correctly rejects POST /shop-owner/repairs for pickup #1 with 409
4. Pickup #2 has no repair record (when RECEIVED, ready for repair creation)
5. Simulates frontend lookup mapping: repairsByPickupId correctly identifies existing vs non-existing repair
"""
import requests

BASE = "http://127.0.0.1:8000/api/v1"

def main():
    print("Verifying Shop Owner Pickup -> Repair Flow...")

    # 1. Login Alice
    res = requests.post(f"{BASE}/auth/login", json={"email": "alice@test.com", "password": "password123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    alice_token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {alice_token}"}
    print("  [PASS] Alice logged in successfully.")

    # 2. Fetch Pickups
    p_res = requests.get(f"{BASE}/shop-owner/pickups", headers=headers)
    assert p_res.status_code == 200, f"Pickups failed: {p_res.text}"
    pickups = p_res.json()
    print(f"  [PASS] Retrieved {len(pickups)} pickups for Alice's shop.")

    # 3. Fetch Repairs
    r_res = requests.get(f"{BASE}/shop-owner/repairs", headers=headers)
    assert r_res.status_code == 200, f"Repairs failed: {r_res.text}"
    repairs = r_res.json()
    print(f"  [PASS] Retrieved {len(repairs)} repairs for Alice's shop.")

    # 4. Build frontend mapping simulation
    repairs_by_pickup_id = {}
    for r in repairs:
        p_id = r.get("pickup_request_id")
        if p_id:
            repairs_by_pickup_id[p_id] = r

    # 5. Verify Pickup #1
    p1 = next((p for p in pickups if p["id"] == 1), None)
    assert p1 is not None, "Pickup #1 not found"
    assert p1["status"] == "RECEIVED", f"Pickup #1 status is {p1['status']}, expected RECEIVED"
    assert 1 in repairs_by_pickup_id, "Pickup #1 has no repair in mapping"
    p1_repair = repairs_by_pickup_id[1]
    assert p1_repair["repair_id"] == "RT-2026-DEL-001", f"Unexpected repair: {p1_repair['repair_id']}"
    assert p1_repair["status"] == "REPAIRING", f"Unexpected repair status: {p1_repair['status']}"
    print(f"  [PASS] Pickup #1 correctly maps to existing repair {p1_repair['repair_id']} (Status: {p1_repair['status']}).")
    print("         -> UI will show: 'Repair Already Created', ID: RT-2026-DEL-001, Status: Repairing, and 'View Repair' CTA.")

    # 6. Verify Backend Duplicate Protection for Pickup #1
    dup_res = requests.post(f"{BASE}/shop-owner/repairs", headers=headers, json={"pickup_id": 1})
    assert dup_res.status_code == 409, f"Expected 409 Conflict, got {dup_res.status_code}: {dup_res.text}"
    detail = dup_res.json().get("detail", "")
    assert "A repair record already exists for pickup request #1" in detail, f"Unexpected error message: {detail}"
    print(f"  [PASS] Backend duplicate protection verified: {detail}")

    # 7. Verify a pickup without repair (Pickup #2)
    p2 = next((p for p in pickups if p["id"] == 2), None)
    assert p2 is not None, "Pickup #2 not found"
    assert 2 not in repairs_by_pickup_id, "Pickup #2 should not have an existing repair"
    print(f"  [PASS] Pickup #2 has no existing repair record in mapping.")
    print("         -> When RECEIVED, UI will show: 'Device Received' and 'Create Repair Job' CTA.")

    print("\nALL SHOP OWNER PICKUP -> REPAIR TESTS PASSED!")

if __name__ == "__main__":
    main()
