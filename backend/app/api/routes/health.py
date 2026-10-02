from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get(
    "/health",
    summary="Health Check",
    description="Returns the current health status of the RepairTrack API.",
    tags=["Health"],
)
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
