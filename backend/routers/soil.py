import math
import io
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import utils

router = APIRouter(
    prefix="/api",
    tags=["Soil & Planning"]
)

def haversine(lat1, lon1, lat2, lon2):
    # Haversine formula to calculate distance between two coordinates
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("/soil/submit", response_model=schemas.SoilReportResponse)
def submit_soil_report(report_in: schemas.SoilReportCreate, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    # If the user is a farmer, they submit for themselves. 
    # If they are a lab technician, they submit for the farmer specified in farmer_id.
    target_farmer_id = current_user.id
    source = "self"
    lab_id = None
    
    if current_user.role == "lab":
        if not report_in.farmer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="farmer_id is required for lab submissions"
            )
        target_farmer_id = report_in.farmer_id
        source = "lab"
        lab_id = current_user.id
    elif report_in.farmer_id and current_user.role == "admin":
        target_farmer_id = report_in.farmer_id
        source = report_in.source
        lab_id = report_in.lab_id

    # Verify farmer exists
    farmer = db.query(models.User).filter(models.User.id == target_farmer_id).first()
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified farmer does not exist"
        )
        
    soil_report = models.SoilReport(
        farmer_id=target_farmer_id,
        N=report_in.N,
        P=report_in.P,
        K=report_in.K,
        pH=report_in.pH,
        organic_carbon=report_in.organic_carbon,
        ec=report_in.ec,
        moisture=report_in.moisture,
        source=source,
        lab_id=lab_id
    )
    
    db.add(soil_report)
    db.commit()
    db.refresh(soil_report)
    return soil_report

@router.get("/soil/{farmer_id}/latest", response_model=schemas.SoilReportResponse)
def get_latest_soil_report(farmer_id: int, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    report = db.query(models.SoilReport)\
               .filter(models.SoilReport.farmer_id == farmer_id)\
               .order_by(models.SoilReport.submitted_at.desc())\
               .first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No soil report found for this farmer"
        )
    return report

@router.get("/soil/qr/{farmer_id}")
def get_farmer_qr_code(farmer_id: int, db: Session = Depends(get_db)):
    # Points to frontend lab portal route
    url = f"http://localhost:5173/lab-portal?farmer_id={farmer_id}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1a5c2a", back_color="white")
    
    # Save image to bytes stream
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    return StreamingResponse(img_byte_arr, media_type="image/png")

@router.get("/kvk/nearest", response_model=list[schemas.KVKCenterResponse])
def get_nearest_kvk(lat: float, lon: float, limit: int = 5, db: Session = Depends(get_db)):
    kvks = db.query(models.KVKCenter).all()
    if not kvks:
        return []
        
    # Calculate distance for each KVK
    sorted_kvks = []
    for kvk in kvks:
        distance = haversine(lat, lon, kvk.lat, kvk.lon)
        # Create response dict with dynamic field distance_km
        kvk_data = schemas.KVKCenterResponse.model_validate(kvk)
        kvk_data.distance_km = round(distance, 2)
        sorted_kvks.append(kvk_data)
        
    # Sort by distance
    sorted_kvks.sort(key=lambda x: x.distance_km)
    return sorted_kvks[:limit]
