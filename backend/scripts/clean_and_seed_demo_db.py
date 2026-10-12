"""
Clean and seed RepairTrack local SQLite database with realistic India-focused demo data.

Strict Requirements:
USERS:
- Exactly 1 ADMIN (admin@repairtrack.com / adminpass123)
- Exactly 2 SHOP_OWNER (alice@test.com / password123, david@test.com / password123)
- Exactly 2 CUSTOMER (bob@test.com / password123, charlie@test.com / password123)

SHOPS:
- Exactly 2 approved/active shops:
  * Alice's Phone Repairs (Delhi, Owner: Alice)
  * Secondary Shop (Noida, Owner: David)

PICKUPS:
- Approximately 3-4 realistic pickup requests.

REPAIRS:
- Approximately 3-4 realistic repairs.

REPAIR HISTORY:
- Only history belonging to the retained repairs.

SHOP APPLICATIONS:
- 1-2 useful applications (1 approved for Alice's shop, 1 pending to demo Admin review).

No orphaned records.
Deterministic execution.
"""
from datetime import date, datetime, timedelta, timezone
import datetime as dt
import os
import pathlib
import sys

# Ensure backend root is on sys.path
backend_dir = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
db_file = (backend_dir / "repairtrack.db").resolve()
os.environ["DATABASE_URL"] = f"sqlite:///{db_file.as_posix()}"

from app.core.database import Base, SessionLocal, engine
import app.models  # registers all models
from app.core.security import hash_password
from app.models.enums import ApplicationStatus, PickupStatus, RepairStatus, ShopStatus, UserRole
from app.models.pickup import PickupRequest
from app.models.repair import Repair
from app.models.repair_history import RepairHistory
from app.models.shop import Shop
from app.models.shop_application import ShopApplication
from app.models.user import User


def seed_demo_data():
    print("=" * 60)
    print("RepairTrack: Cleaning and Seeding Realistic India Demo Database")
    print("=" * 60)

    # Make sure all tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Step 1: Clean existing data in strict foreign key order
        print("\n1. Deleting legacy test rows...")
        db.query(RepairHistory).delete()
        db.query(Repair).delete()
        db.query(PickupRequest).delete()
        db.query(ShopApplication).delete()
        db.query(Shop).delete()
        db.query(User).delete()
        db.commit()

        # Step 2: Seed exact 5 Users
        print("2. Seeding Users (1 Admin, 2 Shop Owners, 2 Customers)...")
        now = datetime.now(timezone.utc)

        user_alice = User(
            id=1,
            name="Alice Sharma",
            email="alice@test.com",
            phone="+91 98101 23456",
            password_hash=hash_password("password123"),
            role=UserRole.SHOP_OWNER,
            is_active=True,
            created_at=now - timedelta(days=30),
            updated_at=now - timedelta(days=30),
        )

        user_admin = User(
            id=2,
            name="System Admin",
            email="admin@repairtrack.com",
            phone="+91 98111 00000",
            password_hash=hash_password("adminpass123"),
            role=UserRole.ADMIN,
            is_active=True,
            created_at=now - timedelta(days=60),
            updated_at=now - timedelta(days=60),
        )

        user_bob = User(
            id=3,
            name="Bob Verma",
            email="bob@test.com",
            phone="+91 98202 34567",
            password_hash=hash_password("password123"),
            role=UserRole.CUSTOMER,
            is_active=True,
            created_at=now - timedelta(days=20),
            updated_at=now - timedelta(days=20),
        )

        user_charlie = User(
            id=4,
            name="Charlie Kumar",
            email="charlie@test.com",
            phone="+91 98303 45678",
            password_hash=hash_password("password123"),
            role=UserRole.CUSTOMER,
            is_active=True,
            created_at=now - timedelta(days=15),
            updated_at=now - timedelta(days=15),
        )

        user_david = User(
            id=5,
            name="David Patel",
            email="david@test.com",
            phone="+91 98404 56789",
            password_hash=hash_password("password123"),
            role=UserRole.SHOP_OWNER,
            is_active=True,
            created_at=now - timedelta(days=25),
            updated_at=now - timedelta(days=25),
        )

        db.add_all([user_alice, user_admin, user_bob, user_charlie, user_david])
        db.commit()

        # Step 3: Seeding exactly 2 Approved Shops
        print("3. Seeding Shops (Alice's Phone Repairs in Delhi, Secondary Shop in Noida)...")
        shop_alice = Shop(
            id=1,
            owner_id=1,
            name="Alice's Phone Repairs",
            slug="alice-repairs",
            description="Premier multi-device smartphone, tablet, and laptop repair centre in Delhi.",
            category="Multi-Device Repair",
            phone="+91 98101 23456",
            email="alice.repairs@repairtrack.com",
            address="Shop 14, Block B, Connaught Place",
            city="Delhi",
            state="Delhi",
            status=ShopStatus.APPROVED,
            is_active=True,
            created_at=now - timedelta(days=28),
            updated_at=now - timedelta(days=28),
        )

        shop_david = Shop(
            id=2,
            owner_id=5,
            name="Secondary Shop",
            slug="secondary-shop",
            description="Reliable electronics and screen replacement specialist located in Noida.",
            category="Electronics & Screen Repair",
            phone="+91 98404 56789",
            email="david.repairs@repairtrack.com",
            address="Sector 18 Market, Wave Silver Tower",
            city="Noida",
            state="Uttar Pradesh",
            status=ShopStatus.APPROVED,
            is_active=True,
            created_at=now - timedelta(days=22),
            updated_at=now - timedelta(days=22),
        )

        db.add_all([shop_alice, shop_david])
        db.commit()

        # Step 4: Seeding Shop Applications
        print("4. Seeding Shop Applications (1 Approved, 1 Pending)...")
        app_alice = ShopApplication(
            id=1,
            applicant_id=1,
            shop_id=1,
            applicant_name="Alice Sharma",
            applicant_email="alice@test.com",
            applicant_phone="+91 98101 23456",
            password_hash=hash_password("password123"),
            shop_name="Alice's Phone Repairs",
            description="Premier multi-device smartphone, tablet, and laptop repair centre in Delhi.",
            address="Shop 14, Block B, Connaught Place",
            city="Delhi",
            services="Screen replacement, Battery service, Motherboard repair, Water damage restoration",
            pickup_available=True,
            status=ApplicationStatus.APPROVED,
            submitted_at=now - timedelta(days=29),
            reviewed_at=now - timedelta(days=28),
            reviewed_by=2,
        )

        app_pending = ShopApplication(
            id=2,
            applicant_id=None,
            shop_id=None,
            applicant_name="Vikram Singh",
            applicant_email="vikram.singh@example.com",
            applicant_phone="+91 98505 67890",
            password_hash=hash_password("VikramPass123!"),
            shop_name="Gurugram Tech Fix",
            description="Specialized doorstep diagnostics and chip-level motherboard servicing.",
            address="Cyber City DLF Phase 2",
            city="Gurugram",
            services="Laptop chip repair, Gaming console tuning, Water recovery",
            pickup_available=True,
            status=ApplicationStatus.PENDING,
            submitted_at=now - timedelta(hours=14),
            reviewed_at=None,
            reviewed_by=None,
        )

        db.add_all([app_alice, app_pending])
        db.commit()

        # Step 5: Seeding 4 Realistic Pickups
        print("5. Seeding 4 Pickups (2 for Alice's shop, 2 for David's shop)...")
        pickup_1 = PickupRequest(
            id=1,
            customer_id=3,  # Bob
            shop_id=1,      # Alice
            device_type="Smartphone",
            device_brand="Samsung",
            device_model="Galaxy S23 Ultra",
            problem_description="Flickering AMOLED screen and shattered front glass after drop.",
            pickup_address="A-42, Defence Colony, New Delhi",
            preferred_date=date(2026, 10, 12),
            preferred_time=dt.time(10, 30),
            status=PickupStatus.RECEIVED,
            created_at=now - timedelta(days=3),
            updated_at=now - timedelta(days=2),
        )

        pickup_2 = PickupRequest(
            id=2,
            customer_id=4,  # Charlie
            shop_id=1,      # Alice
            device_type="Laptop",
            device_brand="Apple",
            device_model="MacBook Air M2",
            problem_description="Keyboard backlight flickering and battery draining quickly.",
            pickup_address="Flat 302, Green Park Extension, New Delhi",
            preferred_date=date(2026, 10, 14),
            preferred_time=dt.time(14, 0),
            status=PickupStatus.SCHEDULED,
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(hours=12),
        )

        pickup_3 = PickupRequest(
            id=3,
            customer_id=3,  # Bob
            shop_id=2,      # David
            device_type="Tablet",
            device_brand="Apple",
            device_model="iPad Pro 11-inch",
            problem_description="USB-C charging port loose, not charging reliably.",
            pickup_address="Tower 4, Sector 62, Noida",
            preferred_date=date(2026, 10, 15),
            preferred_time=dt.time(11, 0),
            status=PickupStatus.ACCEPTED,
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(days=1),
        )

        pickup_4 = PickupRequest(
            id=4,
            customer_id=4,  # Charlie
            shop_id=2,      # David
            device_type="Smartwatch",
            device_brand="Samsung",
            device_model="Galaxy Watch 6",
            problem_description="Touchscreen unresponsive after water splash.",
            pickup_address="B-12, Sector 15, Noida",
            preferred_date=date(2026, 10, 16),
            preferred_time=dt.time(16, 30),
            status=PickupStatus.PENDING,
            created_at=now - timedelta(hours=8),
            updated_at=now - timedelta(hours=8),
        )

        db.add_all([pickup_1, pickup_2, pickup_3, pickup_4])
        db.commit()

        # Step 6: Seeding 4 Realistic Repairs
        print("6. Seeding 4 Repairs (2 for Alice's shop, 2 for David's shop)...")
        repair_1 = Repair(
            id=1,
            repair_id="RT-2026-DEL-001",
            customer_id=3,  # Bob
            shop_id=1,      # Alice
            pickup_request_id=1,
            device_type="Smartphone",
            device_brand="Samsung",
            device_model="Galaxy S23 Ultra",
            problem_description="Flickering AMOLED screen and shattered front glass after drop.",
            ai_category="Screen Replacement",
            ai_priority="HIGH",
            ai_summary="Severe display damage requiring genuine Dynamic AMOLED 2X panel and digitizer assembly replacement.",
            estimated_cost=14500.00,
            status=RepairStatus.REPAIRING,
            customer_approved=True,
            received_at=now - timedelta(days=2),
            estimated_completion=now + timedelta(days=1),
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(hours=6),
        )

        repair_2 = Repair(
            id=2,
            repair_id="RT-2026-DEL-002",
            customer_id=4,  # Charlie
            shop_id=1,      # Alice
            pickup_request_id=None,
            device_type="Smartphone",
            device_brand="OnePlus",
            device_model="OnePlus 11 5G",
            problem_description="Warp charge port not connecting and heating during fast charge.",
            ai_category="Charging Port Replacement",
            ai_priority="MEDIUM",
            ai_summary="Damaged sub-board USB-C flex cable and corroded charging pins.",
            estimated_cost=2800.00,
            status=RepairStatus.READY,
            customer_approved=True,
            received_at=now - timedelta(days=3),
            estimated_completion=now - timedelta(hours=4),
            created_at=now - timedelta(days=3),
            updated_at=now - timedelta(hours=3),
        )

        repair_3 = Repair(
            id=3,
            repair_id="RT-2026-NOI-001",
            customer_id=3,  # Bob
            shop_id=2,      # David
            pickup_request_id=None,
            device_type="Laptop",
            device_brand="Lenovo",
            device_model="ThinkPad T14 Gen 3",
            problem_description="Thermal throttling and cooling fan making grinding mechanical noise.",
            ai_category="Thermal & Fan Maintenance",
            ai_priority="LOW",
            ai_summary="Exhaust fan bearing worn out; heatsink thermal paste dried out.",
            estimated_cost=3200.00,
            status=RepairStatus.COMPLETED,
            customer_approved=True,
            completed_at=now - timedelta(hours=12),
            received_at=now - timedelta(days=4),
            estimated_completion=now - timedelta(days=1),
            created_at=now - timedelta(days=4),
            updated_at=now - timedelta(hours=12),
        )

        repair_4 = Repair(
            id=4,
            repair_id="RT-2026-NOI-002",
            customer_id=4,  # Charlie
            shop_id=2,      # David
            pickup_request_id=None,
            device_type="Tablet",
            device_brand="Apple",
            device_model="iPad Air 5th Gen",
            problem_description="Liquid spill causing touch ghost inputs.",
            ai_category="Diagnostic & Ultrasonic Cleaning",
            ai_priority="HIGH",
            ai_summary="Internal moisture detected; requiring ultrasonic board treatment before diagnostic.",
            estimated_cost=4500.00,
            status=RepairStatus.DIAGNOSING,
            customer_approved=None,
            received_at=now - timedelta(hours=6),
            estimated_completion=now + timedelta(days=2),
            created_at=now - timedelta(hours=6),
            updated_at=now - timedelta(hours=4),
        )

        db.add_all([repair_1, repair_2, repair_3, repair_4])
        db.commit()

        # Step 7: Seeding Repair History (strictly for these 4 repairs)
        print("7. Seeding Repair History for the 4 repairs...")
        history_records = [
            # Repair 1 history
            RepairHistory(
                repair_id=1,
                status="RECEIVED",
                note="Device received at Delhi workshop via doorstep pickup.",
                changed_by=1,
                created_at=now - timedelta(days=2),
            ),
            RepairHistory(
                repair_id=1,
                status="DIAGNOSING",
                note="Display disassembly confirmed damaged digitizer and inner AMOLED panel.",
                changed_by=1,
                created_at=now - timedelta(days=1, hours=18),
            ),
            RepairHistory(
                repair_id=1,
                status="REPAIRING",
                note="Customer approved estimate of ₹14,500. Genuine OEM display assembly being installed.",
                changed_by=1,
                created_at=now - timedelta(hours=6),
            ),
            # Repair 2 history
            RepairHistory(
                repair_id=2,
                status="RECEIVED",
                note="Device received at Connaught Place workshop.",
                changed_by=1,
                created_at=now - timedelta(days=3),
            ),
            RepairHistory(
                repair_id=2,
                status="DIAGNOSING",
                note="Inspected sub-board; charging connector pins corroded.",
                changed_by=1,
                created_at=now - timedelta(days=2),
            ),
            RepairHistory(
                repair_id=2,
                status="REPAIRING",
                note="Estimate approved; replacing charging port flex ribbon.",
                changed_by=1,
                created_at=now - timedelta(days=1),
            ),
            RepairHistory(
                repair_id=2,
                status="READY",
                note="Fast charge tested successfully at 80W. Device ready for pickup.",
                changed_by=1,
                created_at=now - timedelta(hours=3),
            ),
            # Repair 3 history
            RepairHistory(
                repair_id=3,
                status="RECEIVED",
                note="ThinkPad logged into Noida service centre.",
                changed_by=5,
                created_at=now - timedelta(days=4),
            ),
            RepairHistory(
                repair_id=3,
                status="DIAGNOSING",
                note="Thermal tests show peak 98C under load; fan rattling.",
                changed_by=5,
                created_at=now - timedelta(days=3),
            ),
            RepairHistory(
                repair_id=3,
                status="REPAIRING",
                note="Installed new fan module and Arctic MX-4 thermal compound.",
                changed_by=5,
                created_at=now - timedelta(days=2),
            ),
            RepairHistory(
                repair_id=3,
                status="READY",
                note="Thermal performance verified under stress test at 65C.",
                changed_by=5,
                created_at=now - timedelta(days=1),
            ),
            RepairHistory(
                repair_id=3,
                status="COMPLETED",
                note="Device handed over to customer. Warranty card issued.",
                changed_by=5,
                created_at=now - timedelta(hours=12),
            ),
            # Repair 4 history
            RepairHistory(
                repair_id=4,
                status="RECEIVED",
                note="iPad logged in following liquid incident.",
                changed_by=5,
                created_at=now - timedelta(hours=6),
            ),
            RepairHistory(
                repair_id=4,
                status="DIAGNOSING",
                note="Opened chassis and started desiccation diagnostic.",
                changed_by=5,
                created_at=now - timedelta(hours=4),
            ),
        ]

        db.add_all(history_records)
        db.commit()

        # Step 8: Verify Final Counts and Integrity
        user_cnt = db.query(User).count()
        shop_cnt = db.query(Shop).count()
        app_cnt = db.query(ShopApplication).count()
        pickup_cnt = db.query(PickupRequest).count()
        repair_cnt = db.query(Repair).count()
        history_cnt = db.query(RepairHistory).count()

        print("\n" + "=" * 60)
        print("SEEDING COMPLETE — FINAL DATABASE COUNTS:")
        print(f"Users:            {user_cnt} (Expected: 5)")
        print(f"Shops:            {shop_cnt} (Expected: 2)")
        print(f"Applications:     {app_cnt} (Expected: 2)")
        print(f"Pickups:          {pickup_cnt} (Expected: 4)")
        print(f"Repairs:          {repair_cnt} (Expected: 4)")
        print(f"Repair History:   {history_cnt} (Expected: 14)")
        print("=" * 60)

        # Integrity check: no orphaned records
        for p in db.query(PickupRequest).all():
            assert db.get(User, p.customer_id) is not None, f"Orphaned customer_id in pickup {p.id}"
            assert db.get(Shop, p.shop_id) is not None, f"Orphaned shop_id in pickup {p.id}"

        for r in db.query(Repair).all():
            assert db.get(User, r.customer_id) is not None, f"Orphaned customer_id in repair {r.id}"
            assert db.get(Shop, r.shop_id) is not None, f"Orphaned shop_id in repair {r.id}"

        for h in db.query(RepairHistory).all():
            assert db.get(Repair, h.repair_id) is not None, f"Orphaned repair_id in history {h.id}"

        print("[OK] Database integrity validated: Zero orphaned records.")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
