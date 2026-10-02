"""
Public Shop Discovery & Profile routes -- /api/v1/shops

GET /                List approved, active shops (supports location, search, category filters)
GET /slug/{slug}     Get public shop profile by slug
GET /{shop_id}       Get public shop profile by ID
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.shop import PublicShopResponse
from app.services import shop_service as svc

router = APIRouter(prefix="/shops", tags=["Public -- Shops"])


@router.get(
    "",
    response_model=list[PublicShopResponse],
    summary="List all approved and active repair shops (Public)",
)
def list_public_shops(
    location: str | None = Query(default=None, description="Filter by city or address"),
    search: str | None = Query(default=None, description="Search by name, description, category, or city"),
    category: str | None = Query(default=None, description="Filter by shop category"),
    db: Session = Depends(get_db),
) -> list[PublicShopResponse]:
    """
    Publicly lists approved and active repair shops.
    Inactive, pending, and rejected shops are excluded.
    No authentication required.
    """
    return svc.get_public_shops(db, location=location, search=search, category=category)


@router.get(
    "/slug/{slug}",
    response_model=PublicShopResponse,
    summary="Get approved and active repair shop by slug (Public)",
)
def get_public_shop_by_slug(
    slug: str,
    db: Session = Depends(get_db),
) -> PublicShopResponse:
    """
    Publicly fetches a single shop profile by slug.
    Returns 404 if the shop does not exist or is not approved and active.
    No authentication required.
    """
    try:
        return svc.get_public_shop_by_slug(db, slug)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/{shop_id}",
    response_model=PublicShopResponse,
    summary="Get approved and active repair shop by ID (Public)",
)
def get_public_shop_by_id(
    shop_id: int,
    db: Session = Depends(get_db),
) -> PublicShopResponse:
    """
    Publicly fetches a single shop profile by ID.
    Returns 404 if the shop does not exist or is not approved and active.
    No authentication required.
    """
    try:
        return svc.get_public_shop_by_id(db, shop_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
