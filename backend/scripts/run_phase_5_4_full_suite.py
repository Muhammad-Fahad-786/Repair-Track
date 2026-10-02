"""
Comprehensive Automated Test Suite for RepairTrack Phase 5.4:
Real Customer Pickup Flow Integration
Verifies all functional, role-based, ownership security, and regression rules.
"""
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal
from app.models.enums import PickupStatus, ShopStatus, UserRole
from app.models.pickup import PickupRequest
from app.models.shop import Shop
from app.models.user import User

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


def run_phase_5_4_tests():
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
    print("REPAIRTRACK PHASE 5.4: REAL CUSTOMER PICKUP FLOW SUITE")
    print("========================================================\n")

    # ------------------------------------------------------------------
    # 1. AUTH & ROLES
    # ------------------------------------------------------------------
    # Customer A login
    st, res = api_call("POST", "/auth/login", {"email": "bob@test.com", "password": "password123"})
    test(st == 200 and res["user"]["role"] == "CUSTOMER", "AUTH-01", "Customer A (bob@test.com) logs in successfully")
    cust_a_token = res["access_token"]
    cust_a_id = res["user"]["id"]

    # Customer B login
    st, res = api_call("POST", "/auth/login", {"email": "charlie@test.com", "password": "password123"})
    test(st == 200 and res["user"]["role"] == "CUSTOMER", "AUTH-02", "Customer B (charlie@test.com) logs in successfully")
    cust_b_token = res["access_token"]
    cust_b_id = res["user"]["id"]

    # Shop Owner login
    st, res = api_call("POST", "/auth/login", {"email": "alice@test.com", "password": "password123"})
    test(st == 200 and res["user"]["role"] == "SHOP_OWNER", "AUTH-03", "Shop Owner (alice@test.com) logs in successfully")
    owner_token = res["access_token"]

    # Admin login
    st, res = api_call("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    test(st == 200 and res["user"]["role"] == "ADMIN", "AUTH-04", "Admin (admin@repairtrack.com) logs in successfully")
    admin_token = res["access_token"]

    # ------------------------------------------------------------------
    # 2. PUBLIC SHOP DISCOVERY & CONTEXT PRESERVATION
    # ------------------------------------------------------------------
    st, shops_list = api_call("GET", "/shops")
    test(st == 200 and isinstance(shops_list, list) and len(shops_list) > 0, "SHOP-01", "Public shops discovery returns active approved shops")
    active_shop = shops_list[0]
    shop_id = active_shop["id"]
    shop_slug = active_shop["slug"]

    st, shop_detail = api_call("GET", f"/shops/slug/{shop_slug}")
    test(st == 200 and shop_detail["id"] == shop_id, "SHOP-02", "Shop details by slug resolves correct shop ID for pickup booking")

    # ------------------------------------------------------------------
    # 3. PICKUP CREATION & FIELD MAPPINGS
    # ------------------------------------------------------------------
    ts = int(time.time())
    pickup_payload = {
        "shop_id": shop_id,
        "device_type": "Smartphone",
        "device_brand": "Samsung",
        "device_model": "Galaxy S23",
        "problem_description": f"Cracked AMOLED display and touch unresponsive on lower third. [Ref {ts}]",
        "pickup_address": "Flat 402, Lotus Towers, MG Road, Indore",
        "preferred_date": "2026-10-05",
        "preferred_time": "14:00:00",
    }

    # Customer A creates pickup
    st, new_pickup = api_call("POST", "/pickups", pickup_payload, token=cust_a_token)
    test(st == 201, "PICKUP-CREATE-01", "Customer A successfully creates pickup (status 201)")
    test("id" in new_pickup and isinstance(new_pickup["id"], int), "PICKUP-CREATE-02", "Response contains real database pickup ID")
    test(new_pickup["status"] == "PENDING", "PICKUP-CREATE-03", "Initial pickup status is strictly PENDING")
    test(new_pickup["shop_id"] == shop_id, "PICKUP-CREATE-04", "Pickup references the selected shop_id correctly")
    test(new_pickup["customer_id"] == cust_a_id, "PICKUP-CREATE-05", "Backend derives customer_id from authenticated token")
    test(new_pickup["device_brand"] == "Samsung", "PICKUP-CREATE-06", "device_brand is accurately preserved")
    test(new_pickup["device_model"] == "Galaxy S23", "PICKUP-CREATE-07", "device_model is accurately preserved")
    test(new_pickup["pickup_address"] == pickup_payload["pickup_address"], "PICKUP-CREATE-08", "pickup_address is accurately preserved")
    test(new_pickup["preferred_date"] == pickup_payload["preferred_date"], "PICKUP-CREATE-09", "preferred_date is accurately preserved")
    test("shop" in new_pickup and new_pickup["shop"]["name"] == active_shop["name"], "PICKUP-CREATE-10", "Safe embedded shop object is populated")
    cust_a_pickup_id = new_pickup["id"]

    # ------------------------------------------------------------------
    # 4. VALIDATION & SECURITY ON CREATION
    # ------------------------------------------------------------------
    # Missing required field (device_type) -> 422
    st, err_res = api_call("POST", "/pickups", {
        "shop_id": shop_id,
        "pickup_address": "Some address",
    }, token=cust_a_token)
    test(st == 422, "VAL-01", "Missing required field returns 422 Unprocessable Entity")

    # Missing required field (pickup_address) -> 422
    st, err_res = api_call("POST", "/pickups", {
        "shop_id": shop_id,
        "device_type": "Laptop",
    }, token=cust_a_token)
    test(st == 422, "VAL-02", "Missing pickup_address returns 422 Unprocessable Entity")

    # Non-existent shop -> 404
    st, err_res = api_call("POST", "/pickups", {
        "shop_id": 999999,
        "device_type": "Laptop",
        "pickup_address": "Test address",
    }, token=cust_a_token)
    test(st == 404, "VAL-03", "Non-existent shop ID returns 404 Not Found")

    # Role enforcement: Shop Owner cannot create customer pickup -> 403
    st, err_res = api_call("POST", "/pickups", pickup_payload, token=owner_token)
    test(st == 403, "SEC-ROLE-01", "Shop Owner cannot create customer pickup request (403 Forbidden)")

    # Role enforcement: Admin cannot create customer pickup -> 403
    st, err_res = api_call("POST", "/pickups", pickup_payload, token=admin_token)
    test(st == 403, "SEC-ROLE-02", "Admin cannot create customer pickup request (403 Forbidden)")

    # Unauthenticated visitor cannot create pickup -> 401
    st, err_res = api_call("POST", "/pickups", pickup_payload, token=None)
    test(st == 401, "SEC-ROLE-03", "Unauthenticated request returns 401 Unauthorized")

    # ------------------------------------------------------------------
    # 5. CUSTOMER PICKUP LISTING (GET /pickups/my)
    # ------------------------------------------------------------------
    # Customer A lists their pickups
    st, my_pickups = api_call("GET", "/pickups/my", token=cust_a_token)
    test(st == 200 and isinstance(my_pickups, list), "LIST-01", "GET /api/v1/pickups/my returns 200 and list")
    test(any(p["id"] == cust_a_pickup_id for p in my_pickups), "LIST-02", "Newly created pickup is present in Customer A's list")

    # Customer B lists their pickups (should NOT contain Customer A's pickup)
    st, cust_b_pickups = api_call("GET", "/pickups/my", token=cust_b_token)
    test(st == 200 and isinstance(cust_b_pickups, list), "LIST-03", "GET /api/v1/pickups/my for Customer B returns 200")
    test(all(p["id"] != cust_a_pickup_id for p in cust_b_pickups), "LIST-04", "Customer B's list does not contain Customer A's pickup")

    # Unauthenticated list -> 401
    st, err_res = api_call("GET", "/pickups/my", token=None)
    test(st == 401, "LIST-05", "Unauthenticated GET /pickups/my returns 401")

    # ------------------------------------------------------------------
    # 6. PICKUP DETAILS & OWNERSHIP SECURITY (GET /pickups/{id})
    # ------------------------------------------------------------------
    # Customer A gets their own pickup -> 200
    st, detail_res = api_call("GET", f"/pickups/{cust_a_pickup_id}", token=cust_a_token)
    test(st == 200 and detail_res["id"] == cust_a_pickup_id, "DETAIL-01", "Customer A can fetch their own pickup details")
    test(detail_res["status"] == "PENDING", "DETAIL-02", "Detail status matches PENDING")
    test("shop" in detail_res and detail_res["shop"]["id"] == shop_id, "DETAIL-03", "Detail includes embedded shop details")

    # CRITICAL SECURITY: Customer B attempts to get Customer A's pickup -> 403 Forbidden!
    st, sec_res = api_call("GET", f"/pickups/{cust_a_pickup_id}", token=cust_b_token)
    test(st == 403, "SEC-OWNER-01", "Customer B accessing Customer A's pickup returns 403 Forbidden (Ownership enforcement)")

    # Non-existent pickup ID -> 404
    st, err_res = api_call("GET", "/pickups/999999", token=cust_a_token)
    test(st == 404, "DETAIL-04", "GET non-existent pickup returns 404 Not Found")

    # Unauthenticated detail -> 401
    st, err_res = api_call("GET", f"/pickups/{cust_a_pickup_id}", token=None)
    test(st == 401, "DETAIL-05", "Unauthenticated GET /pickups/{id} returns 401")

    # ------------------------------------------------------------------
    # 7. REGRESSION: SHOP OWNER & ADMIN ENDPOINTS REMAIN INTACT
    # ------------------------------------------------------------------
    # Shop owner endpoints still function
    st, owner_pickups = api_call("GET", "/shop-owner/pickups", token=owner_token)
    test(st == 200 and isinstance(owner_pickups, list), "REG-01", "GET /api/v1/shop-owner/pickups remains intact")

    # Admin endpoints still function
    st, admin_pickups = api_call("GET", "/admin/pickups", token=admin_token)
    test(st == 200 and isinstance(admin_pickups, list), "REG-02", "GET /api/v1/admin/pickups remains intact")

    # Customer cannot access shop owner pickup endpoint
    st, err_res = api_call("GET", "/shop-owner/pickups", token=cust_a_token)
    test(st == 403, "REG-03", "Customer cannot access /api/v1/shop-owner/pickups (403 Forbidden)")

    # Customer cannot access admin pickup endpoint
    st, err_res = api_call("GET", "/admin/pickups", token=cust_a_token)
    test(st == 403, "REG-04", "Customer cannot access /api/v1/admin/pickups (403 Forbidden)")

    print("\n========================================================")
    print(f"ALL {passed}/{total} PHASE 5.4 INTEGRATION TESTS PASSED!")
    print("========================================================\n")


if __name__ == "__main__":
    run_phase_5_4_tests()
