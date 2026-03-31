from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.api.routes import router

app = FastAPI(title="Stock Intelligence Dashboard", version="1.0.0")

# Enable CORS BEFORE routes (must be first middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routes FIRST
app.include_router(router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Stock Dashboard API is running"}

# Serve frontend static files (after API routes so they don't interfere)
frontend_path = Path(__file__).parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="static")