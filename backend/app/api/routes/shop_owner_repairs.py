"""
Shop Owner Repair routes -- /api/v1/shop-owner/repairs

POST  /                     Create repair from RECEIVED pickup (SHOP_OWNER only)
GET   /                     List repairs for owner's shop (SHOP_OWNER only)
GET   /{repair_id}          Get single repair for owner's shop (SHOP_OWNER only)
PATCH /{repair_id}/status   Update repair status (SHOP_OWNER only)
POST  /{repair_id}/history  Add progress note / history entry (SHOP_OWNER only)
PATCH /{repair_id}/estimate Update estimated cost (SHOP_OWNER only)
POST  /analyze              AI-assisted repair analysis -- Phase 5.8 (SHOP_OWNER only)
"""
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.database import get_db
from app.models.enums import RepairStatus, UserRole
from app.models.user import User
from app.schemas.repair import (
    RepairAnalyzeError,
    RepairAnalyzeRequest,
    RepairAnalyzeResponse,
    RepairCreate,
    RepairEstimateUpdate,
    RepairHistoryCreate,
    RepairHistoryResponse,
    RepairResponse,
    RepairStatusUpdate,
)
from app.services import repair_service as svc
from app.services import ai_service

router = APIRouter(prefix="/shop-owner/repairs", tags=["Shop Owner -- Repairs"])

_shop_owner = require_roles(UserRole.SHOP_OWNER)


@router.post(
    "",
    response_model=RepairResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create repair from RECEIVED pickup (SHOP_OWNER only)",
)
@router.post(
    "/",
    response_model=RepairResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create repair from RECEIVED pickup (SHOP_OWNER only)",
    include_in_schema=False,
)
def create_repair(
    body: RepairCreate,
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> RepairResponse:
    """
    Create a new repair from a pickup request that has status RECEIVED.
    - Returns 404 if pickup request does not exist.
    - Returns 403 if pickup request belongs to another shop.
    - Returns 409 if pickup is not RECEIVED or already has a repair.
    """
    try:
        return svc.create_repair_from_pickup(db, current_user, body)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.get(
    "",
    response_model=list[RepairResponse],
    summary="List repairs for owner's shop (SHOP_OWNER only)",
)
@router.get(
    "/",
    response_model=list[RepairResponse],
    summary="List repairs for owner's shop (SHOP_OWNER only)",
    include_in_schema=False,
)
def list_shop_repairs(
    status_filter: RepairStatus | None = Query(
        default=None,
        alias="status",
        description="Filter by repair status (RECEIVED, DIAGNOSING, REPAIRING, READY, COMPLETED, CANCELLED)",
    ),
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> list[RepairResponse]:
    """
    List repairs belonging to the authenticated shop owner's shop.
    Never allows viewing another shop's repairs.
    """
    try:
        return svc.get_shop_owner_repairs(db, current_user, status_filter=status_filter)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.get(
    "/{repair_id}",
    response_model=RepairResponse,
    summary="Get single repair for owner's shop (SHOP_OWNER only)",
)
def get_shop_repair(
    repair_id: str,
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> RepairResponse:
    """
    Get a single repair by ID or human-readable repair_id.
    - Returns 404 if repair does not exist.
    - Returns 403 if repair belongs to another shop.
    """
    try:
        return svc.get_shop_owner_repair(db, current_user, repair_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.patch(
    "/{repair_id}/status",
    response_model=RepairResponse,
    summary="Update repair status (SHOP_OWNER only)",
)
def update_repair_status(
    repair_id: str,
    body: RepairStatusUpdate,
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> RepairResponse:
    """
    Update status of repair strictly following allowed state transitions:
        RECEIVED   -> DIAGNOSING, CANCELLED
        DIAGNOSING -> REPAIRING, CANCELLED
        REPAIRING  -> READY, CANCELLED
        READY      -> COMPLETED, REPAIRING
        COMPLETED  -> terminal
        CANCELLED  -> terminal
    - Returns 404 if repair does not exist.
    - Returns 403 if repair belongs to another shop.
    - Returns 409 if transition is invalid or repair is completed/cancelled.
    """
    try:
        return svc.update_repair_status(
            db,
            current_user,
            repair_id,
            new_status=body.status,
            note=body.note,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post(
    "/{repair_id}/history",
    response_model=RepairHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add repair progress note / history entry (SHOP_OWNER only)",
)
def add_repair_note(
    repair_id: str,
    body: RepairHistoryCreate,
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> RepairHistoryResponse:
    """
    Add a progress note / history entry without changing the status.
    - Returns 404 if repair does not exist.
    - Returns 403 if repair belongs to another shop.
    - Returns 409 if repair is completed or cancelled.
    """
    try:
        return svc.add_repair_note(db, current_user, repair_id, note=body.note)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.patch(
    "/{repair_id}/estimate",
    response_model=RepairResponse,
    summary="Update repair estimated cost (SHOP_OWNER only)",
)
def update_repair_estimate(
    repair_id: str,
    body: RepairEstimateUpdate,
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> RepairResponse:
    """
    Update the estimated cost for a repair job.
    - Returns 404 if repair does not exist.
    - Returns 403 if repair belongs to another shop.
    - Returns 409 if repair is completed or cancelled.
    - Returns 422 if estimated cost is negative.
    """
    try:
        return svc.update_repair_estimate(db, current_user, repair_id, body.estimated_cost)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


# ---------------------------------------------------------------------------
# Phase 5.8 -- AI Repair Assistance
# ---------------------------------------------------------------------------


@router.post(
    "/analyze",
    response_model=Union[RepairAnalyzeResponse, RepairAnalyzeError],
    summary="AI-assisted repair problem analysis (SHOP_OWNER only) -- Phase 5.8",
)
def analyze_repair(
    body: RepairAnalyzeRequest,
    current_user: User = Depends(_shop_owner),  # noqa: ARG001 -- enforces SHOP_OWNER auth
) -> dict:
    """
    Analyze the customer's problem description with AI.

    - SHOP_OWNER only (JWT required).
    - AI is an assistant: it suggests category, priority, and summary.
    - Shop Owner must verify the result before applying it.
    - If AI fails for any reason, returns success=false with a safe message.
      The repair workflow is NEVER broken by AI failure.
    - Input description must be 20-2000 characters.
    - API credentials are NEVER exposed to the frontend.

    Request:
        {"problem_description": "..."}

    Success response:
        {"success": true, "category": "Battery / Power", "priority": "HIGH", "summary": "..."}

    Failure response (AI unavailable):
        {"success": false, "message": "AI analysis is currently unavailable. You can continue manually."}
    """
    return ai_service.analyze_repair_problem(body.problem_description)
