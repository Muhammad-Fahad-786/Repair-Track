"""
Comprehensive Automated Test Suite for RepairTrack Phase 5.8:
AI Repair Assistance

Verifies:
1. Authentication & Authorization
   - Unauthenticated -> 401 on POST /shop-owner/repairs/analyze
   - Customer       -> 403 on POST /shop-owner/repairs/analyze
   - Admin          -> 403 on POST /shop-owner/repairs/analyze
   - Shop Owner     -> 200 or controlled response (with or without AI key)

2. Input Validation (schema enforced by FastAPI/Pydantic)
   - Missing problem_description -> 422 Unprocessable Entity
   - problem_description too short (<20 chars) -> 422
   - problem_description too long (>2000 chars) -> 422
   - Valid input (>= 20 chars) -> 200 with valid JSON body

3. AI Response Contract
   - When AI key is absent, backend returns {success: false, message: ...} with HTTP 200
     (repair workflow is NEVER broken by AI failure)
   - When AI key is present and valid, backend returns {success: true, category, priority, summary}
   - category must be one of the 11 allowed values
   - priority must be one of: LOW, MEDIUM, HIGH
   - summary must be a non-empty string
   - success field is always boolean

4. Security & Privacy
   - Response body NEVER contains an actual API key value
   - No stack traces or internal error details leaked in any failure response

5. Regression Guard
   - Existing GET /shop-owner/repairs endpoint still returns 200 with a list (not broken)
   - Existing POST /shop-owner/repairs/{id}/history still works (for non-terminal repairs)
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

ALLOWED_CATEGORIES = {
    "Battery / Power",
    "Display",
    "Charging",
    "Software",
    "Performance",
    "Network / Connectivity",
    "Camera",
    "Audio",
    "Keyboard / Input",
    "Physical Damage",
    "Other",
}

ALLOWED_PRIORITIES = {"LOW", "MEDIUM", "HIGH"}

SAMPLE_DESCRIPTION = (
    "My phone shuts down whenever I remove the charger and "
    "the battery drains very quickly even in standby mode."
)


def api_call(method: str, path: str, data=None, token=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else None
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_data = json.loads(content)
        except Exception:
            err_data = {"raw": content}
        return e.code, err_data


def run_tests():
    total = 0
    passed = 0

    def check(desc: str, condition: bool):
        nonlocal total, passed
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {desc}")
        else:
            print(f"  [FAIL] {desc}")

    print("\n" + "=" * 70)
    print(" RepairTrack -- Phase 5.8: AI Repair Assistance Test Suite")
    print("=" * 70 + "\n")

    # ------------------------------------------------------------------
    # 1. AUTHENTICATE TEST ACTORS
    # ------------------------------------------------------------------
    print("[1] Authenticating test actors...")

    st, res = api_call("POST", "/auth/login", {"email": "admin@repairtrack.com", "password": "adminpass123"})
    check("Admin login returns 200", st == 200)
    admin_token = res.get("access_token") if res else None

    st, res = api_call("POST", "/auth/login", {"email": "bob@test.com", "password": "password123"})
    check("Customer Bob login returns 200", st == 200)
    bob_token = res.get("access_token") if res else None

    st, res = api_call("POST", "/auth/login", {"email": "alice@test.com", "password": "password123"})
    check("Shop Owner Alice login returns 200", st == 200)
    alice_token = res.get("access_token") if res else None
    check("Alice token received", bool(alice_token))

    # ------------------------------------------------------------------
    # 2. AUTHORIZATION (RBAC) ENFORCEMENT
    # ------------------------------------------------------------------
    print("\n[2] Verifying RBAC on POST /shop-owner/repairs/analyze...")

    payload = {"problem_description": SAMPLE_DESCRIPTION}

    # Unauthenticated
    st, _ = api_call("POST", "/shop-owner/repairs/analyze", payload, token=None)
    check("Unauthenticated -> 401 Unauthorized", st == 401)

    # Customer
    st, _ = api_call("POST", "/shop-owner/repairs/analyze", payload, token=bob_token)
    check("Customer -> 403 Forbidden", st == 403)

    # Admin
    st, _ = api_call("POST", "/shop-owner/repairs/analyze", payload, token=admin_token)
    check("Admin -> 403 Forbidden", st == 403)

    # ------------------------------------------------------------------
    # 3. INPUT VALIDATION (Pydantic schema)
    # ------------------------------------------------------------------
    print("\n[3] Testing input validation (Pydantic enforced)...")

    # Missing field
    st, _ = api_call("POST", "/shop-owner/repairs/analyze", {}, token=alice_token)
    check("Missing problem_description -> 422 Unprocessable Entity", st == 422)

    # Too short (<20 chars)
    st, res = api_call("POST", "/shop-owner/repairs/analyze", {"problem_description": "Short"}, token=alice_token)
    check("Description < 20 chars -> 422 Unprocessable Entity", st == 422)

    # Exactly 19 chars (edge case)
    nineteen = "A" * 19
    st, _ = api_call("POST", "/shop-owner/repairs/analyze", {"problem_description": nineteen}, token=alice_token)
    check("Description = 19 chars -> 422 Unprocessable Entity", st == 422)

    # Exactly 20 chars (minimum boundary)
    twenty = "A" * 20
    st, body = api_call("POST", "/shop-owner/repairs/analyze", {"problem_description": twenty}, token=alice_token)
    check("Description = 20 chars -> 200 OK (boundary valid)", st == 200)

    # Too long (>2000 chars)
    too_long = "A" * 2001
    st, _ = api_call("POST", "/shop-owner/repairs/analyze", {"problem_description": too_long}, token=alice_token)
    check("Description > 2000 chars -> 422 Unprocessable Entity", st == 422)

    # Exactly 2000 chars (maximum boundary)
    max_len = "A" * 2000
    st, _ = api_call("POST", "/shop-owner/repairs/analyze", {"problem_description": max_len}, token=alice_token)
    check("Description = 2000 chars -> 200 OK (boundary valid)", st == 200)

    # ------------------------------------------------------------------
    # 4. RESPONSE CONTRACT -- AI KEY ABSENT (most common CI scenario)
    # ------------------------------------------------------------------
    print("\n[4] Testing AI response contract with valid description...")

    st, body = api_call("POST", "/shop-owner/repairs/analyze", payload, token=alice_token)
    check("POST /shop-owner/repairs/analyze returns 200 (always)", st == 200)
    check("Response is a JSON object", isinstance(body, dict))
    check("Response contains 'success' field (bool)", "success" in body and isinstance(body["success"], bool))

    if body and body.get("success") is True:
        # AI key is configured and valid
        print("  [INFO] AI key is active. Validating full AI response...")
        check("Success: 'category' field present", "category" in body)
        check("Success: 'priority' field present", "priority" in body)
        check("Success: 'summary' field present", "summary" in body)
        check("Success: category is in allowed set", body.get("category") in ALLOWED_CATEGORIES)
        check("Success: priority is in allowed set", body.get("priority") in ALLOWED_PRIORITIES)
        check("Success: summary is non-empty string", isinstance(body.get("summary"), str) and len(body["summary"].strip()) > 0)
    else:
        # AI key absent -- controlled failure expected
        print("  [INFO] AI key absent/unconfigured. Validating controlled failure response...")
        check("Failure: 'message' field present", "message" in body)
        check("Failure: 'success' is False", body.get("success") is False)
        check("Failure: message is non-empty string", isinstance(body.get("message"), str) and len(body["message"]) > 0)
        check("Failure: no 'category' leakage", "category" not in body)
        check("Failure: no 'priority' leakage", "priority" not in body)

    # ------------------------------------------------------------------
    # 5. SECURITY & PRIVACY AUDIT
    # ------------------------------------------------------------------
    print("\n[5] Security & privacy audit of AI response...")

    if body:
        raw_text = json.dumps(body).lower()
        # Check there is no actual API key value exposed (a real key looks like "AIza..." - 39 chars)
        has_real_api_key = bool(re.search(r'"aiza[0-9a-z_\-]{30,}"', raw_text))
        check("Response does NOT contain a real API key value", not has_real_api_key)
        check("Response does NOT contain 'password_hash'", "password_hash" not in raw_text)
        check("Response does NOT contain 'access_token'", "access_token" not in raw_text)
        check("Response does NOT contain traceback", "traceback" not in raw_text)
        check("Response does NOT contain 'exception'", "exception" not in raw_text)

    # ------------------------------------------------------------------
    # 6. REGRESSION GUARD
    # ------------------------------------------------------------------
    print("\n[6] Regression guard -- existing endpoints must not be broken...")

    # GET /shop-owner/repairs still works
    st, repairs = api_call("GET", "/shop-owner/repairs", token=alice_token)
    check("GET /shop-owner/repairs still returns 200 (not broken)", st == 200)
    check("GET /shop-owner/repairs still returns a list", isinstance(repairs, list))

    # Check that a real repair exists to run history test
    if repairs:
        # Find a non-terminal repair (COMPLETED/CANCELLED are terminal, can't add history)
        non_terminal = [r for r in repairs if r.get("status") not in ("COMPLETED", "CANCELLED")]
        if non_terminal:
            rid = non_terminal[0].get("repair_id") or non_terminal[0].get("id")
            check("Found non-terminal repair for history regression test", bool(rid))
            if rid:
                st2, _ = api_call(
                    "POST",
                    f"/shop-owner/repairs/{rid}/history",
                    {"note": "Regression test: AI feature did not break note posting."},
                    token=alice_token,
                )
                check(f"POST /shop-owner/repairs/{rid}/history returns 200 or 201", st2 in (200, 201))
        else:
            print("  [SKIP] All repairs are in terminal state. Skipping history regression test.")
    else:
        print("  [SKIP] No repairs found, skipping history regression test.")

    # ------------------------------------------------------------------
    # FINAL SUMMARY
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print(f" Phase 5.8 Test Suite Results: {passed}/{total} Passed")
    print("=" * 70)

    if passed == total:
        print("\nALL PHASE 5.8 AI ASSISTANCE TESTS PASSED!\n")
        return 0
    else:
        print(f"\nFAILURE: {total - passed} assertion(s) failed.\n")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
