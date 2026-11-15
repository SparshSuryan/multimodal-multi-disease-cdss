
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.services.copd_masld_router import router as copd_masld_router

app = FastAPI(
    title="Multimodal Multi-Disease CDSS API",
    description="COPD and NAFLD/MASLD prediction services",
    version="1.0.0",
)

# Allow the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register COPD and MASLD routes
app.include_router(copd_masld_router)


@app.get("/")
def root():
    return {
        "message": "CDSS API is running",
        "available_modules": ["COPD", "NAFLD/MASLD"],
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "modules": {
            "copd": "registered",
            "masld": "registered",
        },
    }
