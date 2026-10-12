from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.api.routes import health
from app.api.routes import auth
from app.api.routes import shop_applications
from app.api.routes import admin_shop_applications
from app.api.routes import pickups
from app.api.routes import shop_owner_pickups
from app.api.routes import admin_pickups
from app.api.routes import shop_owner_repairs
from app.api.routes import repairs
from app.api.routes import public_track
from app.api.routes import admin_repairs
from app.api.routes import shops
from app.api.routes import admin_shops

# ---------------------------------------------------------------------------
# Import all models so Base.metadata is populated before create_all()
# ---------------------------------------------------------------------------
import app.models  # noqa: F401  — triggers all model registrations


# ---------------------------------------------------------------------------
# Lifespan: runs once at startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables if they don't already exist.
    # This is acceptable for the current development stage.
    # Alembic migrations will be introduced when the schema stabilises.
    Base.metadata.create_all(bind=engine)
    yield
    # (shutdown logic can go here in future phases)


# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "RepairTrack is a repair management and shop discovery platform. "
        "This API serves the customer, shop owner, and admin portals."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(shop_applications.router, prefix="/api/v1")
app.include_router(admin_shop_applications.router, prefix="/api/v1")
app.include_router(pickups.router, prefix="/api/v1")
app.include_router(shop_owner_pickups.router, prefix="/api/v1")
app.include_router(admin_pickups.router, prefix="/api/v1")
app.include_router(shop_owner_repairs.router, prefix="/api/v1")
app.include_router(repairs.router, prefix="/api/v1")
app.include_router(public_track.router, prefix="/api/v1")
app.include_router(admin_repairs.router, prefix="/api/v1")
app.include_router(shops.router, prefix="/api/v1")
app.include_router(admin_shops.router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------


@app.get("/", tags=["Root"], summary="Root")
async def root() -> dict:
    return {"message": f"{settings.APP_NAME} is running"}
