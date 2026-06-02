import os
import pickle
import datetime
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import utils

router = APIRouter(
    prefix="/api",
    tags=["Crop Management"]
)

# Request schemas for crop recommendations
class RecommendRequest(BaseModel):
    N: float
    P: float
    K: float
    pH: float
    moisture: Optional[float] = 50.0
    lat: Optional[float] = None
    lon: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    rainfall: Optional[float] = None
    water_source: Optional[str] = "irrigated"

# Load ML model
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "crop_model.pkl")
crop_model = None

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            crop_model = pickle.load(f)
        print("ML Crop Recommendation model loaded successfully.")
    except Exception as e:
        print(f"Error loading crop model: {e}. Falling back to rule-based engine.")
else:
    print("Crop model pickle file not found. Falling back to rule-based engine.")

# Ideal ranges for 22 crops (from UCI dataset characteristics)
CROP_PROFILES = {
    'rice': {'N': (80, 100), 'P': (40, 60), 'K': (35, 45), 'temp': (20, 27), 'hum': (80, 90), 'ph': (5.5, 6.5), 'rain': (180, 250), 'yield_per_acre': 20, 'base_cost': 15000},
    'maize': {'N': (60, 80), 'P': (35, 50), 'K': (15, 25), 'temp': (22, 28), 'hum': (60, 75), 'ph': (5.8, 7.0), 'rain': (60, 100), 'yield_per_acre': 18, 'base_cost': 12000},
    'chickpea': {'N': (30, 50), 'P': (55, 70), 'K': (75, 85), 'temp': (17, 23), 'hum': (15, 30), 'ph': (6.0, 8.0), 'rain': (60, 90), 'yield_per_acre': 8, 'base_cost': 9000},
    'kidneybeans': {'N': (15, 35), 'P': (45, 60), 'K': (15, 25), 'temp': (15, 25), 'hum': (18, 25), 'ph': (5.5, 6.0), 'rain': (60, 150), 'yield_per_acre': 6, 'base_cost': 10000},
    'pigeonpeas': {'N': (15, 35), 'P': (60, 75), 'K': (15, 25), 'temp': (25, 35), 'hum': (45, 65), 'ph': (5.5, 7.5), 'rain': (90, 180), 'yield_per_acre': 7, 'base_cost': 8500},
    'mothbeans': {'N': (15, 35), 'P': (40, 55), 'K': (15, 25), 'temp': (26, 32), 'hum': (40, 60), 'ph': (6.5, 7.5), 'rain': (30, 70), 'yield_per_acre': 5, 'base_cost': 7000},
    'mungbean': {'N': (15, 35), 'P': (40, 55), 'K': (15, 25), 'temp': (27, 35), 'hum': (80, 90), 'ph': (6.2, 7.2), 'rain': (40, 90), 'yield_per_acre': 6, 'base_cost': 7500},
    'blackgram': {'N': (30, 50), 'P': (55, 70), 'K': (15, 25), 'temp': (25, 35), 'hum': (60, 75), 'ph': (6.5, 7.5), 'rain': (60, 75), 'yield_per_acre': 6, 'base_cost': 8000},
    'lentil': {'N': (15, 35), 'P': (50, 65), 'K': (15, 25), 'temp': (18, 30), 'hum': (60, 70), 'ph': (5.9, 6.9), 'rain': (40, 55), 'yield_per_acre': 5, 'base_cost': 8200},
    'pomegranate': {'N': (20, 40), 'P': (10, 30), 'K': (35, 45), 'temp': (18, 28), 'hum': (55, 65), 'ph': (5.5, 6.5), 'rain': (100, 110), 'yield_per_acre': 45, 'base_cost': 25000},
    'banana': {'N': (80, 120), 'P': (70, 95), 'K': (45, 55), 'temp': (25, 28), 'hum': (75, 85), 'ph': (5.5, 6.5), 'rain': (90, 120), 'yield_per_acre': 150, 'base_cost': 35000},
    'mango': {'N': (20, 40), 'P': (20, 35), 'K': (25, 35), 'temp': (27, 35), 'hum': (45, 55), 'ph': (5.5, 7.0), 'rain': (85, 100), 'yield_per_acre': 60, 'base_cost': 22000},
    'grapes': {'N': (20, 40), 'P': (120, 145), 'K': (190, 205), 'temp': (15, 40), 'hum': (80, 85), 'ph': (5.5, 6.0), 'rain': (65, 220), 'yield_per_acre': 80, 'base_cost': 45000},
    'watermelon': {'N': (80, 100), 'P': (5, 25), 'K': (45, 55), 'temp': (24, 27), 'hum': (80, 89), 'ph': (6.0, 6.8), 'rain': (40, 55), 'yield_per_acre': 120, 'base_cost': 18000},
    'muskmelon': {'N': (80, 100), 'P': (5, 25), 'K': (45, 55), 'temp': (27, 29), 'hum': (90, 95), 'ph': (6.0, 6.7), 'rain': (20, 30), 'yield_per_acre': 100, 'base_cost': 17000},
    'apple': {'N': (110, 130), 'P': (120, 145), 'K': (190, 205), 'temp': (21, 24), 'hum': (90, 94), 'ph': (5.8, 6.5), 'rain': (100, 125), 'yield_per_acre': 70, 'base_cost': 50000},
    'orange': {'N': (10, 30), 'P': (5, 25), 'K': (5, 15), 'temp': (11, 35), 'hum': (90, 95), 'ph': (6.0, 8.0), 'rain': (110, 120), 'yield_per_acre': 50, 'base_cost': 28000},
    'papaya': {'N': (30, 60), 'P': (45, 65), 'K': (45, 55), 'temp': (23, 43), 'hum': (90, 95), 'ph': (6.5, 7.0), 'rain': (140, 250), 'yield_per_acre': 90, 'base_cost': 20000},
    'coconut': {'N': (10, 30), 'P': (5, 25), 'K': (25, 35), 'temp': (25, 29), 'hum': (90, 99), 'ph': (5.5, 6.5), 'rain': (140, 230), 'yield_per_acre': 80, 'base_cost': 30000},
    'cotton': {'N': (100, 120), 'P': (35, 50), 'K': (15, 25), 'temp': (22, 25), 'hum': (75, 85), 'ph': (5.8, 8.0), 'rain': (60, 95), 'yield_per_acre': 12, 'base_cost': 16000},
    'jute': {'N': (60, 90), 'P': (35, 50), 'K': (35, 45), 'temp': (23, 27), 'hum': (70, 90), 'ph': (6.0, 7.0), 'rain': (150, 200), 'yield_per_acre': 15, 'base_cost': 14000},
    'coffee': {'N': (80, 105), 'P': (15, 35), 'K': (25, 35), 'temp': (20, 27), 'hum': (50, 65), 'ph': (6.0, 7.0), 'rain': (115, 190), 'yield_per_acre': 10, 'base_cost': 40000}
}

CROP_SEASONS = {
    'Kharif': ['rice', 'maize', 'pigeonpeas', 'mothbeans', 'mungbean', 'blackgram', 'cotton', 'jute', 'papaya', 'coconut'],
    'Rabi': ['chickpea', 'lentil', 'kidneybeans', 'apple', 'orange', 'grapes', 'pomegranate'],
    'Zaid': ['watermelon', 'muskmelon', 'banana', 'mango', 'coffee']
}

def get_crop_season(crop_name):
    for season, crops in CROP_SEASONS.items():
        if crop_name in crops:
            return season
    return "Kharif" # default fallback

def get_weather_data(lat: float, lon: float):
    # Free OpenWeatherMap wrapper with offline mock fallback
    api_key = os.getenv("OPENWEATHERMAP_API_KEY", "mock_weather_key")
    if api_key == "mock_weather_key":
        return {"temp": 28.5, "humidity": 72, "rainfall": 150}
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        response = httpx.get(url, timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            temp = data["main"]["temp"]
            humidity = data["main"]["humidity"]
            # Estimate rainfall (using weather description or 1h precipitation if available)
            rain = 120.0
            if "rain" in data:
                rain = data["rain"].get("1h", 2.0) * 50  # extrapolate to seasonal index
            return {"temp": temp, "humidity": humidity, "rainfall": rain}
    except Exception as e:
        print(f"Weather API error: {e}. Falling back to default weather metrics.")
    return {"temp": 28.5, "humidity": 72, "rainfall": 150}

def rule_based_recommendation(n, p, k, temp, hum, ph, rain):
    scores = []
    for crop, prof in CROP_PROFILES.items():
        # Score calculation based on overlap with ideal crop parameter ranges
        score = 0
        # NPK weights (higher weights)
        score += 3.0 * (1.0 - min(abs(n - np.mean(prof['N'])) / (prof['N'][1] - prof['N'][0] + 1e-5), 1.0))
        score += 3.0 * (1.0 - min(abs(p - np.mean(prof['P'])) / (prof['P'][1] - prof['P'][0] + 1e-5), 1.0))
        score += 3.0 * (1.0 - min(abs(k - np.mean(prof['K'])) / (prof['K'][1] - prof['K'][0] + 1e-5), 1.0))
        # Env weights
        score += 1.5 * (1.0 - min(abs(temp - np.mean(prof['temp'])) / (prof['temp'][1] - prof['temp'][0] + 1e-5), 1.0))
        score += 1.5 * (1.0 - min(abs(hum - np.mean(prof['hum'])) / (prof['hum'][1] - prof['hum'][0] + 1e-5), 1.0))
        score += 1.5 * (1.0 - min(abs(ph - np.mean(prof['ph'])) / (prof['ph'][1] - prof['ph'][0] + 1e-5), 1.0))
        score += 2.0 * (1.0 - min(abs(rain - np.mean(prof['rain'])) / (prof['rain'][1] - prof['rain'][0] + 1e-5), 1.0))
        
        # Max score is 3+3+3+1.5+1.5+1.5+2 = 15.5
        norm_score = round(score / 15.5, 3)
        scores.append((crop, norm_score))
        
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:3]

@router.post("/recommend-crops")
def recommend_crops(req: RecommendRequest, db: Session = Depends(get_db)):
    # 1. Fetch environmental factors if lat/lon provided
    temp = req.temperature
    humidity = req.humidity
    rainfall = req.rainfall
    
    if req.lat is not None and req.lon is not None:
        if temp is None or humidity is None or rainfall is None:
            w_data = get_weather_data(req.lat, req.lon)
            temp = temp if temp is not None else w_data["temp"]
            humidity = humidity if humidity is not None else w_data["humidity"]
            rainfall = rainfall if rainfall is not None else w_data["rainfall"]
            
    # Default values if still None
    temp = temp if temp is not None else 27.0
    humidity = humidity if humidity is not None else 70.0
    rainfall = rainfall if rainfall is not None else 120.0
    
    # Calculate water availability score based on water source type
    water_score = 0.8
    if req.water_source == "rainfed":
        water_score = 0.5 if rainfall < 100 else 0.8
    elif req.water_source == "canal":
        water_score = 0.95
    elif req.water_source == "groundwater":
        water_score = 0.90
    elif req.water_source == "irrigated":
        water_score = 0.92

    # 2. Get recommendations (ML or rule-based)
    top_crops = []
    if crop_model is not None:
        try:
            features = [[req.N, req.P, req.K, temp, humidity, req.pH, rainfall]]
            probas = crop_model.predict_proba(features)[0]
            classes = crop_model.classes_
            
            # Map classes with confidence
            crop_ranks = sorted(zip(classes, probas), key=lambda x: x[1], reverse=True)
            top_crops = crop_ranks[:3]
        except Exception as e:
            print(f"ML Prediction failed: {e}. Defaulting to rule engine.")
            top_crops = rule_based_recommendation(req.N, req.P, req.K, temp, humidity, req.pH, rainfall)
    else:
        top_crops = rule_based_recommendation(req.N, req.P, req.K, temp, humidity, req.pH, rainfall)
        
    # 3. Assemble response payload
    # Expected: top 3 recommendations, including pricing, yields, and Modern vs Organic variants
    recommendations_list = []
    
    # Seed current month and state for season calculations
    current_month = datetime.datetime.now().month
    # Approximate season based on month:
    # Kharif: Jun - Sep, Rabi: Oct - Feb, Zaid: Mar - May
    if 6 <= current_month <= 9:
        current_season = "Kharif"
    elif 10 <= current_month <= 12 or 1 <= current_month <= 2:
        current_season = "Rabi"
    else:
        current_season = "Zaid"

    for crop_name, confidence in top_crops:
        crop_season = get_crop_season(crop_name)
        season_suitability = "High" if crop_season == current_season else "Medium"
        
        prof = CROP_PROFILES[crop_name]
        yield_per_acre = prof['yield_per_acre']
        base_cost = prof['base_cost']
        
        # Get mandi price (average or typical)
        mandi_price = db.query(models.MarketPrice.price_per_quintal)\
                        .filter(models.MarketPrice.crop_name == crop_name)\
                        .order_by(models.MarketPrice.recorded_date.desc())\
                        .first()
        price = mandi_price[0] if mandi_price else 2500.0  # fallback price
        
        # Modern variant estimates (chemical)
        modern_yield = yield_per_acre
        modern_cost = base_cost
        modern_revenue = modern_yield * price
        modern_profit = modern_revenue - modern_cost
        
        # Organic variant estimates
        # Organic yields are 15% lower, but organic crops command 30% higher market premium!
        organic_yield = round(yield_per_acre * 0.85, 2)
        organic_cost = round(base_cost * 1.10, 2) # slightly higher setup cost (manure, bio-pesticides)
        organic_price = price * 1.30
        organic_revenue = organic_yield * organic_price
        organic_profit = organic_revenue - organic_cost
        
        recommendations_list.append({
            "crop": crop_name,
            "confidence": round(float(confidence), 3),
            "season": crop_season,
            "season_suitability": season_suitability,
            "water_availability_score": water_score,
            "base_yield_quintals_per_acre": yield_per_acre,
            "market_price_per_quintal": price,
            "modern": {
                "yield_quintals_per_acre": modern_yield,
                "input_cost_estimate": modern_cost,
                "revenue_estimate": round(modern_revenue, 2),
                "profit_projection": round(modern_profit, 2),
                "fertilizers": "Urea: 50 kg/acre, DAP: 30 kg/acre, Potash (MOP): 20 kg/acre",
                "pest_control": "Chemical Spray (Chlorpyrifos) as needed",
            },
            "organic": {
                "yield_quintals_per_acre": organic_yield,
                "input_cost_estimate": organic_cost,
                "revenue_estimate": round(organic_revenue, 2),
                "profit_projection": round(organic_profit, 2),
                "fertilizers": "Vermicompost: 2 tonnes/acre, Neem Cake: 200 kg/acre, Azotobacter & PSB bio-fertilizers",
                "pest_control": "Neem Oil Spray (1500 ppm), Trichoderma bio-fungicide",
            }
        })
        
    return recommendations_list

def generate_calendar_events(db: Session, crop_cycle: models.CropCycle):
    crop = crop_cycle.crop_name
    start_date = crop_cycle.start_date
    
    # Dynamic crop cycle events template
    # Day count offset relative to start_date
    events_templates = [
        {"day": 0, "type": "sowing", "title": "Sowing and Seed Treatment", "desc": "Treat seeds with Thiram (2g/kg seed) or Trichoderma (4g/kg seed) to prevent fungal attacks, and sow at appropriate row depth."},
        {"day": 7, "type": "irrigation", "title": "First Irrigation Check", "desc": "Keep soil moist for seed germination. Check water logging in fields."},
        {"day": 20, "type": "fertilizer", "title": "Basal Fertilizer Application", "desc": "Apply primary basal dose of fertilizer. Nitrogen (N) and Phosphorus (P) mix based on soil report recommendations."},
        {"day": 35, "type": "pest_control", "title": "Weeding & Pest Monitoring Checkpoint", "desc": "Perform manual weeding or spray recommended herbicide. Inspect leaves for leafhoppers, aphids, or yellow mosaic spots."},
        {"day": 50, "type": "fertilizer", "title": "First Top Dressing of Nitrogen", "desc": "Apply 1st top dressing of Nitrogen fertilizer (e.g. Urea or Organic compost slurry) to boost vegetative growth."},
        {"day": 65, "type": "irrigation", "title": "Critical Flowering Irrigation", "desc": "Ensure adequate water supply as crop enters flowering phase. Water stress now will severely reduce final yields."},
        {"day": 80, "type": "pest_control", "title": "Foliar Pest Control Checkpoint", "desc": "Check for pod borers or caterpillars. Spray organic Neem Oil formulation (1500ppm) or chemical insecticide as indicated by leaf signs."},
        {"day": 95, "type": "fertilizer", "title": "Second Top Dressing & Potassium Boost", "desc": "Apply final dose of fertilizer rich in Potassium (K) to support pod/grain filling and weight enhancement."},
        {"day": 110, "type": "irrigation", "title": "Final Irrigation and Pre-Harvest Drainage", "desc": "Moderate watering, then drain surplus water 10 days before scheduled harvest to allow uniform drying of grains/pods."},
        {"day": 120, "type": "harvest", "title": "Harvesting and Drying", "desc": "Harvest crop on a clear sunny day. Thresh and sun-dry the seeds to lower moisture content to 12% before storage or mandi transport."}
    ]
    
    db_events = []
    for evt in events_templates:
        event_date = start_date + datetime.timedelta(days=evt["day"])
        db_events.append(models.CropCalendarEvent(
            crop_cycle_id=crop_cycle.id,
            event_date=event_date,
            event_type=evt["type"],
            title=evt["title"],
            description=evt["desc"],
            is_completed=False
        ))
        
    db.bulk_save_objects(db_events)
    db.commit()

@router.post("/crop-cycles/start", response_model=schemas.CropCycleResponse)
def start_crop_cycle(req: schemas.CropCycleCreate, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    # Standard growing cycle length is ~120 days
    end_date = req.start_date + datetime.timedelta(days=120)
    
    crop_cycle = models.CropCycle(
        farmer_id=current_user.id,
        crop_name=req.crop_name,
        season=req.season,
        start_date=req.start_date,
        end_date=end_date,
        status="growing",
        soil_report_id=req.soil_report_id
    )
    
    db.add(crop_cycle)
    db.commit()
    db.refresh(crop_cycle)
    
    # Generate the calendar events for the crop cycle
    generate_calendar_events(db, crop_cycle)
    
    # Initialize budget tracker templates automatically
    # Estimated inputs: Seeds, Fertilizer, Labour, Irrigation, Pesticide
    prof = CROP_PROFILES.get(req.crop_name, {'base_cost': 15000})
    base_cost = prof['base_cost']
    
    budget_allocations = [
        {"category": "Seeds", "pct": 0.15, "note": "Estimated seed procurement cost"},
        {"category": "Fertilizer", "pct": 0.30, "note": "Chemical/Organic fertilizers base estimate"},
        {"category": "Labour", "pct": 0.25, "note": "Sowing, weeding, and harvesting labour cost"},
        {"category": "Irrigation", "pct": 0.10, "note": "Water pump electricity / water charges"},
        {"category": "Pesticide", "pct": 0.15, "note": "Pest & fungal control spray inputs"},
        {"category": "Other", "pct": 0.05, "note": "Miscellaneous tools and logistics buffer"}
    ]
    
    entries = []
    for alloc in budget_allocations:
        entries.append(models.BudgetEntry(
            crop_cycle_id=crop_cycle.id,
            category=alloc["category"],
            amount=round(base_cost * alloc["pct"], 2),
            entry_type="expense",
            date=req.start_date,
            note=alloc["note"]
        ))
        
    db.bulk_save_objects(entries)
    db.commit()
    
    return crop_cycle

@router.get("/crop-cycles/active", response_model=List[schemas.CropCycleResponse])
def get_active_crop_cycles(current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    cycles = db.query(models.CropCycle)\
               .filter(models.CropCycle.farmer_id == current_user.id, models.CropCycle.status == "growing")\
               .order_by(models.CropCycle.start_date.desc())\
               .all()
    return cycles

@router.get("/crop-cycles/{id}/calendar", response_model=List[schemas.CropCalendarEventResponse])
def get_crop_calendar(id: int, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    # Verify owner
    cycle = db.query(models.CropCycle).filter(models.CropCycle.id == id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Crop cycle not found")
        
    # Restrict to user except for admin
    if cycle.farmer_id != current_user.id and current_user.role != "admin":
         raise HTTPException(status_code=403, detail="Not authorized to access this crop cycle")
         
    events = db.query(models.CropCalendarEvent)\
               .filter(models.CropCalendarEvent.crop_cycle_id == id)\
               .order_by(models.CropCalendarEvent.event_date.asc())\
               .all()
    return events

@router.put("/crop-calendar-events/{event_id}", response_model=schemas.CropCalendarEventResponse)
def update_calendar_event(event_id: int, req: schemas.CropCalendarEventUpdate, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    event = db.query(models.CropCalendarEvent).filter(models.CropCalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Verify owner through cycle
    cycle = db.query(models.CropCycle).filter(models.CropCycle.id == event.crop_cycle_id).first()
    if cycle.farmer_id != current_user.id and current_user.role != "admin":
         raise HTTPException(status_code=403, detail="Not authorized to modify this event")
         
    event.is_completed = req.is_completed
    db.commit()
    db.refresh(event)
    return event
