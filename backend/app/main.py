from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings as app_settings
from app.core.bootstrap import ensure_superuser
from app.models.database import engine, Base, SessionLocal, ensure_database_compatibility
from app.api import auth, tests, drills, dashboard, teacher
from app.api import settings as settings_api
from app.seed_data import seed_database
from app.api.settings import init_default_settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    Base.metadata.create_all(bind=engine)
    ensure_database_compatibility()
    # Seed default data & system settings
    db = SessionLocal()
    try:
        seed_database(db)
        init_default_settings(db)
        ensure_superuser(
            db,
            app_settings.SUPERUSER_EMAIL,
            app_settings.SUPERUSER_PASSWORD,
            app_settings.SUPERUSER_NAME,
            app_settings.ENVIRONMENT,
        )
    finally:
        db.close()
    yield

app = FastAPI(
    title=app_settings.PROJECT_NAME,
    version=app_settings.PROJECT_VERSION,
    description="Backend REST API for GetSATGo - Adaptive SAT Prep Platform for Teachers & Students",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in app_settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Include routers
app.include_router(auth.router, prefix=app_settings.API_V1_STR)
app.include_router(tests.router, prefix=app_settings.API_V1_STR)
app.include_router(drills.router, prefix=app_settings.API_V1_STR)
app.include_router(dashboard.router, prefix=app_settings.API_V1_STR)
app.include_router(teacher.router, prefix=app_settings.API_V1_STR)
app.include_router(settings_api.router, prefix=app_settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# Optional: Serve production frontend bundle if built
dist_dirs = [
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist"),
    os.path.abspath("frontend/dist"),
    "/app/frontend/dist"
]
static_dist = next((d for d in dist_dirs if os.path.exists(d)), None)

if static_dist and os.path.exists(os.path.join(static_dist, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path in ["docs", "openapi.json", "redoc"]:
            return {"error": "Endpoint not found"}
        file_path = os.path.join(static_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "app": app_settings.PROJECT_NAME,
            "status": "online",
            "docs_url": "/docs",
            "api_v1": app_settings.API_V1_STR
        }

