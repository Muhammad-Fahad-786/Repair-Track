"""
AI Service -- Phase 5.8 AI Repair Assistance

Architecture:
  React -> FastAPI endpoint -> ai_service.analyze_repair_problem()
                           -> Google Gemini API (google-genai SDK)
                           -> Validated structured response
                           -> FastAPI returns to React

Rules:
- API key is read from environment only; never hardcoded or logged.
- All failures are captured and returned as a controlled error dict.
- The service is the ONLY place that touches the AI provider.
- The repair workflow must never fail because of AI errors.
- The AI is an assistant only: it suggests, the Shop Owner decides.
"""
import json
import logging
import os
import re

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider configuration -- read from environment only
# ---------------------------------------------------------------------------

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

# Timeout budget constants
# Gemini API enforces a 10s minimum deadline. Backend wraps the call in a controlled
# 12s limit, allowing the frontend (with 25s timeout) to reliably receive the response.
GEMINI_CLIENT_TIMEOUT_MS: int = 10000
BACKEND_CONTROLLED_TIMEOUT_SECONDS: float = 12.0

# ---------------------------------------------------------------------------
# Allowed output values
# ---------------------------------------------------------------------------

ALLOWED_PRIORITIES = {"LOW", "MEDIUM", "HIGH"}

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

# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

_PROMPT_TEMPLATE = (
    "You are a repair shop assistant AI. "
    "Analyze ONLY the following customer problem description and return a JSON object "
    "with exactly these three fields:\n\n"
    '- "category": one of: Battery / Power, Display, Charging, Software, Performance, '
    "Network / Connectivity, Camera, Audio, Keyboard / Input, Physical Damage, Other\n"
    '- "priority": one of: LOW, MEDIUM, HIGH\n'
    '- "summary": a 1-2 sentence summary using cautious wording such as "possible", '
    '"likely", or "based on the reported symptoms". '
    "Do NOT claim certainty about hardware faults. Do NOT estimate cost. "
    "Do NOT recommend parts. Do NOT make business decisions.\n\n"
    "Customer problem description:\n"
    '"""{problem_description}"""\n\n'
    "Respond ONLY with a valid JSON object. No markdown, no explanation, no additional text.\n"
    'Example: {{"category": "Battery / Power", "priority": "HIGH", '
    '"summary": "Based on the reported symptoms, a possible battery or power-related '
    'issue causing unexpected shutdowns."}}'
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _normalize_priority(raw: str) -> str:
    """Normalize priority to LOW/MEDIUM/HIGH; falls back to MEDIUM."""
    upper = (raw or "").strip().upper()
    if upper in ALLOWED_PRIORITIES:
        return upper
    for p in ALLOWED_PRIORITIES:
        if p in upper:
            return p
    return "MEDIUM"


def _normalize_category(raw: str) -> str:
    """Return as-is if valid; otherwise Other."""
    stripped = (raw or "").strip()
    if stripped in ALLOWED_CATEGORIES:
        return stripped
    for cat in ALLOWED_CATEGORIES:
        if cat.lower() == stripped.lower():
            return cat
    return "Other"


def _extract_json(text: str) -> dict:
    """Extract and parse a JSON object from the AI text response."""
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in AI response.")
    return json.loads(match.group())


def _validate_ai_dict(data: dict) -> dict:
    """Validate and normalize an AI result dict."""
    if not isinstance(data, dict):
        raise ValueError("AI response is not a JSON object.")

    category = _normalize_category(data.get("category", "Other"))
    priority = _normalize_priority(data.get("priority", "MEDIUM"))
    summary = str(data.get("summary", "")).strip()

    if not summary:
        raise ValueError("AI response missing summary.")

    return {
        "category": category,
        "priority": priority,
        "summary": summary,
    }


# ---------------------------------------------------------------------------
# Gemini provider (google-genai SDK)
# ---------------------------------------------------------------------------


def _call_gemini_worker(problem_description: str) -> dict:
    """Execute Gemini request with single-attempt timeout and fast fallback."""
    try:
        from google import genai  # type: ignore[import-untyped]
        from google.genai import types  # type: ignore[import-untyped]
    except ImportError as exc:
        raise RuntimeError(
            "google-genai package is not installed. Run: pip install google-genai"
        ) from exc

    api_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY or GEMINI_API_KEY
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. AI analysis is unavailable."
        )

    primary_model = (
        os.getenv("GEMINI_MODEL")
        or settings.GEMINI_MODEL
        or GEMINI_MODEL
        or "gemini-3.6-flash"
    )

    http_options = types.HttpOptions(
        client_args={"timeout": 11.0},
        retry_options=types.HttpRetryOptions(attempts=1),
    )
    client = genai.Client(api_key=api_key, http_options=http_options)

    prompt = _PROMPT_TEMPLATE.format(problem_description=problem_description)

    # Candidate models: primary model first, followed by fast fallback if different
    fallback_model = "gemini-3.8-flash" if primary_model == "gemini-3.6-flash" else "gemini-3.6-flash"
    models_to_try = [primary_model]
    if fallback_model != primary_model:
        models_to_try.append(fallback_model)

    raw_text = None
    last_exc = None
    import time
    start_time = time.time()

    for idx, model in enumerate(models_to_try):
        # If trying fallback, only proceed if we have enough time remaining
        elapsed = time.time() - start_time
        if idx > 0 and (BACKEND_CONTROLLED_TIMEOUT_SECONDS - elapsed) < 5.0:
            break

        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=300,
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_budget=0),
                ),
            )
            raw_text = response.text
            if raw_text:
                break
        except Exception as exc:
            logger.warning("Gemini model %s failed: %s (%s)", model, type(exc).__name__, exc)
            last_exc = exc

    if not raw_text:
        err_str = str(last_exc or "").lower()
        if "timeout" in err_str or "timed out" in err_str or "deadline" in err_str:
            raise TimeoutError("AI analysis timed out. You can retry or continue manually.") from last_exc
        raise RuntimeError(
            "AI provider request failed. Please try again later."
        ) from last_exc

    try:
        data = _extract_json(raw_text)
        return _validate_ai_dict(data)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Failed to parse Gemini response: %s", type(exc).__name__)
        raise RuntimeError(
            "AI provider returned an unexpected response format."
        ) from exc


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def analyze_repair_problem(problem_description: str) -> dict:
    """
    Analyze a customer repair problem description and return a structured result.

    Enforces:
    - Gemini timeout (10s) < Backend controlled timeout (12s) < Frontend timeout (25s).
    - AI remains optional and failure returns a controlled response.
    - Never exposes GEMINI_API_KEY or stack traces.

    Returns one of:
    Success:
        {"success": True, "category": "Battery / Power", "priority": "HIGH", "summary": "..."}
    Failure (AI unavailable):
        {"success": False, "message": "..."}

    This function NEVER raises -- all exceptions are captured internally.
    """
    import concurrent.futures

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini_worker, problem_description)
            result = future.result(timeout=BACKEND_CONTROLLED_TIMEOUT_SECONDS)

        return {
            "success": True,
            "category": result["category"],
            "priority": result["priority"],
            "summary": result["summary"],
        }
    except concurrent.futures.TimeoutError:
        logger.warning("AI analysis timed out after backend limit of %ss", BACKEND_CONTROLLED_TIMEOUT_SECONDS)
        return {
            "success": False,
            "message": "AI analysis timed out. You can retry or continue manually.",
        }
    except TimeoutError as exc:
        return {
            "success": False,
            "message": str(exc),
        }
    except RuntimeError as exc:
        return {
            "success": False,
            "message": str(exc),
        }
    except Exception:
        logger.exception("Unexpected error in AI service")
        return {
            "success": False,
            "message": "AI analysis is currently unavailable. You can continue manually.",
        }
