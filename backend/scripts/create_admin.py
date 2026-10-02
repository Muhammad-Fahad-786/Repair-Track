"""
scripts/create_admin.py
=======================
Development utility to create the first ADMIN user.

Run from the backend/ directory with the virtual environment active:

    python scripts/create_admin.py

The script:
- connects to the existing SQLite database (no server needed)
- prompts for name, email, and password (password is hidden via getpass)
- hashes the password with Argon2
- creates a User with role=ADMIN and is_active=True
- refuses to overwrite an existing email
- never prints the password

This script is only for development bootstrapping.
Admin accounts should be managed differently in production.
"""
import sys
import os
import getpass

# Make sure Python can find the app package when run from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine, Base
import app.models  # noqa: F401 — registers all models with Base
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User


def main() -> None:
    print("\n=== RepairTrack — Create Admin User ===\n")

    # Ensure tables exist (safe to call even if they already do)
    Base.metadata.create_all(bind=engine)

    name = input("Admin name: ").strip()
    if not name:
        print("Error: name cannot be empty.")
        sys.exit(1)

    email = input("Admin email: ").strip().lower()
    if not email:
        print("Error: email cannot be empty.")
        sys.exit(1)

    password = getpass.getpass("Admin password (hidden): ")
    if len(password) < 8:
        print("Error: password must be at least 8 characters.")
        sys.exit(1)

    confirm = getpass.getpass("Confirm password (hidden): ")
    if password != confirm:
        print("Error: passwords do not match.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"\nError: a user with email '{email}' already exists (role: {existing.role.value}).")
            sys.exit(1)

        admin = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"\n✅  Admin created successfully.")
        print(f"    ID:    {admin.id}")
        print(f"    Name:  {admin.name}")
        print(f"    Email: {admin.email}")
        print(f"    Role:  {admin.role.value}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
