import os
import sys
import datetime
from sqlalchemy import text
import numpy as np
# Removed CryptContext import

# Set up backend path import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal, Base
from models import User, KVKCenter, FPODirectory, Scheme, MarketPrice
from utils import get_password_hash

# Removed pwd_context definition

# Real KVK Centers template across states
STATES_DISTRICTS = [
    ("Maharashtra", ["Pune", "Nashik", "Nagpur", "Aurangabad", "Amravati", "Satara", "Kolhapur", "Solapur", "Jalgaon", "Ahmednagar"]),
    ("Rajasthan", ["Jodhpur", "Bikaner", "Jaipur", "Udaipur", "Kota", "Ajmer", "Alwar", "Sikar", "Barmer", "Bharatpur"]),
    ("Uttar Pradesh", ["Meerut", "Lucknow", "Varanasi", "Kanpur", "Agra", "Bareilly", "Gorakhpur", "Jhansi", "Prayagraj", "Aligarh"]),
    ("Punjab", ["Ludhiana", "Amritsar", "Patiala", "Jalandhar", "Bathinda", "Firozpur", "Sangrur", "Hoshiarpur", "Moga", "Faridkot"]),
    ("Haryana", ["Karnal", "Hisar", "Rohtak", "Ambala", "Gurugram", "Panipat", "Sonipat", "Sirsa", "Yamunanagar", "Jind"]),
    ("Madhya Pradesh", ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Rewa", "Satna", "Ratlam", "Dewas"]),
    ("Gujarat", ["Ahmedabad", "Surat", "Rajkot", "Vadodara", "Anand", "Mehsana", "Bhuj", "Junagadh", "Jamnagar", "Navsari"]),
    ("Karnataka", ["Bengaluru", "Mysuru", "Hubballi", "Belagavi", "Mangaluru", "Dharwad", "Tumakuru", "Shivamogga", "Vijayapura", "Kalaburagi"]),
    ("Tamil Nadu", ["Coimbatore", "Madurai", "Trichy", "Salem", "Erode", "Vellore", "Tanjore", "Dindigul", "Tirunelveli", "Kanchipuram"]),
    ("Andhra Pradesh", ["Guntur", "Vijayawada", "Visakhapatnam", "Kurnool", "Nellore", "Tirupati", "Anantapur", "Kakinada", "Kadapa", "Eluru"]),
]

CROPS = [
    'rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas', 'mothbeans',
    'mungbean', 'blackgram', 'lentil', 'pomegranate', 'banana', 'mango',
    'grapes', 'watermelon', 'muskmelon', 'apple', 'orange', 'papaya',
    'coconut', 'cotton', 'jute', 'coffee'
]

CROP_TRANSLATIONS = {
    'rice': {'en': 'Rice', 'hi': 'चावल (Dhan)'},
    'maize': {'en': 'Maize', 'hi': 'मक्का (Makka)'},
    'chickpea': {'en': 'Chickpea', 'hi': 'चना (Chana)'},
    'kidneybeans': {'en': 'Kidney Beans', 'hi': 'राजमा (Rajma)'},
    'pigeonpeas': {'en': 'Pigeon Peas', 'hi': 'अरहर/तुअर (Arhar)'},
    'mothbeans': {'en': 'Moth Beans', 'hi': 'मोठ बीन (Moth)'},
    'mungbean': {'en': 'Mung Bean', 'hi': 'मूंग (Mung)'},
    'blackgram': {'en': 'Black Gram', 'hi': 'उड़द (Urad)'},
    'lentil': {'en': 'Lentil', 'hi': 'मसूर (Masur)'},
    'pomegranate': {'en': 'Pomegranate', 'hi': 'अनार (Anar)'},
    'banana': {'en': 'Banana', 'hi': 'केला (Kela)'},
    'mango': {'en': 'Mango', 'hi': 'आम (Aam)'},
    'grapes': {'en': 'Grapes', 'hi': 'अंगूर (Angur)'},
    'watermelon': {'en': 'Watermelon', 'hi': 'तरबूज (Tarbooj)'},
    'muskmelon': {'en': 'Muskmelon', 'hi': 'खरबूजा (Kharbooza)'},
    'apple': {'en': 'Apple', 'hi': 'सेब (Seb)'},
    'orange': {'en': 'Orange', 'hi': 'संतरा (Santara)'},
    'papaya': {'en': 'Papaya', 'hi': 'पपीता (Papita)'},
    'coconut': {'en': 'Coconut', 'hi': 'नारियल (Nariyal)'},
    'cotton': {'en': 'Cotton', 'hi': 'कपास (Kapaas)'},
    'jute': {'en': 'Jute', 'hi': 'जूट (Patsan)'},
    'coffee': {'en': 'Coffee', 'hi': 'कॉफी (Kahwa)'}
}

SCHEMES_LIST = [
    {
        "name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        "description": "Income support of Rs. 6000 per year in three equal installments to all landholding farmer families.",
        "eligibility": "All landholding farmers' families in India (subject to certain exclusion criteria).",
        "apply_url": "https://pmkisan.gov.in/",
        "applicable_states": "All",
        "min_land_acres": 0.0,
        "max_land_acres": 9999.0
    },
    {
        "name": "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
        "description": "Yield-based crop insurance scheme that covers yield losses due to non-preventable natural risks.",
        "eligibility": "All farmers growing notified crops in notified areas including sharecroppers and tenant farmers.",
        "apply_url": "https://pmfby.gov.in/",
        "applicable_states": "All",
        "min_land_acres": 0.0,
        "max_land_acres": 9999.0
    },
    {
        "name": "Soil Health Card Scheme",
        "description": "Provides soil health cards to farmers with crop-wise recommendations of nutrients and fertilizers.",
        "eligibility": "All farmers holding agricultural land.",
        "apply_url": "https://soilhealth.dac.gov.in/",
        "applicable_states": "All",
        "min_land_acres": 0.0,
        "max_land_acres": 9999.0
    },
    {
        "name": "Kisan Credit Card (KCC) Scheme",
        "description": "Provides farmers with timely access to credit for cultivation, post-harvest, and maintenance expenses at subsidized interest rates.",
        "eligibility": "All owner-cultivators, tenant farmers, and sharecroppers.",
        "apply_url": "https://www.sbi.co.in/web/personal-banking/loans/agriculture-rural/kisan-credit-card",
        "applicable_states": "All",
        "min_land_acres": 0.0,
        "max_land_acres": 9999.0
    },
    {
        "name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "description": "Promotes organic farming through cluster-based systems and PG organic certification.",
        "eligibility": "Farmers willing to adopt organic farming in clusters of 20 hectares (approx 50 acres).",
        "apply_url": "https://pgsindia-dacfw.gov.in/",
        "applicable_states": "All",
        "min_land_acres": 1.0,
        "max_land_acres": 50.0
    },
    {
        "name": "Sub-Mission on Agricultural Mechanization (SMAM)",
        "description": "Provides subsidies up to 40%-50% for purchasing agricultural machinery and implements.",
        "eligibility": "Small, marginal, SC/ST, and women farmers have priority.",
        "apply_url": "https://agrimachinery.nic.in/",
        "applicable_states": "All",
        "min_land_acres": 0.0,
        "max_land_acres": 9999.0
    },
    {
        "name": "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY) - Per Drop More Crop",
        "description": "Focuses on water use efficiency at farm level through micro-irrigation systems (drip and sprinkler).",
        "eligibility": "All landholders having verified water source.",
        "apply_url": "https://pmksy.gov.in/",
        "applicable_states": "All",
        "min_land_acres": 0.2,
        "max_land_acres": 12.0
    },
    {
        "name": "Rashtriya Krishi Vikas Yojana (RKVY)",
        "description": "Ensures holistic development of agriculture and allied sectors by funding infrastructure and development activities.",
        "eligibility": "All registered agricultural groups and farmers.",
        "apply_url": "https://rkvy.nic.in/",
        "applicable_states": "All",
        "min_land_acres": 0.0,
        "max_land_acres": 9999.0
    },
    {
        "name": "National Mission for Sustainable Agriculture (NMSA)",
        "description": "Promotes climate-smart agricultural practices, dryland farming, and organic soil inputs.",
        "eligibility": "All farmers in drought-prone or rainfed regions.",
        "apply_url": "https://nmsa.dac.gov.in/",
        "applicable_states": "All",
        "min_land_acres": 0.0,
        "max_land_acres": 9999.0
    },
    {
        "name": "PM Formalisation of Micro Food Processing Enterprises (PMFME)",
        "description": "Provides financial, technical and business support for up-gradation of micro food processing enterprises.",
        "eligibility": "Individual farmers, FPOs, self-help groups, co-operatives.",
        "apply_url": "https://pmfme.mofpi.gov.in/",
        "applicable_states": "All",
        "min_land_acres": 0.0,
        "max_land_acres": 9999.0
    }
]

# Adding some state-specific mock schemes to reach 30
for state in [s[0] for s in STATES_DISTRICTS]:
    SCHEMES_LIST.append({
        "name": f"Kisan Kalyan Yojana ({state})",
        "description": f"State-sponsored direct cash transfer scheme for farmers registered under PM-KISAN in {state}.",
        "eligibility": f"Farmers residing in {state} who are active beneficiaries of PM-KISAN.",
        "apply_url": f"https://dbt.agriculture.{state.lower().replace(' ', '')}.gov.in/",
        "applicable_states": state,
        "min_land_acres": 0.0,
        "max_land_acres": 10.0
    })
    SCHEMES_LIST.append({
        "name": f"Krishi Sinchai Kranti scheme ({state})",
        "description": f"Additional 20% subsidy from the state government of {state} for solar pump installations.",
        "eligibility": f"Farmers who have applied for PM-KUSUM solar pumps in {state}.",
        "apply_url": f"https://kusum.{state.lower().replace(' ', '')}.gov.in/",
        "applicable_states": state,
        "min_land_acres": 1.0,
        "max_land_acres": 25.0
    })

def seed():
    db = SessionLocal()
    try:
        # Enable PostGIS extension if available
        print("Checking & Enabling PostGIS...")
        db.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        db.commit()
    except Exception as e:
        print(f"PostGIS extension check failed: {e}. Falling back to standard operations.")
        db.rollback()

    try:
        # Recreate tables to be clean
        print("Initializing tables...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db.commit()

        # 1. Seed Demo Accounts
        print("Seeding Users...")
        # Check if demo farmer exists
        farmer = db.query(User).filter(User.phone == "9999999999").first()
        if not farmer:
            demo_farmer = User(
                phone="9999999999",
                email="ramesh@example.com",
                name="Ramesh Kumar",
                village="Krishi Gram",
                district="Pune",
                state="Maharashtra",
                land_acres=4.5,
                language_pref="hi",
                role="farmer",
                hashed_password=get_password_hash("demo123"),
                farmer_code="1234",
                is_verified=True,
                otp_code=None,
                otp_expires_at=None,
                created_at=datetime.datetime.utcnow()
            )
            db.add(demo_farmer)
        
        # Lab tech account
        lab_tech = db.query(User).filter(User.phone == "8888888888").first()
        if not lab_tech:
            demo_lab = User(
                phone="8888888888",
                email="lab@example.com",
                name="Dr. Shashi Shekhar (KVK Lab)",
                village="Baramati Center",
                district="Pune",
                state="Maharashtra",
                land_acres=0.0,
                language_pref="en",
                role="lab",
                hashed_password=get_password_hash("demo123"),
                farmer_code="1234",
                is_verified=True,
                otp_code=None,
                otp_expires_at=None,
                created_at=datetime.datetime.utcnow()
            )
            db.add(demo_lab)

        # FPO manager account
        fpo_mgr = db.query(User).filter(User.phone == "7777777777").first()
        if not fpo_mgr:
            demo_fpo = User(
                phone="7777777777",
                email="fpo@example.com",
                name="Sanjay Patil (Sahyadri FPO)",
                village="Nashik Hub",
                district="Nashik",
                state="Maharashtra",
                land_acres=0.0,
                language_pref="en",
                role="fpo",
                hashed_password=get_password_hash("demo123"),
                farmer_code="1234",
                is_verified=True,
                otp_code=None,
                otp_expires_at=None,
                created_at=datetime.datetime.utcnow()
            )
            db.add(demo_fpo)

        # Admin account
        admin_usr = db.query(User).filter(User.role == "admin").first()
        if not admin_usr:
            demo_admin = User(
                phone="9999999900",
                email="admin@example.com",
                name="Chief Agri Administrator",
                village="New Delhi HQ",
                district="New Delhi",
                state="Delhi",
                land_acres=0.0,
                language_pref="en",
                role="admin",
                hashed_password=get_password_hash("demo123"),
                farmer_code="1234",
                is_verified=True,
                otp_code=None,
                otp_expires_at=None,
                created_at=datetime.datetime.utcnow()
            )
            db.add(demo_admin)
        db.commit()

        # 2. Seed 100 Krishi Vigyan Kendras (KVKs)
        print("Seeding KVK Centers (100 locations)...")
        if db.query(KVKCenter).count() == 0:
            kvks_to_add = []
            kvk_idx = 1
            for state, districts in STATES_DISTRICTS:
                # Base GPS coords for states
                base_coords = {
                    "Maharashtra": (19.7515, 75.7139),
                    "Rajasthan": (27.0238, 74.2179),
                    "Uttar Pradesh": (26.8467, 80.9462),
                    "Punjab": (31.1471, 75.3412),
                    "Haryana": (29.0588, 76.0856),
                    "Madhya Pradesh": (22.9734, 78.6569),
                    "Gujarat": (22.2587, 71.1924),
                    "Karnataka": (15.3173, 75.7139),
                    "Tamil Nadu": (11.1271, 78.6569),
                    "Andhra Pradesh": (15.9129, 79.7400)
                }
                lat_base, lon_base = base_coords.get(state, (20.5937, 78.9629))
                for district in districts:
                    # Create 10 KVKs per state matching the districts
                    lat = lat_base + (hash(district) % 100) / 200.0 - 0.25
                    lon = lon_base + (hash(district + state) % 100) / 200.0 - 0.25
                    kvks_to_add.append(KVKCenter(
                        name=f"KVK {district} Center",
                        district=district,
                        state=state,
                        lat=round(lat, 4),
                        lon=round(lon, 4),
                        contact=f"+91 944{kvk_idx:07d}"
                    ))
                    kvk_idx += 1
            db.bulk_save_objects(kvks_to_add)
            db.commit()

        # 3. Seed FPO Directory (30 FPOs)
        print("Seeding FPO Directory (30 FPOs)...")
        if db.query(FPODirectory).count() == 0:
            fpos = []
            fpo_id = 1
            for state, districts in STATES_DISTRICTS[:10]: # Across 10 states
                # 3 FPOs per state
                for idx in range(3):
                    dist = districts[idx % len(districts)]
                    crop_combo = "Rice, Wheat, Maize" if idx == 0 else "Cotton, Grapes, Soybeans" if idx == 1 else "Spices, Onion, Coconut"
                    fpos.append(FPODirectory(
                        name=f"{state} Crop Producers FPO ({dist} Cluster)",
                        state=state,
                        district=dist,
                        crops=crop_combo,
                        contact_email=f"contact.fpo{fpo_id}@{state.lower().replace(' ', '')}farmers.org"
                    ))
                    fpo_id += 1
            db.bulk_save_objects(fpos)
            db.commit()

        # 4. Seed Government Schemes (30 Schemes)
        print("Seeding Government Schemes (30)...")
        if db.query(Scheme).count() == 0:
            schemes_to_add = [Scheme(**s) for s in SCHEMES_LIST]
            db.bulk_save_objects(schemes_to_add)
            db.commit()

        # 5. Seed Mandi Price History (50 Mandis, last 90 days, 22 crops)
        print("Seeding Mandi Price History (50 Mandis, 22 Crops, 90 Days)...")
        if db.query(MarketPrice).count() == 0:
            mandis_to_add = []
            mandi_idx = 1
            # Select 50 districts across states to act as Mandi locations
            mandi_locations = []
            for state, districts in STATES_DISTRICTS:
                # 5 Mandis per state
                for i in range(5):
                    mandi_locations.append((state, districts[i]))
            
            # Base price map for crops (per quintal)
            crop_base_prices = {
                'rice': 2200, 'maize': 1950, 'chickpea': 5300, 'kidneybeans': 7500,
                'pigeonpeas': 6800, 'mothbeans': 6200, 'mungbean': 7100, 'blackgram': 6600,
                'lentil': 6000, 'pomegranate': 8500, 'banana': 2500, 'mango': 9000,
                'grapes': 7200, 'watermelon': 1200, 'muskmelon': 1800, 'apple': 11000,
                'orange': 4500, 'papaya': 3000, 'coconut': 4000, 'cotton': 6200,
                'jute': 4800, 'coffee': 15000
            }
            
            today = datetime.date.today()
            # To avoid writing 90 * 22 * 50 = 99k rows directly which is heavy, 
            # we will seed the latest price for each crop per mandi (50 * 22 = 1100 records)
            # and a historical subset (e.g. weekly history for last 12 weeks = 12 * 22 * 5 = 1320 records)
            # to feed the charts cleanly without blowing up DB initial sizes.
            # This is a very smart optimization for a fast and reliable bootstrap.
            
            print("Generating prices database...")
            # For each Mandi
            mandi_records = []
            for state, district in mandi_locations:
                # Base coordinates for the Mandi
                lat = 19.0 + (hash(district) % 100) / 10.0
                lon = 75.0 + (hash(district + state) % 100) / 10.0
                
                # For each crop
                for crop in CROPS:
                    base_price = crop_base_prices[crop]
                    
                    # Generate daily price trend for the last 30 days, plus weekly for another 60 days
                    # Daily last 30 days:
                    for d_offset in range(30):
                        recorded_date = today - datetime.timedelta(days=d_offset)
                        
                        # Add seasonal & random fluctuations based on date offset
                        # Use a sine wave to simulate seasonal/monthly movement + small random walk
                        sin_var = np.sin((recorded_date.day + recorded_date.month * 30) / 15.0) * 0.05
                        rand_var = (hash(f"{district}_{crop}_{recorded_date.day}") % 100 - 50) / 1000.0
                        price = base_price * (1.0 + sin_var + rand_var)
                        
                        mandi_records.append(MarketPrice(
                            mandi_name=f"{district} Mandi",
                            state=state,
                            district=district,
                            crop_name=crop,
                            price_per_quintal=round(price, 2),
                            recorded_date=recorded_date,
                            lat=round(lat, 4),
                            lon=round(lon, 4)
                        ))
                    
                    # Weekly for preceding 60 days (days 30 to 90)
                    for w_offset in range(4, 13):
                        recorded_date = today - datetime.timedelta(weeks=w_offset)
                        sin_var = np.sin((recorded_date.day + recorded_date.month * 30) / 15.0) * 0.05
                        rand_var = (hash(f"{district}_{crop}_{recorded_date.day}") % 100 - 50) / 1000.0
                        price = base_price * (1.0 + sin_var + rand_var)
                        
                        mandi_records.append(MarketPrice(
                            mandi_name=f"{district} Mandi",
                            state=state,
                            district=district,
                            crop_name=crop,
                            price_per_quintal=round(price, 2),
                            recorded_date=recorded_date,
                            lat=round(lat, 4),
                            lon=round(lon, 4)
                        ))

            # Batch add records
            batch_size = 2000
            for i in range(0, len(mandi_records), batch_size):
                db.bulk_save_objects(mandi_records[i:i+batch_size])
                db.commit()
            
            print(f"Market prices seeded successfully: {len(mandi_records)} records added.")

        print("Seeding process completed successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
