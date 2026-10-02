"""
Shared Enum definitions for RepairTrack.

Centralising all status/role values here keeps them consistent
across models, schemas, and future API layers.
"""
import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    SHOP_OWNER = "SHOP_OWNER"
    ADMIN = "ADMIN"


class ShopStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ApplicationStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class PickupStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    SCHEDULED = "SCHEDULED"
    PICKED_UP = "PICKED_UP"
    RECEIVED = "RECEIVED"


class RepairStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    DIAGNOSING = "DIAGNOSING"
    REPAIRING = "REPAIRING"
    READY = "READY"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
