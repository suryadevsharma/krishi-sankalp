import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base

# Import all routers
from routers import auth, soil, crops, disease, market, budget, schemes, admin

# Auto create tables on startup
Base.metadata.create_all(bind=engine)

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
