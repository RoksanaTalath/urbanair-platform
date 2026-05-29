"""
UrbanAir — Quick Start Script
Run this to start the backend: python run.py

This script:
1. Checks Python version
2. Installs dependencies if needed
3. Creates .env from .env.example if missing
4. Starts the FastAPI server
"""
import sys
import os
import subprocess

def check_python_version():
    if sys.version_info < (3, 9):
        print("❌ Python 3.9+ required. You have:", sys.version)
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}")

def install_dependencies():
    print("📦 Installing dependencies...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "-q"],
        capture_output=False
    )
    if result.returncode != 0:
        print("❌ Failed to install dependencies")
        sys.exit(1)
    print("✅ Dependencies installed")

def setup_env():
    if not os.path.exists(".env"):
        if os.path.exists(".env.example"):
            import shutil
            shutil.copy(".env.example", ".env")
            print("✅ Created .env from .env.example")
            print("   You can edit .env to add your MongoDB URL and WAQI token")
        else:
            # Create minimal .env
            with open(".env", "w") as f:
                f.write("MONGODB_URL=mongodb://localhost:27017\n")
                f.write("MONGODB_DB_NAME=urbanair\n")
                f.write("WAQI_API_TOKEN=demo\n")
                f.write("SECRET_KEY=urbanair-dev-secret-key\n")
                f.write("JWT_SECRET=urbanair-jwt-secret\n")
            print("✅ Created minimal .env")
    else:
        print("✅ .env file exists")

def start_server():
    print("\n🚀 Starting UrbanAir API server...")
    print("   URL:  http://localhost:8000")
    print("   Docs: http://localhost:8000/api/docs")
    print("   Press Ctrl+C to stop\n")
    os.system(f"{sys.executable} -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0")

if __name__ == "__main__":
    print("=" * 50)
    print("  UrbanAir Backend — Quick Start")
    print("=" * 50)
    check_python_version()
    install_dependencies()
    setup_env()
    start_server()
