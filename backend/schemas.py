from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

# Auth
class UserCreate(BaseModel):
    phone: str
    email: str
    name: str
    village: str
    district: str
    state: str
    land_acres: float
    language_pref: str = "en"
    role: str = "farmer"
    password: str
    farmer_code: str

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(BaseModel):
    id: int
    phone: str
    email: Optional[str] = None
    name: str
    village: str
    district: str
    state: str
    land_acres: float
    language_pref: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    phone: Optional[str] = None
    role: Optional[str] = None

# Soil
class SoilReportCreate(BaseModel):
    farmer_id: Optional[int] = None # can be overridden by current_user id
    N: float
    P: float
    K: float
    pH: float
    organic_carbon: float
    ec: float
    moisture: float
    source: str = "self"  # "self" or "lab"
    lab_id: Optional[int] = None

class SoilReportResponse(BaseModel):
    id: int
    farmer_id: int
    N: float
    P: float
    K: float
    pH: float
    organic_carbon: float
    ec: float
    moisture: float
    source: str
    lab_id: Optional[int]
    submitted_at: datetime

    class Config:
        from_attributes = True

# Crop Cycle
class CropCycleCreate(BaseModel):
    crop_name: str
    season: str
    start_date: date
    soil_report_id: Optional[int] = None

class CropCycleResponse(BaseModel):
    id: int
    farmer_id: int
    crop_name: str
    season: str
    start_date: date
    end_date: date
    status: str
    soil_report_id: Optional[int]

    class Config:
        from_attributes = True

# Crop Calendar
class CropCalendarEventResponse(BaseModel):
    id: int
    crop_cycle_id: int
    event_date: date
    event_type: str
    title: str
    description: str
    is_completed: bool

    class Config:
        from_attributes = True

class CropCalendarEventUpdate(BaseModel):
    is_completed: bool

# Budget Tracker
class BudgetEntryCreate(BaseModel):
    crop_cycle_id: int
    category: str  # "Seeds", "Fertilizer", "Labour", "Irrigation", "Pesticide", "Transport", "Other"
    amount: float
    entry_type: str  # "income" or "expense"
    date: date
    note: Optional[str] = None

class BudgetEntryResponse(BaseModel):
    id: int
    crop_cycle_id: int
    category: str
    amount: float
    entry_type: str
    date: date
    note: Optional[str]

    class Config:
        from_attributes = True

class BudgetSummaryResponse(BaseModel):
    total_income: float
    total_expense: float
    net_profit: float
    entries: List[BudgetEntryResponse]

# Disease & Heatmap
class DiseaseDetectionResponse(BaseModel):
    id: int
    farmer_id: int
    crop_cycle_id: Optional[int]
    image_path: str
    disease_name: str
    confidence: float
    treatment_organic: str
    treatment_chemical: str
    lat: float
    lon: float
    detected_at: datetime

    class Config:
        from_attributes = True

class DiseaseHeatmapResponse(BaseModel):
    district: str
    state: str
    disease_name: str
    outbreak_count: int
    lat: float
    lon: float

# Market
class MarketPriceResponse(BaseModel):
    id: int
    mandi_name: str
    state: str
    district: str
    crop_name: str
    price_per_quintal: float
    recorded_date: date
    lat: float
    lon: float

    class Config:
        from_attributes = True

class BestMandiResponse(BaseModel):
    id: int
    mandi_name: str
    state: str
    district: str
    crop_name: str
    price_per_quintal: float
    recorded_date: date
    lat: float
    lon: float
    distance_km: float

class PriceAlertCreate(BaseModel):
    crop_name: str
    target_price: float

class PriceAlertResponse(BaseModel):
    id: int
    farmer_id: int
    crop_name: str
    target_price: float
    is_active: bool

    class Config:
        from_attributes = True

class LogisticsRequest(BaseModel):
    village_lat: float
    village_lon: float
    mandi_id: int
    quantity_quintals: float

class LogisticsResponse(BaseModel):
    mandi_name: str
    distance_km: float
    transport_cost_per_quintal: float
    total_transport_cost: float
    mandi_price_per_quintal: float
    gross_value: float
    net_realizable_value: float

# KVK Centers
class KVKCenterResponse(BaseModel):
    id: int
    name: str
    district: str
    state: str
    lat: float
    lon: float
    contact: str
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True

# FPO Directory
class FPODirectoryResponse(BaseModel):
    id: int
    name: str
    state: str
    district: str
    crops: str
    contact_email: str

    class Config:
        from_attributes = True

# Schemes
class SchemeResponse(BaseModel):
    id: int
    name: str
    description: str
    eligibility: str
    apply_url: str
    applicable_states: str
    min_land_acres: float
    max_land_acres: float

    class Config:
        from_attributes = True

# Soil health map details for Admin
class SoilHealthMapResponse(BaseModel):
    district: str
    state: str
    avg_N: float
    avg_P: float
    avg_K: float
    avg_pH: float
    avg_organic_carbon: float
    samples_count: int

# Auth Fixes
class OTPVerify(BaseModel):
    phone: str
    otp_code: str

class ForgotPasswordRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None

class VerifyRecoveryRequest(BaseModel):
    phone: str
    farmer_code: str

class ResetPasswordRequest(BaseModel):
    phone: str
    farmer_code: str
    new_password: str

