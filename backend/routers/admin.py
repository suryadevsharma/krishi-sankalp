from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
import models
import schemas
import utils

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin & Lab Portal"]
)

@router.get("/soil-health-map", response_model=List[schemas.SoilHealthMapResponse])
def get_soil_health_map(db: Session = Depends(get_db)):
    # Group soil reports by district and calculate averages
    # We join with the user table to get the farmer's district and state
    results = db.query(
        models.User.district,
        models.User.state,
        func.avg(models.SoilReport.N).label("avg_N"),
        func.avg(models.SoilReport.P).label("avg_P"),
        func.avg(models.SoilReport.K).label("avg_K"),
        func.avg(models.SoilReport.pH).label("avg_pH"),
        func.avg(models.SoilReport.organic_carbon).label("avg_organic_carbon"),
        func.count(models.SoilReport.id).label("samples_count")
    ).join(models.SoilReport, models.User.id == models.SoilReport.farmer_id)\
     .group_by(models.User.district, models.User.state)\
     .all()
     
    map_data = []
    for r in results:
        map_data.append({
            "district": r[0],
            "state": r[1],
            "avg_N": round(float(r[2]), 2) if r[2] else 0.0,
            "avg_P": round(float(r[3]), 2) if r[3] else 0.0,
            "avg_K": round(float(r[4]), 2) if r[4] else 0.0,
            "avg_pH": round(float(r[5]), 2) if r[5] else 0.0,
            "avg_organic_carbon": round(float(r[6]), 2) if r[6] else 0.0,
            "samples_count": r[7]
        })
        
    return map_data

@router.get("/farmers", response_model=List[schemas.UserResponse])
def get_farmers_list(current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    # Lab technicians, FPOs, and Admins can see the list of farmers to submit/analyze reports
    if current_user.role not in ["lab", "admin", "fpo"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Lab, FPO or Admin credentials required."
        )
        
    return db.query(models.User).filter(models.User.role == "farmer").all()

@router.get("/pending-soil-requests")
def get_pending_soil_requests(current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["lab", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
        
    # Farmers who do not have any soil report uploaded yet
    # Subquery of farmer IDs who have soil reports
    reported_farmers = db.query(models.SoilReport.farmer_id).subquery()
    
    pending_farmers = db.query(models.User)\
                        .filter(models.User.role == "farmer")\
                        .filter(~models.User.id.in_(reported_farmers))\
                        .all()
                        
    return pending_farmers
