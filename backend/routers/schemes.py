from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from database import get_db
import models
import schemas
import utils

router = APIRouter(
    prefix="/api/schemes",
    tags=["Government Schemes"]
)

@router.get("/recommend", response_model=List[schemas.SchemeResponse])
def recommend_schemes(state: str, land_acres: float, crop: Optional[str] = None, db: Session = Depends(get_db)):
    # Query schemes that are applicable:
    # 1. State matches current user's state, or is set to "All"
    # 2. Land acres falls within min_land_acres and max_land_acres limits
    query = db.query(models.Scheme).filter(
        or_(
            models.Scheme.applicable_states.ilike("%all%"),
            models.Scheme.applicable_states.ilike(f"%{state}%")
        )
    ).filter(
        models.Scheme.min_land_acres <= land_acres,
        models.Scheme.max_land_acres >= land_acres
    )
    
    schemes = query.all()
    
    # Optional further filtering by crop
    if crop:
        # Simple text containment or keyword matching
        filtered = []
        for s in schemes:
            desc = s.description.lower()
            name = s.name.lower()
            crop_lower = crop.lower()
            # If scheme lists specific crops or applies generally
            if crop_lower in desc or crop_lower in name or "crop" in desc or "all crops" in desc or "farmer" in desc:
                filtered.append(s)
        return filtered
        
    return schemes
