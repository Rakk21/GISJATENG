from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.database import engine
from app.api.routes.partai import router as partai_router
from app.api.routes.wilayah import router as wilayah_router
from app.api.routes.penduduk import router as penduduk_router
from app.api.routes.jumlah_pemilih import router as pemilih_router
from app.api.routes.suara_partai import router as suara_router
from app.api.routes.anggota_partai import router as anggota_router
from app.api.routes.auth import router as auth_router
from app.api.routes.dapil import router as dapil_router
from app.api.routes.users_admin import router as users_router
from app.api.routes.analisis import router as analisis_router
from app.api.routes.export_data import router as export_router
from app.api.routes.wilayah_rincian import router as wilayah_rincian_router
from app.api.routes.geo_kecamatan import router as geo_kecamatan_router


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


app.include_router(auth_router)
app.include_router(dapil_router)
app.include_router(users_router)
app.include_router(analisis_router)
app.include_router(export_router)
app.include_router(partai_router)
app.include_router(wilayah_router)
app.include_router(penduduk_router)
app.include_router(pemilih_router)
app.include_router(suara_router)
app.include_router(anggota_router)
app.include_router(wilayah_rincian_router)
app.include_router(geo_kecamatan_router)

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