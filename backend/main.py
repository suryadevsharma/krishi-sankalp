import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base

# Import all routers
from routers import auth, soil, crops, disease, market, budget, schemes, admin

# Auto create tables on startup
Base.metadata.create_all(bind=engine)

# Run migration to add farmer_code column if not exists
try:
    from sqlalchemy import text
    with engine.connect() as conn:
        dialect_name = conn.dialect.name
        if dialect_name == "postgresql":
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS farmer_code VARCHAR;"))
            conn.commit()
            print("Database migration: Checked/added farmer_code column in PostgreSQL users table.", flush=True)
        elif dialect_name == "sqlite":
            res = conn.execute(text("PRAGMA table_info(users);")).fetchall()
            columns = [row[1] for row in res]
            if "farmer_code" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN farmer_code VARCHAR;"))
                conn.commit()
                print("Database migration: Added farmer_code column to SQLite users table.", flush=True)
except Exception as e:
    print(f"Database migration (add farmer_code column) skipped or failed: {e}", flush=True)

# One-time database cleanup migration (deletes non-demo users, updates demo users, keeps other data untouched)
try:
    from sqlalchemy import text
    with engine.connect() as conn:
        print("Database cleanup: Deleting non-demo users and updating demo user farmer_codes...", flush=True)
        conn.execute(text("DELETE FROM price_alerts WHERE farmer_id IN (SELECT id FROM users WHERE phone NOT IN ('9999999999', '8888888888', '7777777777'));"))
        conn.execute(text("DELETE FROM disease_detections WHERE farmer_id IN (SELECT id FROM users WHERE phone NOT IN ('9999999999', '8888888888', '7777777777'));"))
        conn.execute(text("DELETE FROM crop_calendar_events WHERE crop_cycle_id IN (SELECT id FROM crop_cycles WHERE farmer_id IN (SELECT id FROM users WHERE phone NOT IN ('9999999999', '8888888888', '7777777777')));"))
        conn.execute(text("DELETE FROM budget_entries WHERE crop_cycle_id IN (SELECT id FROM crop_cycles WHERE farmer_id IN (SELECT id FROM users WHERE phone NOT IN ('9999999999', '8888888888', '7777777777')));"))
        conn.execute(text("DELETE FROM crop_cycles WHERE farmer_id IN (SELECT id FROM users WHERE phone NOT IN ('9999999999', '8888888888', '7777777777'));"))
        conn.execute(text("DELETE FROM soil_reports WHERE farmer_id IN (SELECT id FROM users WHERE phone NOT IN ('9999999999', '8888888888', '7777777777')) OR lab_id IN (SELECT id FROM users WHERE phone NOT IN ('9999999999', '8888888888', '7777777777'));"))
        conn.execute(text("DELETE FROM users WHERE phone NOT IN ('9999999999', '8888888888', '7777777777');"))
        conn.execute(text("UPDATE users SET farmer_code = '1234' WHERE phone IN ('9999999999', '8888888888', '7777777777');"))
        conn.commit()
        print("Database cleanup: Finished successfully!", flush=True)
except Exception as e:
    print(f"Database cleanup migration failed: {e}", flush=True)

# Run production-safe seeding hook on startup (safe for Render Free Tier)
try:
    from seeds.seed_prod import seed_production_users
    from seeds.seed_prod_reference import seed_production_reference_data
    seed_production_users()
    seed_production_reference_data()
except Exception as e:
    print(f"Startup seeding check failed: {e}")

app = FastAPI(
    title="Krishi Sankalp API",
    description="Full-stack AI-powered agricultural platform backend supporting Indian farmers.",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # configure specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create and mount static folder for file uploads
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Mount API routers
app.include_router(auth.router)
app.include_router(soil.router)
app.include_router(crops.router)
app.include_router(disease.router)
app.include_router(market.router)
app.include_router(budget.router)
app.include_router(schemes.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Krishi Sankalp API",
        "version": "1.0.0",
        "engine": "FastAPI",
        "features": [
            "Auth System (JWT)",
            "Sankalp (Soil Analysis & Crop recommendation)",
            "Saadhna (Crop Calendar & Disease detection CNN)",
            "Samriddhi (Market prices e-NAM & Logistics cost tracker)",
            "Multilingual i18n support",
            "PWA offline caching architecture"
        ]
    }
