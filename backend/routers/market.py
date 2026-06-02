import math
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List
from database import get_db
import models
import schemas
import utils

router = APIRouter(
    prefix="/api",
    tags=["Market Linkage (Samriddhi)"]
)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.get("/market/prices", response_model=List[schemas.MarketPriceResponse])
def get_mandi_prices(crop_name: str, district: Optional[str] = None, state: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.MarketPrice).filter(models.MarketPrice.crop_name == crop_name)
    
    if district:
        query = query.filter(models.MarketPrice.district == district)
    elif state:
        query = query.filter(models.MarketPrice.state == state)
        
    # Return last 30 entries (sorted chronologically for Recharts line chart)
    prices = query.order_by(models.MarketPrice.recorded_date.desc()).limit(30).all()
    # Reverse to make it chronological (left to right)
    prices.reverse()
    return prices

@router.get("/market/best-price", response_model=List[schemas.BestMandiResponse])
def get_best_mandi_prices(crop_name: str, lat: float, lon: float, db: Session = Depends(get_db)):
    # Fetch the latest prices for each unique Mandi
    # Subquery to find latest recorded date per mandi for this crop
    subquery = db.query(
        models.MarketPrice.mandi_name,
        models.MarketPrice.crop_name,
        func.max(models.MarketPrice.recorded_date).label("max_date")
    ).filter(models.MarketPrice.crop_name == crop_name)\
     .group_by(models.MarketPrice.mandi_name, models.MarketPrice.crop_name)\
     .subquery()
     
    latest_prices = db.query(models.MarketPrice)\
                      .join(subquery, 
                            (models.MarketPrice.mandi_name == subquery.c.mandi_name) & 
                            (models.MarketPrice.recorded_date == subquery.c.max_date) & 
                            (models.MarketPrice.crop_name == subquery.c.crop_name))\
                      .all()
                      
    if not latest_prices:
        return []
        
    ranked_mandis = []
    for price in latest_prices:
        distance = haversine(lat, lon, price.lat, price.lon)
        # Filter mandis within 250 km radius (realistic local transport range)
        if distance <= 250.0:
            mandi_data = schemas.BestMandiResponse(
                id=price.id,
                mandi_name=price.mandi_name,
                state=price.state,
                district=price.district,
                crop_name=price.crop_name,
                price_per_quintal=price.price_per_quintal,
                recorded_date=price.recorded_date,
                lat=price.lat,
                lon=price.lon,
                distance_km=round(distance, 2)
            )
            ranked_mandis.append(mandi_data)
            
    # Sort by price descending (highest paying Mandi first)
    ranked_mandis.sort(key=lambda x: x.price_per_quintal, reverse=True)
    return ranked_mandis

@router.post("/market/price-alert", response_model=schemas.PriceAlertResponse)
def create_price_alert(alert_in: schemas.PriceAlertCreate, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    alert = models.PriceAlert(
        farmer_id=current_user.id,
        crop_name=alert_in.crop_name,
        target_price=alert_in.target_price,
        is_active=True
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/market/price-alerts", response_model=List[schemas.PriceAlertResponse])
def get_user_price_alerts(current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.PriceAlert).filter(models.PriceAlert.farmer_id == current_user.id).all()

@router.delete("/market/price-alerts/{alert_id}")
def delete_price_alert(alert_id: int, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    alert = db.query(models.PriceAlert).filter(models.PriceAlert.id == alert_id, models.PriceAlert.farmer_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Price alert not found")
    db.delete(alert)
    db.commit()
    return {"status": "success", "message": "Price alert deleted successfully"}

@router.get("/fpo/list", response_model=List[schemas.FPODirectoryResponse])
def list_fpos(state: Optional[str] = None, crop: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.FPODirectory)
    if state:
        query = query.filter(models.FPODirectory.state.ilike(state))
    if crop:
        query = query.filter(models.FPODirectory.crops.ilike(f"%{crop}%"))
    return query.all()

@router.post("/market/logistics", response_model=schemas.LogisticsResponse)
def estimate_logistics(req: schemas.LogisticsRequest, db: Session = Depends(get_db)):
    mandi = db.query(models.MarketPrice).filter(models.MarketPrice.id == req.mandi_id).first()
    if not mandi:
        raise HTTPException(status_code=404, detail="Mandi not found")
        
    distance = haversine(req.village_lat, req.village_lon, mandi.lat, mandi.lon)
    
    # Cost model: Base loading/unloading cost of ₹50 per quintal 
    # plus ₹2.5 per km per quintal transport rate
    base_handling_charge = 50.0
    per_km_transport_rate = 2.50
    
    transport_cost_per_quintal = base_handling_charge + (per_km_transport_rate * distance)
    total_transport_cost = transport_cost_per_quintal * req.quantity_quintals
    
    mandi_price = mandi.price_per_quintal
    gross_value = mandi_price * req.quantity_quintals
    net_realizable_value = gross_value - total_transport_cost
    
    return schemas.LogisticsResponse(
        mandi_name=mandi.mandi_name,
        distance_km=round(distance, 2),
        transport_cost_per_quintal=round(transport_cost_per_quintal, 2),
        total_transport_cost=round(total_transport_cost, 2),
        mandi_price_per_quintal=mandi_price,
        gross_value=round(gross_value, 2),
        net_realizable_value=round(net_realizable_value, 2)
    )
