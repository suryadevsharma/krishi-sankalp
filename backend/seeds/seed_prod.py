import os
import sys
import datetime

# Set up backend path import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User
from utils import get_password_hash

def seed_production_users():
    db = SessionLocal()
    try:
        print("Starting production-safe seeding...")
        
        # 1. Farmer account
        farmer = db.query(User).filter(User.phone == "9999999999").first()
        if not farmer:
            print("Seeding Ramesh Kumar (Farmer)...")
            demo_farmer = User(
                phone="9999999999",
                email="ramesh@example.com",
                name="Ramesh Kumar",
                village="Krishi Gram",
                district="Pune",
                state="Maharashtra",
                land_acres=4.5,
                language_pref="hi",
                role="farmer",
                hashed_password=get_password_hash("demo123"),
                farmer_code="1234",
                is_verified=True,
                otp_code=None,
                otp_expires_at=None,
                created_at=datetime.datetime.utcnow()
            )
            db.add(demo_farmer)
        else:
            print("User Ramesh Kumar (9999999999) already exists. Enforcing farmer_code=1234.")
            farmer.farmer_code = "1234"
            farmer.is_verified = True

        # 2. Lab tech account
        lab_tech = db.query(User).filter(User.phone == "8888888888").first()
        if not lab_tech:
            print("Seeding Dr. Shashi Shekhar (Lab)...")
            demo_lab = User(
                phone="8888888888",
                email="lab@example.com",
                name="Dr. Shashi Shekhar (KVK Lab)",
                village="Baramati Center",
                district="Pune",
                state="Maharashtra",
                land_acres=0.0,
                language_pref="en",
                role="lab",
                hashed_password=get_password_hash("demo123"),
                farmer_code="1234",
                is_verified=True,
                otp_code=None,
                otp_expires_at=None,
                created_at=datetime.datetime.utcnow()
            )
            db.add(demo_lab)
        else:
            print("User Dr. Shashi Shekhar (8888888888) already exists. Enforcing farmer_code=1234.")
            lab_tech.farmer_code = "1234"
            lab_tech.is_verified = True

        # 3. FPO manager account
        fpo_mgr = db.query(User).filter(User.phone == "7777777777").first()
        if not fpo_mgr:
            print("Seeding Sanjay Patil (FPO)...")
            demo_fpo = User(
                phone="7777777777",
                email="fpo@example.com",
                name="Sanjay Patil (Sahyadri FPO)",
                village="Nashik Hub",
                district="Nashik",
                state="Maharashtra",
                land_acres=0.0,
                language_pref="en",
                role="fpo",
                hashed_password=get_password_hash("demo123"),
                farmer_code="1234",
                is_verified=True,
                otp_code=None,
                otp_expires_at=None,
                created_at=datetime.datetime.utcnow()
            )
            db.add(demo_fpo)
        else:
            print("User Sanjay Patil (7777777777) already exists. Enforcing farmer_code=1234.")
            fpo_mgr.farmer_code = "1234"
            fpo_mgr.is_verified = True

        db.commit()
        print("Production-safe seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding production database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_production_users()
