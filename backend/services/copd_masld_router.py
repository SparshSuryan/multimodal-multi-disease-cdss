from fastapi import APIRouter

from .copd_service import (
    router as copd_router
)

from .masld_service import (
    router as masld_router
)


# Combined router for COPD and NAFLD/MASLD
router = APIRouter(
    tags=["COPD and NAFLD/MASLD"]
)

# Register disease-specific routers
router.include_router(copd_router)
router.include_router(masld_router)
