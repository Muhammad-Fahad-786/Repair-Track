"""
Security utilities for RepairTrack.

Responsibilities:
- Password hashing and verification (Argon2 via pwdlib)
- JWT creation and decoding (PyJWT)

Nothing in here touches the database or HTTP layer.
"""
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing — Argon2 is the current recommended algorithm
# ---------------------------------------------------------------------------

_pwd_hasher = PasswordHash.recommended()


def hash_password(plain_password: str) -> str:
    """Return a secure Argon2 hash of *plain_password*."""
    return _pwd_hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches *hashed_password*."""
    return _pwd_hasher.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(payload: dict) -> str:
    """
    Create a signed JWT access token.

    *payload* should contain at minimum: sub, role, email.
    iat and exp are added automatically.
    """
    now = datetime.now(timezone.utc)
    claims = payload.copy()
    claims.update(
        {
            "iat": now,
            "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        }
    )
    return jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.

    Raises jwt.InvalidTokenError (or a subclass) on any failure:
    - expired token
    - bad signature
    - malformed token

    The caller is responsible for handling these exceptions.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
