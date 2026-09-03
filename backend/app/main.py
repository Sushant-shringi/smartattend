from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from app.config import settings
from app.database.session import Base, engine, SessionLocal
from app.database.seed import seed_database
from app.api import api_router
import app.models # Ensure all models are loaded before Base.metadata.create_all

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    # Seed database if not seeded
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    print("Shutting down SmartAttend application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Offline-First Smart University Attendance System with BLE Proximity Verification",
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev/testing ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Do not swallow HTTPExceptions
    if hasattr(exc, "status_code"):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail if hasattr(exc, "detail") else str(exc)}
        )
    print(f"[UNHANDLED EXCEPTION]: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Something went wrong on the server. Please try again."}
    )

# --- Swagger UI Aliases & Redirects ---

@app.get(f"{settings.API_V1_STR}/docs", include_in_schema=False)
async def api_v1_docs():
    return RedirectResponse(url="/docs")

@app.get(f"{settings.API_V1_STR}/openapi.json", include_in_schema=False)
async def api_v1_openapi():
    return RedirectResponse(url="/openapi.json")

@app.get("/swagger", include_in_schema=False)
async def swagger_alias():
    return RedirectResponse(url="/docs")

@app.get("/api/docs", include_in_schema=False)
async def api_docs_alias():
    return RedirectResponse(url="/docs")

@app.get("/")
def root(request: Request):
    # If user navigates from a browser, automatically redirect to Swagger UI
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        return RedirectResponse(url="/docs")
    return {
        "app": "SmartAttend",
        "version": "1.0.0",
        "description": "Offline-First Smart Attendance System with BLE Proximity Verification",
        "status": "online",
        "docs_url": "/docs",
        "api_v1_docs": f"{settings.API_V1_STR}/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "service": "smartattend-api"}

@app.get(f"{settings.API_V1_STR}/health")
def api_v1_health():
    db_status = "connected"
    try:
        from sqlalchemy import text
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
    except Exception as e:
        db_status = f"error: {str(e)[:50]}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "service": "smartattend-api",
        "version": "1.0.0"
    }

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

