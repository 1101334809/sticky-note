"""API V1 路由注册模块."""

from fastapi import APIRouter

# 创建主路由
api_router = APIRouter(prefix="/api/v1")

# 健康检查路由
health_router = APIRouter(tags=["健康检查"])


@health_router.get("/health", summary="健康检查")
async def health_check() -> dict[str, str]:
    """服务健康检查接口."""
    return {"status": "healthy", "service": "api"}


@health_router.get("/version", summary="版本信息")
async def version() -> dict[str, str]:
    """获取服务版本信息."""
    from app import __version__
    return {"version": __version__, "api": "v1"}


# 注册健康检查路由（在 /api/v1 前缀下）
api_router.include_router(health_router)


# K8s 健康检查路由（无前缀，直接在根路径）
ping_router = APIRouter(tags=["健康检查"])


@ping_router.get("/ping", summary="K8s健康检查")
async def ping() -> dict[str, str]:
    """K8s 健康检查接口."""
    return {"status": "ok"}


# TODO: 注册业务模块路由
# from app.api.v1.endpoints import auth, user
# api_router.include_router(auth.router)
# api_router.include_router(user.router)
