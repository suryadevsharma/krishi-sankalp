from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import utils

router = APIRouter(
    prefix="/api/budget",
    tags=["Budget Tracking"]
)

@router.post("/entry", response_model=schemas.BudgetEntryResponse)
def create_budget_entry(entry_in: schemas.BudgetEntryCreate, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    # Verify crop cycle ownership
    cycle = db.query(models.CropCycle).filter(models.CropCycle.id == entry_in.crop_cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Crop cycle not found")
        
    if cycle.farmer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this crop cycle budget")
        
    entry = models.BudgetEntry(
        crop_cycle_id=entry_in.crop_cycle_id,
        category=entry_in.category,
        amount=entry_in.amount,
        entry_type=entry_in.entry_type,
        date=entry_in.date,
        note=entry_in.note
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.get("/{crop_cycle_id}/summary", response_model=schemas.BudgetSummaryResponse)
def get_budget_summary(crop_cycle_id: int, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    cycle = db.query(models.CropCycle).filter(models.CropCycle.id == crop_cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Crop cycle not found")
        
    if cycle.farmer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this crop cycle budget")
        
    entries = db.query(models.BudgetEntry)\
                .filter(models.BudgetEntry.crop_cycle_id == crop_cycle_id)\
                .order_by(models.BudgetEntry.date.desc())\
                .all()
                
    total_income = sum(e.amount for e in entries if e.entry_type == "income")
    total_expense = sum(e.amount for e in entries if e.entry_type == "expense")
    net_profit = total_income - total_expense
    
    return schemas.BudgetSummaryResponse(
        total_income=round(total_income, 2),
        total_expense=round(total_expense, 2),
        net_profit=round(net_profit, 2),
        entries=entries
    )

@router.delete("/entry/{entry_id}")
def delete_budget_entry(entry_id: int, current_user: models.User = Depends(utils.get_current_user), db: Session = Depends(get_db)):
    entry = db.query(models.BudgetEntry).filter(models.BudgetEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Budget entry not found")
        
    # Verify owner through cycle
    cycle = db.query(models.CropCycle).filter(models.CropCycle.id == entry.crop_cycle_id).first()
    if cycle.farmer_id != current_user.id and current_user.role != "admin":
         raise HTTPException(status_code=403, detail="Not authorized to delete this entry")
         
    db.delete(entry)
    db.commit()
    return {"status": "success", "message": "Budget entry deleted successfully"}
