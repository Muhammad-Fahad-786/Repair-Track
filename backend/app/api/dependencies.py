"""
FastAPI dependencies for authentication and role-based access control.

Usage in routes:
    from app.api.dependencies import get_current_user, require_roles
    from app.models.enums import UserRole

    @router.get("/protected")
    def protected(user: User = Depends(get_current_user)):
        ...

    @router.get("/admin-only")
    def admin_only(user: User = Depends(require_roles(UserRole.ADMIN))):
        ...
"""
from typing import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.enums import UserRole
from app.models.user import User

# FastAPI reads the Bearer token from the Authorization header automatically.
# tokenUrl points Swagger UI to the login endpoint for the "Authorize" button.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the Bearer JWT, load the matching User from the DB, and return it.

    Raises HTTP 401 for:
    - Missing / malformed / expired tokens
    - User not found in the database
    - Inactive user accounts
    """
    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise _CREDENTIALS_EXCEPTION
        user_id = int(user_id_str)
    except (jwt.InvalidTokenError, ValueError):
        raise _CREDENTIALS_EXCEPTION

    user: User | None = db.get(User, user_id)
    if user is None:
        raise _CREDENTIALS_EXCEPTION

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_roles(*roles: UserRole) -> Callable:
    """
    Return a FastAPI dependency that enforces one of the given roles.

    Example:
        Depends(require_roles(UserRole.ADMIN, UserRole.SHOP_OWNER))
    """

    def _check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return _check_role
