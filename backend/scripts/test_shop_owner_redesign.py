"""
RepairTrack -- Comprehensive Verification Suite for Redesigned Shop Owner Registration Flow
Verifies:
1. Unauthenticated Shop Owner Registration (No Customer account, no Customer JWT)
2. Password Hashing & Security (Argon2, zero plaintext, zero hash leakage)
3. Duplicate Email Matrix (Customer conflict, Shop Owner duplicate, Pending duplicate)
4. Pending State Isolation (No Customer privileges, no Shop Owner access, 403 on login)
5. Secure Application Status Lookup (via token & credentials)
6. Applicant Isolation (Applicant A cannot access Applicant B's application)
7. Admin Rejection Workflow (Reason stored, no user created, no shop created)
8. Admin Approval Workflow (Atomic user creation, SHOP_OWNER role, Shop created & approved)
9. Post-Approval Login & Dashboard Access (Shop Owner login succeeds, dashboard APIs work)
10. Strict RBAC Cross-Role Enforcement
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
from app.models.enums import ApplicationStatus, ShopStatus, UserRole
from app.models.shop import Shop
from app.models.shop_application import ShopApplication
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


def run_redesign_verification():
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
    print("REPAIRTRACK: SHOP OWNER REGISTRATION REDESIGN VERIFICATION")
    print("========================================================\n")

    ts = int(time.time())

    # ------------------------------------------------------------------
    # 1. UNAUTHENTICATED SHOP OWNER REGISTRATION
    # ------------------------------------------------------------------
    applicant_email = f"carlos_{ts}@example.com"
    applicant_pw = "CarlosPass99!"
    app_payload = {
        "name": "Carlos Gomez",
        "email": applicant_email,
        "password": applicant_pw,
        "phone": "+91 98765 11111",
        "shop_name": f"Carlos Tech Repairs {ts}",
        "description": "Specialized in micro-soldering and tablet repairs.",
        "address": "100 MG Road",
        "city": "Indore",
        "services": "Screen Replacement, Diagnostics",
        "pickup_available": True,
    }

    # Submit without any Authorization header
    status, app_res = api_call("POST", "/shop-applications/", app_payload)
    test(status == 201, "REG-01", "Unauthenticated applicant submits shop application successfully (201 Created)")
    test(app_res.get("status") == "PENDING", "REG-02", "Application status is PENDING")
    test(app_res.get("applicant_email") == applicant_email, "REG-03", "Applicant email accurately returned")
    test(app_res.get("applicant_name") == "Carlos Gomez", "REG-04", "Applicant name accurately returned")
    test("application_token" in app_res and len(app_res["application_token"]) > 20, "REG-05", "Application tracking token returned")
    carlos_app_id = app_res["id"]
    carlos_token = app_res["application_token"]

    # Security: Ensure no password hash is returned in response
    test("password" not in app_res and "password_hash" not in app_res, "SEC-01", "Password and password_hash NOT leaked in API response")

    # Database state: verify application row
    db = SessionLocal()
    try:
        db_app = db.get(ShopApplication, carlos_app_id)
        test(db_app is not None, "DB-01", "Application record found in database")
        test(db_app.applicant_id is None, "DB-02", "applicant_id is NULL (no user row linked before approval)")
        test(db_app.password_hash is not None and db_app.password_hash.startswith("$argon2"), "DB-03", "Password is securely hashed with Argon2 in DB")
        test(applicant_pw not in db_app.password_hash, "DB-04", "Plaintext password never stored in DB")

        # Crucial requirement: No user record created in users table while pending
        db_user = db.query(User).filter(User.email == applicant_email).first()
        test(db_user is None, "DB-05", "No row created in users table for pending applicant")
    finally:
        db.close()

    # ------------------------------------------------------------------
    # 2. DUPLICATE EMAIL MATRIX
    # ------------------------------------------------------------------
    # A. Email belongs to existing CUSTOMER -> 409 Conflict
    status, dup_cust = api_call("POST", "/shop-applications/", {
        "name": "Bob Duplicate",
        "email": "bob@test.com",
        "password": "password123",
        "shop_name": "Bob Duplicate Shop",
        "city": "Indore",
    })
    test(status == 409, "DUP-01", "Application with existing CUSTOMER email returns 409 Conflict")

    # B. Email belongs to existing SHOP_OWNER -> 409 Conflict
    status, dup_owner = api_call("POST", "/shop-applications/", {
        "name": "Alice Duplicate",
        "email": "alice@test.com",
        "password": "password123",
        "shop_name": "Alice Duplicate Shop",
        "city": "Indore",
    })
    test(status == 409, "DUP-02", "Application with existing SHOP_OWNER email returns 409 Conflict")

    # C. Email belongs to existing pending application -> 409 Conflict
    status, dup_pending = api_call("POST", "/shop-applications/", {
        "name": "Carlos Second",
        "email": applicant_email,
        "password": "password123",
        "shop_name": "Carlos Second Shop",
        "city": "Indore",
    })
    test(status == 409, "DUP-03", "Duplicate application for already pending email returns 409 Conflict")

    # D. Missing required input -> 422 Unprocessable Entity
    status, inv_input = api_call("POST", "/shop-applications/", {
        "name": "Missing Shop",
        "email": f"missing_{ts}@example.com",
        "password": "password123",
        # Missing shop_name
    })
    test(status == 422, "VAL-01", "Missing required shop_name returns 422 Unprocessable Entity")

    # ------------------------------------------------------------------
    # 3. PENDING APPLICANT RESTRICTIONS & LOGIN BEHAVIOR
    # ------------------------------------------------------------------
    # Carlos tries to log in through normal /auth/login
    status, pend_login = api_call("POST", "/auth/login", {
        "email": applicant_email,
        "password": applicant_pw,
    })
    test(status == 403, "REST-01", "Pending applicant login attempt returns 403 Forbidden")
    test("pending" in pend_login.get("detail", "").lower(), "REST-02", "Login error clearly indicates application is pending review")

    # Carlos's application_token cannot be used to impersonate a User on protected endpoints
    status, bad_auth_me = api_call("GET", "/auth/me", token=carlos_token)
    test(status == 401, "REST-03", "Application tracking token cannot access /auth/me (rejected as invalid user token)")

    status, bad_shop_api = api_call("GET", "/shop-owner/pickups", token=carlos_token)
    test(status == 401, "REST-04", "Application tracking token cannot access Shop Owner APIs")

    # ------------------------------------------------------------------
    # 4. APPLICATION STATUS LOOKUP
    # ------------------------------------------------------------------
    # A. Status check via token
    status, stat_token = api_call("GET", f"/shop-applications/status?token={carlos_token}")
    test(status == 200 and stat_token["id"] == carlos_app_id, "STAT-01", "Status check via tracking token returns 200 OK")
    test(stat_token["status"] == "PENDING", "STAT-02", "Status check reflects PENDING")
    test(stat_token["shop_name"] == f"Carlos Tech Repairs {ts}", "STAT-03", "Status check includes correct shop_name")

    # B. Status check via credentials
    status, stat_cred = api_call("POST", "/shop-applications/status-check", {
        "email": applicant_email,
        "password": applicant_pw,
    })
    test(status == 200 and stat_cred["id"] == carlos_app_id, "STAT-04", "Status check via email+password returns 200 OK")
    test(stat_cred["status"] == "PENDING", "STAT-05", "Status check via credentials reflects PENDING")

    # C. Status check with wrong password -> 401 Unauthorized
    status, stat_bad_pw = api_call("POST", "/shop-applications/status-check", {
        "email": applicant_email,
        "password": "wrong_password_here",
    })
    test(status == 401, "STAT-06", "Status check with incorrect password returns 401 Unauthorized")

    # ------------------------------------------------------------------
    # 5. APPLICANT ISOLATION (Applicant A cannot access Applicant B)
    # ------------------------------------------------------------------
    diana_email = f"diana_{ts}@example.com"
    diana_pw = "DianaPass88!"
    _, diana_res = api_call("POST", "/shop-applications/", {
        "name": "Diana Prince",
        "email": diana_email,
        "password": diana_pw,
        "phone": "+91 98765 22222",
        "shop_name": f"Diana Repairs {ts}",
        "city": "Bhopal",
        "pickup_available": False,
    })
    diana_app_id = diana_res["id"]
    diana_token = diana_res["application_token"]

    # Diana's token only gives Diana's status
    _, diana_stat = api_call("GET", f"/shop-applications/status?token={diana_token}")
    test(diana_stat["id"] == diana_app_id and diana_stat["id"] != carlos_app_id, "ISO-01", "Diana's token only resolves Diana's application")

    # Diana's credentials cannot access Carlos's application
    status, iso_cred = api_call("POST", "/shop-applications/status-check", {
        "email": applicant_email,
        "password": diana_pw,
    })
    test(status == 401, "ISO-02", "Diana's credentials cannot query Carlos's application (401)")

    # ------------------------------------------------------------------
    # 6. ADMIN REJECTION WORKFLOW
    # ------------------------------------------------------------------
    # Admin login
    _, admin_login = api_call("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    admin_token = admin_login["access_token"]

    # Reject Diana's application
    rej_reason = "Workshop address could not be verified by physical inspection."
    status, rej_res = api_call("POST", f"/admin/shop-applications/{diana_app_id}/reject", {
        "rejection_reason": rej_reason,
    }, token=admin_token)
    test(status == 200 and rej_res["status"] == "REJECTED", "REJ-01", "Admin rejects application successfully")
    test(rej_res["rejection_reason"] == rej_reason, "REJ-02", "Rejection reason saved correctly")

    # Diana checks status via credentials
    status, diana_stat_after = api_call("POST", "/shop-applications/status-check", {
        "email": diana_email,
        "password": diana_pw,
    })
    test(status == 200 and diana_stat_after["status"] == "REJECTED", "REJ-03", "Rejected applicant sees REJECTED status")
    test(diana_stat_after["rejection_reason"] == rej_reason, "REJ-04", "Rejected applicant sees rejection reason")

    # Diana tries to log in -> 403 Forbidden with rejection reason
    status, diana_login = api_call("POST", "/auth/login", {
        "email": diana_email,
        "password": diana_pw,
    })
    test(status == 403, "REJ-05", "Rejected applicant login returns 403 Forbidden")
    test("rejected" in diana_login.get("detail", "").lower(), "REJ-06", "Login error states application was rejected")

    # Verify no user created for Diana
    db = SessionLocal()
    try:
        diana_user = db.query(User).filter(User.email == diana_email).first()
        test(diana_user is None, "REJ-07", "Rejected applicant is never created in users table")
        diana_shop = db.query(Shop).filter(Shop.name == f"Diana Repairs {ts}").first()
        test(diana_shop is None, "REJ-08", "No shop is created for rejected application")
    finally:
        db.close()

    # ------------------------------------------------------------------
    # 7. ADMIN APPROVAL WORKFLOW
    # ------------------------------------------------------------------
    status, approve_res = api_call("POST", f"/admin/shop-applications/{carlos_app_id}/approve", token=admin_token)
    test(status == 200 and approve_res["status"] == "APPROVED", "APP-01", "Admin approves Carlos's application (200 OK)")

    # Verify database state after approval
    db = SessionLocal()
    try:
        app_after = db.get(ShopApplication, carlos_app_id)
        test(app_after.status == ApplicationStatus.APPROVED, "APP-02", "DB Application status is APPROVED")
        test(app_after.applicant_id is not None, "APP-03", "DB Application linked to newly created User ID")
        test(app_after.shop_id is not None, "APP-04", "DB Application linked to newly created Shop ID")
        test(app_after.reviewed_by is not None, "APP-05", "DB Application records admin reviewer ID")

        # Verify created User record
        carlos_user = db.get(User, app_after.applicant_id)
        test(carlos_user is not None, "APP-06", "User record created in users table upon approval")
        test(carlos_user.role == UserRole.SHOP_OWNER, "APP-07", "User role is SHOP_OWNER")
        test(carlos_user.email == applicant_email, "APP-08", "User email matches applicant email")
        test(carlos_user.is_active is True, "APP-09", "User account is_active is True")

        # Verify created Shop record
        carlos_shop = db.get(Shop, app_after.shop_id)
        test(carlos_shop is not None, "APP-10", "Shop record created upon approval")
        test(carlos_shop.owner_id == carlos_user.id, "APP-11", "Shop owner_id matches created user")
        test(carlos_shop.status == ShopStatus.APPROVED, "APP-12", "Shop status is APPROVED")
        test(carlos_shop.is_active is True, "APP-13", "Shop is_active is True")
        carlos_slug = carlos_shop.slug
    finally:
        db.close()

    # ------------------------------------------------------------------
    # 8. POST-APPROVAL LOGIN & SHOP OWNER DASHBOARD ACCESS
    # ------------------------------------------------------------------
    # Carlos logs in via /auth/login with credentials provided during registration
    status, carlos_login = api_call("POST", "/auth/login", {
        "email": applicant_email,
        "password": applicant_pw,
    })
    test(status == 200 and "access_token" in carlos_login, "LOGIN-01", "Approved applicant logs in successfully (200 OK)")
    test(carlos_login["user"]["role"] == "SHOP_OWNER", "LOGIN-02", "Login user role is SHOP_OWNER")
    carlos_auth_token = carlos_login["access_token"]

    # Carlos accesses Shop Owner protected endpoints
    status, carlos_pickups = api_call("GET", "/shop-owner/pickups", token=carlos_auth_token)
    test(status == 200 and isinstance(carlos_pickups, list), "DASH-01", "Approved Shop Owner can access /shop-owner/pickups")

    status, carlos_repairs = api_call("GET", "/shop-owner/repairs", token=carlos_auth_token)
    test(status == 200 and isinstance(carlos_repairs, list), "DASH-02", "Approved Shop Owner can access /shop-owner/repairs")

    # Carlos's shop appears in public directory
    status, public_shops = api_call("GET", "/shops")
    test(status == 200 and any(s["slug"] == carlos_slug for s in public_shops), "PUB-01", "Newly approved shop is visible in public /shops directory")

    status, slug_shop = api_call("GET", f"/shops/slug/{carlos_slug}")
    test(status == 200 and slug_shop["name"] == f"Carlos Tech Repairs {ts}", "PUB-02", "Shop profile accessible by slug")

    # ------------------------------------------------------------------
    # 9. RBAC & CROSS-ROLE PRIVILEGE ENFORCEMENT
    # ------------------------------------------------------------------
    # Shop Owner Carlos cannot access Admin APIs -> 403 Forbidden
    status, _ = api_call("GET", "/admin/shop-applications/", token=carlos_auth_token)
    test(status == 403, "RBAC-01", "Shop Owner Carlos cannot access /admin/shop-applications/ (403 Forbidden)")

    status, _ = api_call("GET", "/admin/pickups", token=carlos_auth_token)
    test(status == 403, "RBAC-02", "Shop Owner Carlos cannot access /admin/pickups (403 Forbidden)")

    # Customer Bob cannot access Shop Owner Carlos's APIs -> 403 Forbidden
    _, bob_login = api_call("POST", "/auth/login", {"email": "bob@test.com", "password": "password123"})
    bob_token = bob_login["access_token"]
    status, _ = api_call("GET", "/shop-owner/pickups", token=bob_token)
    test(status == 403, "RBAC-03", "Customer Bob cannot access /shop-owner/pickups (403 Forbidden)")

    # Unauthenticated request to protected endpoints -> 401 Unauthorized
    status, _ = api_call("GET", "/shop-owner/pickups")
    test(status == 401, "RBAC-04", "Unauthenticated request to /shop-owner/pickups returns 401 Unauthorized")

    # Cannot approve or reject already approved application -> 409 Conflict
    status, re_app = api_call("POST", f"/admin/shop-applications/{carlos_app_id}/approve", token=admin_token)
    test(status == 409, "SAFE-01", "Re-approving approved application returns 409 Conflict")

    status, re_rej = api_call("POST", f"/admin/shop-applications/{carlos_app_id}/reject", {"rejection_reason": "test"}, token=admin_token)
    test(status == 409, "SAFE-02", "Rejecting approved application returns 409 Conflict")

    print("\n========================================================")
    print(f"ALL {passed}/{total} SHOP OWNER REDESIGN TESTS PASSED!")
    print("========================================================\n")


if __name__ == "__main__":
    run_redesign_verification()
