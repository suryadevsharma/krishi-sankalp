import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import utils

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

import re
from datetime import datetime, timedelta

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    clean_phone = user_in.phone.strip()
    clean_email = user_in.email.strip().lower()
    clean_password = user_in.password.strip()
    clean_farmer_code = user_in.farmer_code.strip()
    
    # Validate farmer code is exactly 4 digits, numbers only
    if not re.match(r"^\d{4}$", clean_farmer_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Farmer Code must be exactly 4 digits"
        )
    
    # Validate email format
    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format"
        )
    
    # Check if email is already registered
    db_user_email = db.query(models.User).filter(models.User.email == clean_email).first()
    if db_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )
    
    # Check if phone number is already registered
    db_user_phone = db.query(models.User).filter(models.User.phone == clean_phone).first()
    if db_user_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Hash password and create user
    hashed_password = utils.get_password_hash(clean_password)
    
    user = models.User(
        phone=clean_phone,
        email=clean_email,
        name=user_in.name.strip(),
        village=user_in.village.strip(),
        district=user_in.district.strip(),
        state=user_in.state.strip(),
        land_acres=user_in.land_acres,
        language_pref=user_in.language_pref,
        role=user_in.role,
        hashed_password=hashed_password,
        farmer_code=clean_farmer_code,
        is_verified=True  # Instant auto-verification
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    clean_phone = user_in.phone.strip()
    clean_password = user_in.password.strip()
    
    print(f"[LOGIN DEBUG] Clean Phone: '{clean_phone}', Clean Password: '{clean_password}'")
    user = db.query(models.User).filter(models.User.phone == clean_phone).first()
    if not user:
        print(f"[LOGIN DEBUG] User not found for phone '{clean_phone}'")
    else:
        print(f"[LOGIN DEBUG] User found: id={user.id}, is_verified={user.is_verified}")
        pw_check = utils.verify_password(clean_password, user.hashed_password)
        print(f"[LOGIN DEBUG] Password check result: {pw_check}")
        
    if not user or not utils.verify_password(clean_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account not verified. Please verify your OTP first."
        )
    
    # Access token payload contains subject (phone) and role
    access_token = utils.create_access_token(
        data={"sub": user.phone, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_current_user(current_user: models.User = Depends(utils.get_current_user)):
    return current_user

@router.post("/verify-otp")
def verify_otp(verify_in: schemas.OTPVerify, db: Session = Depends(get_db)):
    clean_phone = verify_in.phone.strip()
    clean_otp = verify_in.otp_code.strip()
    
    user = db.query(models.User).filter(models.User.phone == clean_phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"status": "success", "message": "Account already verified."}
    
    # Check OTP expiration
    if user.otp_expires_at and datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP code.")
        
    if user.otp_code != clean_otp or not user.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
    
    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    return {"status": "success", "message": "Account successfully verified."}

@router.post("/forgot-password")
def forgot_password(forgot_in: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = None
    if forgot_in.email:
        clean_email = forgot_in.email.strip().lower()
        user = db.query(models.User).filter(models.User.email == clean_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User with this email address not found.")
    elif forgot_in.phone:
        clean_phone = forgot_in.phone.strip()
        user = db.query(models.User).filter(models.User.phone == clean_phone).first()
        if not user:
            raise HTTPException(status_code=404, detail="User with this phone number not found.")
        clean_email = user.email
    else:
        raise HTTPException(status_code=400, detail="Either email or phone is required.")
    
    otp_code = str(random.randint(100000, 999999))
    user.otp_code = otp_code
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    # Send email OTP for reset
    utils.send_otp_email(clean_email, otp_code, is_reset=True)
    return {"status": "success", "message": "Reset OTP sent successfully."}

@router.post("/verify-recovery")
def verify_recovery(verify_in: schemas.VerifyRecoveryRequest, db: Session = Depends(get_db)):
    clean_phone = verify_in.phone.strip()
    clean_code = verify_in.farmer_code.strip()
    
    user = db.query(models.User).filter(
        models.User.phone == clean_phone,
        models.User.farmer_code == clean_code
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with the provided Phone Number and Farmer Code."
        )
    return {"status": "success", "message": "Identity verified successfully."}

@router.post("/reset-password")
def reset_password(reset_in: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    clean_phone = reset_in.phone.strip()
    clean_code = reset_in.farmer_code.strip()
    clean_new_password = reset_in.new_password.strip()
    
    user = db.query(models.User).filter(
        models.User.phone == clean_phone,
        models.User.farmer_code == clean_code
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid Phone Number or Farmer Code."
        )
    
    user.hashed_password = utils.get_password_hash(clean_new_password)
    user.otp_code = None
    user.otp_expires_at = None
    user.is_verified = True
    db.commit()
    return {"status": "success", "message": "Password reset successfully. Please login."}

