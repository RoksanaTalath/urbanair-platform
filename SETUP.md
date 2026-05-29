# UrbanAir — Setup Guide (Windows / Mac / Linux)

## NO DOCKER REQUIRED — Run locally in minutes

---

## Step 1: Install Prerequisites

### Python 3.11+
- Windows: https://www.python.org/downloads/
  - ✅ Check "Add Python to PATH" during install
- Verify: Open CMD → `python --version`

### Node.js 18+  
- Windows: https://nodejs.org/en/download (LTS version)
- Verify: Open CMD → `node --version`

---

## Step 2: Start the Backend

```bash
# Navigate to backend folder
cd urbanair/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn app.main:app --reload --port 8000
```

✅ Backend running at: http://localhost:8000  
✅ API docs at: http://localhost:8000/api/docs

> **Note about MongoDB:**  
> The app works WITHOUT MongoDB. If MongoDB isn't installed,  
> all AQI data uses intelligent simulation. No data is persisted.  
> To install MongoDB locally: https://www.mongodb.com/try/download/community

---

## Step 3: Start the Frontend

Open a NEW terminal window:

```bash
# Navigate to frontend folder
cd urbanair/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

✅ Frontend running at: http://localhost:5173

---

## Step 4: Open UrbanAir

Open your browser and go to: **http://localhost:5173**

You should see the UrbanAir dashboard with:
- Hyderabad loaded by default
- Interactive map with pollution zones
- AI health recommendations
- Forecast charts

---

## MongoDB Setup (Optional — for data persistence)

### Option A: MongoDB Atlas (Cloud — FREE tier)
1. Go to https://www.mongodb.com/atlas/database
2. Sign up free → Create free cluster (M0)
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Edit `backend/.env`:
   ```
   MONGODB_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
   ```
6. Restart backend

### Option B: Local MongoDB
1. Download: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB starts automatically on port 27017
4. Your `backend/.env` already has: `MONGODB_URL=mongodb://localhost:27017`

---

## Get a Real WAQI API Token (Optional)

The `demo` token works but has rate limits.
For production use:
1. Go to https://aqicn.org/data-platform/token/
2. Enter your email → Get free token
3. Edit `backend/.env`: `WAQI_API_TOKEN=your-token-here`
4. Edit `frontend/.env`: `VITE_WAQI_TOKEN=your-token-here`

---

## Troubleshooting

### "Module not found" errors in backend
```bash
pip install -r requirements.txt --upgrade
```

### "npm install" fails
```bash
# Delete node_modules and try again
rm -rf node_modules
npm install
```

### Map doesn't load
- Check browser console for errors
- Make sure Leaflet CSS is loading (internet required for tiles)

### "CORS error" in browser console  
- Make sure backend is running on port 8000
- Check `backend/.env` has `ALLOWED_ORIGINS=http://localhost:5173`

### Backend crashes on startup
- MongoDB connection failure is OK — app still runs with simulation
- Check Python version is 3.9+
- Make sure virtual environment is activated

---

## Project Structure
```
urbanair/
├── backend/          ← FastAPI Python server
│   ├── app/
│   │   ├── main.py          ← Start here
│   │   ├── api/             ← API endpoints
│   │   ├── services/        ← Business logic
│   │   ├── models/          ← Data models
│   │   ├── config/          ← Settings & DB
│   │   └── middleware/      ← Rate limit, logging
│   ├── requirements.txt
│   └── .env
│
└── frontend/         ← React + Vite SPA
    ├── src/
    │   ├── pages/           ← Dashboard page
    │   ├── components/      ← UI components
    │   ├── store/           ← Zustand state
    │   └── services/        ← API calls
    ├── package.json
    └── .env
```
