import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    village = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    land_acres = Column(Float, nullable=False)
    language_pref = Column(String, default="en", nullable=False)  # "en" or "hi"
    role = Column(String, default="farmer", nullable=False)        # "farmer", "lab", "fpo", "admin"
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    soil_reports = relationship("SoilReport", back_populates="farmer", foreign_keys="[SoilReport.farmer_id]")
    crop_cycles = relationship("CropCycle", back_populates="farmer")
    disease_detections = relationship("DiseaseDetection", back_populates="farmer")
    price_alerts = relationship("PriceAlert", back_populates="farmer")

class SoilReport(Base):
    __tablename__ = "soil_reports"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    N = Column(Float, nullable=False)
    P = Column(Float, nullable=False)
    K = Column(Float, nullable=False)
    pH = Column(Float, nullable=False)
    organic_carbon = Column(Float, nullable=False)
    ec = Column(Float, nullable=False)
    moisture = Column(Float, nullable=False)
    source = Column(String, default="self", nullable=False)  # "self" or "lab"
    lab_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    farmer = relationship("User", back_populates="soil_reports", foreign_keys=[farmer_id])
    lab = relationship("User", foreign_keys=[lab_id])
    crop_cycles = relationship("CropCycle", back_populates="soil_report")

class CropCycle(Base):
    __tablename__ = "crop_cycles"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    season = Column(String, nullable=False) # "Kharif", "Rabi", "Zaid"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, default="growing", nullable=False) # "planning", "growing", "completed"
    soil_report_id = Column(Integer, ForeignKey("soil_reports.id"), nullable=True)

    farmer = relationship("User", back_populates="crop_cycles")
    soil_report = relationship("SoilReport", back_populates="crop_cycles")
    calendar_events = relationship("CropCalendarEvent", back_populates="crop_cycle", cascade="all, delete-orphan")
    budget_entries = relationship("BudgetEntry", back_populates="crop_cycle", cascade="all, delete-orphan")
    disease_detections = relationship("DiseaseDetection", back_populates="crop_cycle")

class CropCalendarEvent(Base):
    __tablename__ = "crop_calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    crop_cycle_id = Column(Integer, ForeignKey("crop_cycles.id"), nullable=False)
    event_date = Column(Date, nullable=False)
    event_type = Column(String, nullable=False) # "sowing", "irrigation", "fertilizer", "pest_control", "harvest"
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)

    crop_cycle = relationship("CropCycle", back_populates="calendar_events")

class DiseaseDetection(Base):
    __tablename__ = "disease_detections"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    crop_cycle_id = Column(Integer, ForeignKey("crop_cycles.id"), nullable=True)
    image_path = Column(String, nullable=False)
    disease_name = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    treatment_organic = Column(Text, nullable=False)
    treatment_chemical = Column(Text, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    farmer = relationship("User", back_populates="disease_detections")
    crop_cycle = relationship("CropCycle", back_populates="disease_detections")

class MarketPrice(Base):
    __tablename__ = "market_prices"

    id = Column(Integer, primary_key=True, index=True)
    mandi_name = Column(String, nullable=False)
    state = Column(String, nullable=False)
    district = Column(String, nullable=False)
    crop_name = Column(String, nullable=False)
    price_per_quintal = Column(Float, nullable=False)
    recorded_date = Column(Date, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)

class KVKCenter(Base):
    __tablename__ = "kvk_centers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    contact = Column(String, nullable=False)

class FPODirectory(Base):
    __tablename__ = "fpo_directory"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    state = Column(String, nullable=False)
    district = Column(String, nullable=False)
    crops = Column(String, nullable=False) # comma-separated list of crops
    contact_email = Column(String, nullable=False)

class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    eligibility = Column(Text, nullable=False)
    apply_url = Column(String, nullable=False)
    applicable_states = Column(String, nullable=False) # comma-separated or "All"
    min_land_acres = Column(Float, default=0.0)
    max_land_acres = Column(Float, default=99999.0)

class BudgetEntry(Base):
    __tablename__ = "budget_entries"

    id = Column(Integer, primary_key=True, index=True)
    crop_cycle_id = Column(Integer, ForeignKey("crop_cycles.id"), nullable=False)
    category = Column(String, nullable=False) # "Seeds", "Fertilizer", "Labour", "Irrigation", "Pesticide", "Transport", "Other"
    amount = Column(Float, nullable=False)
    entry_type = Column(String, nullable=False) # "income" or "expense"
    date = Column(Date, nullable=False)
    note = Column(String, nullable=True)

    crop_cycle = relationship("CropCycle", back_populates="budget_entries")

class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    farmer = relationship("User", back_populates="price_alerts")
class OutbreakAlert(Base):
    __tablename__ = "outbreak_alerts"
    id = Column(Integer, primary_key=True, index=True)
    disease_name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    reported_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
