import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import get_db
import models

# Security configurations
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretjwtkeyforagriculturalplatformkrishisankalp")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

import bcrypt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone: str = payload.get("sub")
        if phone is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.phone == phone).first()
    if user is None:
        raise credentials_exception
    return user

def simulate_otp(phone: str, otp_code: str):
    """
    Simulates sending an OTP.
    Logs to console in development, or connects to Twilio in production.
    """
    print("\n" + "="*50)
    print(f" OTP SIMULATION (DEV MODE)")
    print(f" To Phone: {phone}")
    print(f" Verification Code: {otp_code}")
    print("="*50 + "\n")
    
    # Twilio logic placeholder
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "mock_sid")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "mock_token")
    from_phone = os.getenv("TWILIO_PHONE_NUMBER", "mock_phone")
    if account_sid != "mock_sid" and auth_token != "mock_token":
        try:
            # Twilio imports if available and credentials configured
            from twilio.rest import Client
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body=f"Your Krishi Sankalp verification OTP is: {otp_code}",
                from_=from_phone,
                to=phone
            )
            print(f"Twilio SMS sent successfully: {message.sid}")
        except Exception as e:
            print(f"Failed to send Twilio SMS: {e}")

def send_otp_email(to_email: str, otp_code: str, is_reset: bool = False):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    # Configuration values
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    try:
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    app_env = os.getenv("APP_ENV", "development").lower()

    subject = "Krishi Sankalp - Password Reset OTP" if is_reset else "Krishi Sankalp - Account Verification OTP"
    body = f"Your Krishi Sankalp OTP is: {otp_code}. It is valid for 10 minutes."

    # Send using HTTP-based Resend API if API Key is configured (suitable for Render Free Tier)
    resend_api_key = os.getenv("RESEND_API_KEY", "")
    if resend_api_key:
        resend_from = os.getenv("RESEND_FROM", "onboarding@resend.dev")
        try:
            import httpx
            if app_env == "development":
                print("\n" + "="*50)
                print(f" RESEND API LOG (DEV MODE)")
                print(f" To Email: {to_email}")
                print(f" OTP Code: {otp_code}")
                print(f" Purpose: {'Password Reset' if is_reset else 'Account Verification'}")
                print("="*50 + "\n")
            
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": resend_from,
                    "to": [to_email],
                    "subject": subject,
                    "text": body
                },
                timeout=10.0
            )
            if response.status_code in (200, 201, 202):
                print(f"[RESEND SUCCESS] Email OTP successfully sent to {to_email} via Resend API.")
                return
            else:
                print(f"[RESEND ERROR] Failed to send email via Resend API: Status {response.status_code}, Response: {response.text}")
        except Exception as e:
            print(f"[RESEND EXCEPTION] Error calling Resend API: {e}")

    # Log only in development/testing mode
    if app_env == "development":
        print("\n" + "="*50)
        print(f" EMAIL OTP LOG (DEV MODE)")
        print(f" To Email: {to_email}")
        print(f" OTP Code: {otp_code}")
        print(f" Purpose: {'Password Reset' if is_reset else 'Account Verification'}")
        print("="*50 + "\n")

    if not smtp_user or not smtp_password:
        if app_env == "production":
            print("[SMTP ERROR] SMTP_USER or SMTP_PASSWORD is not configured in production environment.")
        else:
            print("[SMTP INFO] SMTP credentials not set. Skipping actual email delivery in dev mode.")
        return

    try:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
        print(f"[SMTP SUCCESS] Email OTP successfully sent to {to_email}")
    except Exception as e:
        print(f"[SMTP ERROR] Failed to send email to {to_email}: {e}")
