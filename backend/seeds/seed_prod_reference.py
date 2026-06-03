import os
import sys
import datetime
import numpy as np

# Set up backend path import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import KVKCenter, FPODirectory, Scheme, MarketPrice

# Import templates and metadata from seed_db
from seeds.seed_db import STATES_DISTRICTS, CROPS, SCHEMES_LIST

def seed_production_reference_data():
    db = SessionLocal()
    try:
        print("Starting production-safe reference data seeding...")
        
        # 1. Seed 100 Krishi Vigyan Kendras (KVKs)
        if db.query(KVKCenter).count() == 0:
            print("Seeding KVK Centers (100 locations)...")
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
            print("KVK Centers seeded successfully.")
        else:
            print("KVK Centers already exist. Skipping.")

        # 2. Seed FPO Directory (30 FPOs)
        if db.query(FPODirectory).count() == 0:
            print("Seeding FPO Directory (30 FPOs)...")
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
            print("FPO Directory seeded successfully.")
        else:
            print("FPO Directory already exists. Skipping.")

        # 3. Seed Government Schemes (30 Schemes)
        if db.query(Scheme).count() == 0:
            print("Seeding Government Schemes (30)...")
            schemes_to_add = [Scheme(**s) for s in SCHEMES_LIST]
            db.bulk_save_objects(schemes_to_add)
            db.commit()
            print("Government Schemes seeded successfully.")
        else:
            print("Government Schemes already exist. Skipping.")

        # 4. Seed Mandi Price History (50 Mandis, last 90 days, 22 crops)
        if db.query(MarketPrice).count() == 0:
            print("Seeding Mandi Price History (50 Mandis, 22 Crops, 90 Days)...")
            mandi_locations = []
            # Select 50 districts across states to act as Mandi locations
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
            mandi_records = []
            
            # For each Mandi
            for state, district in mandi_locations:
                # Base coordinates for the Mandi
                lat = 19.0 + (hash(district) % 100) / 10.0
                lon = 75.0 + (hash(district + state) % 100) / 10.0
                
                # For each crop
                for crop in CROPS:
                    base_price = crop_base_prices[crop]
                    
                    # Generate daily price trend for the last 30 days
                    for d_offset in range(30):
                        recorded_date = today - datetime.timedelta(days=d_offset)
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
            print(f"Mandi prices seeded successfully: {len(mandi_records)} records added.")
        else:
            print("Mandi prices already exist. Skipping.")

        print("Production-safe reference data seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding production reference database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_production_reference_data()
