from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.api.routes import router
from app.models.database import init_db
from app.services.scheduler import start_scheduler, stop_scheduler

app = FastAPI(title="Stock Intelligence Dashboard", version="1.0.0")

# Initialize database and scheduler on startup
@app.on_event("startup")
def startup_event():
    try:
        init_db()
    except Exception as e:
        print(f"Database init error: {e}")
    
    try:
        start_scheduler()
    except Exception as e:
        print(f"Scheduler start error: {e}")

# Stop scheduler gracefully on shutdown
@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Stock Dashboard API is running"}

# Serve frontend static files
frontend_path = Path(__file__).parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="static")