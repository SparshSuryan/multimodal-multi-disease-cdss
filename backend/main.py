import inspect
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.services.tb_router import router as tb_router
from backend.services.dr_router import router as dr_router
from backend.services.copd_masld_router import router as copd_masld_router
from backend.services import cvd_service, ckd_service

app = FastAPI(
    title="Multimodal AI-Based Multi-Disease Clinical Decision Support System",
    description=(
        "Unified CDSS FastAPI Backend covering Cardiovascular Disease (CVD), "
        "Chronic Kidney Disease (CKD), Tuberculosis (TB), Diabetic Retinopathy (DR), "
        "COPD, and MASLD."
    ),
    version="1.0.0",
)

# Allow React / Vite frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Mount Existing Modular Routers (TB, DR, COPD & MASLD)
app.include_router(tb_router)
app.include_router(dr_router)
app.include_router(copd_masld_router)

# Cache instantiated service objects if CVD/CKD modules expose classes
_SERVICE_CACHE: Dict[str, Any] = {}


def _invoke_tabular_service(service_module: Any, module_key: str, payload: Dict[str, Any]) -> Any:
    """Invokes standalone function or Service class inside cvd_service.py / ckd_service.py."""
    # Check module-level functions first
    for fn_name in (f"predict_{module_key}", "predict", "run_inference", "infer"):
        fn = getattr(service_module, fn_name, None)
        if callable(fn):
            return fn(payload)

    # Check Service classes (e.g., CVDService, CKDService, CVDInferenceService)
    if module_key not in _SERVICE_CACHE:
        for attr_name, obj in inspect.getmembers(service_module, inspect.isclass):
            if obj.__module__ == service_module.__name__ and (
                "service" in attr_name.lower() or "predictor" in attr_name.lower()
            ):
                _SERVICE_CACHE[module_key] = obj()
                break

    instance = _SERVICE_CACHE.get(module_key)
    if instance is not None:
        for method_name in (f"predict_{module_key}", "predict", "run_inference", "infer"):
            method = getattr(instance, method_name, None)
            if callable(method):
                return method(payload)

    raise AttributeError(
        f"No callable prediction entrypoint found in '{service_module.__name__}'. "
        "Expected a predict()/predict_<disease>() function or *Service class."
    )


# 2. Unified Endpoints for Member 2 Tabular Modules (CVD & CKD)
@app.post("/api/v1/cvd/predict", tags=["Cardiovascular Disease"])
async def predict_cvd(payload: Dict[str, Any]):
    try:
        return _invoke_tabular_service(cvd_service, "cvd", payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"CVD inference error: {str(exc)}")


@app.post("/api/v1/ckd/predict", tags=["Chronic Kidney Disease"])
async def predict_ckd(payload: Dict[str, Any]):
    try:
        return _invoke_tabular_service(ckd_service, "ckd", payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"CKD inference error: {str(exc)}")


# 3. System Health & Active Module Registry
@app.get("/", tags=["System"])
async def root_health():
    return {
        "status": "online",
        "system": "Multimodal Multi-Disease CDSS",
        "active_modules": [
            {"id": "cvd", "name": "Cardiovascular Disease", "endpoint": "/api/v1/cvd/predict"},
            {"id": "ckd", "name": "Chronic Kidney Disease", "endpoint": "/api/v1/ckd/predict"},
            {"id": "tb", "name": "Tuberculosis", "router": "tb_router"},
            {"id": "dr", "name": "Diabetic Retinopathy", "endpoint": "/api/v1/dr/predict"},
            {"id": "copd", "name": "COPD", "router": "copd_masld_router"},
            {"id": "masld", "name": "MASLD / NAFLD", "router": "copd_masld_router"},
        ],
    }