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

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider configuration -- read from environment only
# ---------------------------------------------------------------------------

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

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


def _call_gemini(problem_description: str) -> dict:
    """Call Google Gemini API using the google-genai SDK and return a validated result dict."""
    try:
        from google import genai  # type: ignore[import-untyped]
        from google.genai import types  # type: ignore[import-untyped]
    except ImportError as exc:
        raise RuntimeError(
            "google-genai package is not installed. "
            "Run: pip install google-genai"
        ) from exc

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. "
            "AI analysis is unavailable."
        )

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = _PROMPT_TEMPLATE.format(problem_description=problem_description)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=256,
            ),
        )
        raw_text = response.text
    except Exception as exc:
        logger.warning("Gemini API call failed: %s", type(exc).__name__)
        raise RuntimeError(
            "AI provider request failed. Please try again later."
        ) from exc

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

    Returns one of:

    Success:
        {"success": True, "category": "Battery / Power", "priority": "HIGH", "summary": "..."}

    Failure (AI unavailable):
        {"success": False, "message": "AI analysis is currently unavailable. You can continue manually."}

    This function NEVER raises -- all exceptions are captured internally.
    """
    try:
        result = _call_gemini(problem_description)
        return {
            "success": True,
            "category": result["category"],
            "priority": result["priority"],
            "summary": result["summary"],
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
