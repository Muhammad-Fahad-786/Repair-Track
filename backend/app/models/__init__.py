# Re-export all models here so that Base.metadata knows about every table
# before create_all() is called in main.py.
# Import order respects FK dependencies (User → Shop → ShopApplication → etc.)

from app.models.enums import (  # noqa: F401
    UserRole,
    ShopStatus,
    ApplicationStatus,
    PickupStatus,
    RepairStatus,
)
from app.models.user import User  # noqa: F401
from app.models.shop import Shop  # noqa: F401
from app.models.shop_application import ShopApplication  # noqa: F401
from app.models.pickup import PickupRequest  # noqa: F401
from app.models.repair import Repair  # noqa: F401
from app.models.repair_history import RepairHistory  # noqa: F401
