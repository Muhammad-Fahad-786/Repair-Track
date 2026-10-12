"""
Verify Admin Shop Endpoints and RBAC
Tests:
- GET /api/v1/admin/shops
- GET /api/v1/admin/shops/{id}
- GET /api/v1/admin/shops/{id}/customers
- GET /api/v1/admin/shops/{id}/pickups
- GET /api/v1/admin/shops/{id}/repairs
- RBAC permissions (unauthenticated, customer, shop owner, admin)
"""
import urllib.request
import urllib.error
import json
import sys

BASE = "http://127.0.0.1:8000/api/v1"

def api(method, path, body=None, token=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw

def main():
    print("Testing Admin Shop Endpoints & Security...")

    # 1. Log in actors
    _, admin = api("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    admin_token = admin.get("access_token")

    _, alice = api("POST", "/auth/login", {"email": "alice@test.com", "password": "password123"})
    alice_token = alice.get("access_token")

    _, bob = api("POST", "/auth/login", {"email": "bob@test.com", "password": "password123"})
    bob_token = bob.get("access_token")

    # 2. RBAC tests
    s_anon, _ = api("GET", "/admin/shops")
    assert s_anon == 401, f"Expected 401 for anon, got {s_anon}"
    print("  [PASS] Unauthenticated -> 401")

    s_bob, _ = api("GET", "/admin/shops", token=bob_token)
    assert s_bob == 403, f"Expected 403 for Customer Bob, got {s_bob}"
    print("  [PASS] Customer Bob -> 403")

    s_alice, _ = api("GET", "/admin/shops", token=alice_token)
    assert s_alice == 403, f"Expected 403 for Shop Owner Alice, got {s_alice}"
    print("  [PASS] Shop Owner Alice -> 403")

    s_admin, shops = api("GET", "/admin/shops", token=admin_token)
    assert s_admin == 200, f"Expected 200 for Admin, got {s_admin}"
    assert len(shops) == 2, f"Expected 2 shops, got {len(shops)}"
    print(f"  [PASS] Admin -> 200 (retrieved {len(shops)} shops)")

    # 3. Sub-resource endpoints
    shop_id = shops[0]["id"]
    s_ov, ov = api("GET", f"/admin/shops/{shop_id}", token=admin_token)
    assert s_ov == 200, f"Overview failed: {s_ov}"
    print(f"  [PASS] GET /admin/shops/{shop_id} -> {ov['shop']['name']}")

    s_c, custs = api("GET", f"/admin/shops/{shop_id}/customers", token=admin_token)
    assert s_c == 200, f"Customers failed: {s_c}"
    print(f"  [PASS] GET /admin/shops/{shop_id}/customers -> {len(custs)} customers")

    s_p, picks = api("GET", f"/admin/shops/{shop_id}/pickups", token=admin_token)
    assert s_p == 200, f"Pickups failed: {s_p}"
    print(f"  [PASS] GET /admin/shops/{shop_id}/pickups -> {len(picks)} pickups")

    s_r, reps = api("GET", f"/admin/shops/{shop_id}/repairs", token=admin_token)
    assert s_r == 200, f"Repairs failed: {s_r}"
    print(f"  [PASS] GET /admin/shops/{shop_id}/repairs -> {len(reps)} repairs")

    print("\nALL ADMIN SHOPS TESTS PASSED!")

if __name__ == "__main__":
    main()
