from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.database import engine
from app.api.routes.partai import router as partai_router
from app.api.routes.wilayah import router as wilayah_router


app = FastAPI(
    title="WebGIS Jawa Tengah API",
    description="Backend API untuk sistem WebGIS Jawa Tengah",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(partai_router)
app.include_router(wilayah_router)

@app.get("/")
def root():
    return {
        "message": "WebGIS Jawa Tengah API berjalan",
        "status": "success",
    }


@app.get("/test-db")
def test_db():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

        return {
            "database": "connected",
            "result": result.scalar(),
        }