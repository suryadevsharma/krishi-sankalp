# Krishi Sankalp (कृषि संकल्प)

Krishi Sankalp is an advanced agricultural intelligence and support platform designed to empower Indian farmers, Farmer Producer Organizations (FPOs), and agricultural stakeholders. The platform provides real-time mandi prices, logistics cost estimates, FPO search directories, weather forecasts, price alerts, and machine learning models for crop recommendation and disease classification.

## 🚀 Key Features

*   **Samriddhi Mandi Linkage**: Find the best mandi prices for crops in a 250km radius with geospatial distance calculation.
*   **Logistics Estimator**: Estimate transport cost per quintal, loading/unloading charges, and net realizable crop value.
*   **Secure OTP Authentication**: Sign up and request OTP verification sent directly to the farmer's email with a secure, rate-limited login.
*   **Price Alerts**: Get real-time notifications when mandi prices reach a farmer-defined target.
*   **AI Crop & Pest Models**: Machine Learning-powered suggestions for optimal crops and diagnosis.
*   **FPO Directory**: State-wise and crop-wise search directory to connect farmers directly with organizations.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), TailwindCSS, Leaflet (Map visualization), Recharts, Zustand (State management), React-i18next (Multilingual support)
*   **Backend**: FastAPI (Python 3.10), SQLAlchemy ORM, Pydantic, GeoAlchemy2, Uvicorn
*   **Database**: PostgreSQL 15 with **PostGIS** geospatial extensions
*   **Machine Learning**: TensorFlow, Scikit-Learn, Pandas, NumPy
*   **Containerization**: Docker & Docker Compose

---

## 📂 Project Structure

```text
krishi-sankalp/
├── backend/                  # FastAPI Application
│   ├── Dockerfile
│   ├── database.py           # Database connection & session setup
│   ├── main.py               # FastAPI main app configuration
│   ├── models.py             # SQLAlchemy models (User, MarketPrice, FPO, etc.)
│   ├── requirements.txt      # Python dependencies
│   ├── schemas.py            # Pydantic schema validation models
│   ├── utils.py              # OTP generation, JWT, hashing, & Email utilities
│   ├── routers/              # Endpoint modular routers (auth, market, etc.)
│   ├── seeds/                # Initial seed data scripts (seed_db.py)
│   └── uploads/              # Storage directory for local uploads
├── frontend/                 # React Frontend
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── public/               # Static assets & icons
│   └── src/                  # React source code (components, pages, locales)
├── docker-compose.yml        # Docker Multi-Container setup
├── .gitignore                # Git ignore patterns
└── README.md                 # Project documentation
```

---

## 💻 Local Development Setup

### Prerequisites
Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine.

### 1. Configuration (`.env`)
Create a `.env` file in the root folder (`krishi-sankalp/.env`) to configure your SMTP settings for email OTP delivery:

```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```
*(Note: If using Gmail, generate an **App Password** from your Google Account settings instead of using your personal password).*

### 2. Launch the Application
Run the following command from the root of the project directory to build and spin up the containers:

```bash
docker compose up --build
```

This will launch three containers:
*   **Database (krishi_db)**: Running on port `5432`
*   **Backend (krishi_backend)**: Running on port `8000` (API Docs available at `http://localhost:8000/docs`)
*   **Frontend (krishi_frontend)**: Running on port `5173` (Open `http://localhost:5173` in your browser)

### 3. Seed Initial Mandi & User Data
After the containers are up and healthy, open a separate terminal window and seed the database with test accounts, mandi prices, and FPOs:

```bash
# Run seed script inside the backend container
docker exec -it krishi_backend python seeds/seed_db.py
```
This initializes demo accounts (e.g. phone: `9876543210` with password `password123`).

---

## 🐙 Pushing to GitHub

To push your project to a new GitHub repository, open your terminal inside the `krishi-sankalp` directory and run:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Add files (only files not ignored in .gitignore will be added)
git add .

# 3. Commit files
git commit -m "feat: Initial commit of Krishi Sankalp agricultural platform"

# 4. Rename default branch to main
git branch -M main

# 5. Link repository (replace with your GitHub repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# 6. Push to main
git push -u origin main
```

---

## ☁️ Deployment

Here is how you can deploy the app to production.

### Option A: Virtual Private Server (VPS) via Docker Compose (Recommended)
This is the easiest option since the repository is already configured with Docker Compose:

1.  Provision a VPS (e.g., DigitalOcean, Linode, AWS EC2) running Ubuntu.
2.  Install Docker and Docker Compose on the VPS.
3.  Clone the repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
    cd YOUR_REPOSITORY
    ```
4.  Create your production `.env` file.
5.  Launch the app:
    ```bash
    docker compose -f docker-compose.yml up -d
    ```
6.  Run the database seeder:
    ```bash
    docker exec -d krishi_backend python seeds/seed_db.py
    ```
7.  Configure Nginx or Caddy on the host as a reverse proxy with SSL (Let's Encrypt).

### Option B: Cloud PaaS (Render, Railway, Fly.io)
If you prefer not to manage a server:

1.  **Database**: Spin up a PostgreSQL database instance on Render/Railway. Add the **PostGIS** extension (run `CREATE EXTENSION postgis;`).
2.  **Backend**:
    *   Deploy the `backend` folder as a Web Service.
    *   Set the builder type to **Docker** (it will auto-detect `backend/Dockerfile`).
    *   Configure environment variables:
        *   `DATABASE_URL`: Set to your hosted PostgreSQL connection string.
        *   `SMTP_USER` & `SMTP_PASSWORD`: Your SMTP server credentials.
        *   `APP_ENV`: `production`
        *   `SECRET_KEY`: A strong, random alphanumeric string.
3.  **Frontend**:
    *   Deploy the `frontend` folder.
    *   Set build command to: `npm run build`
    *   Set publish directory to: `dist`
    *   Add an environment variable `VITE_API_URL` pointing to your deployed backend URL (e.g., `https://your-backend.onrender.com`).
