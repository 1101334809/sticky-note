"""FastAPI 应用入口.

包含:
- 应用生命周期管理
- CORS 配置
- 路由注册
- 静态文件挂载（前后端一体化部署）
- 全局异常处理
"""

from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app import __version__
from app.api.v1.router import api_router, ping_router
from app.api.root_router import router as root_router
from app.core.config import settings
from app.core.exceptions import AppException


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理."""
    # 启动时
    logger.info(f"启动 {settings.APP_NAME} v{__version__}")
    logger.info(f"环境: {settings.APP_ENV}")
    logger.info(f"调试模式: {settings.DEBUG}")
    
    # 异步加载 Nacos 配置
    from app.core.config import reload_settings_async
    await reload_settings_async()
    
    # 初始化数据库
    from app.db.session import reinit_engine
    await reinit_engine()
    
    yield
    
    # 关闭时
    logger.info("正在关闭应用...")
    
    from app.core.nacos import shutdown_nacos
    await shutdown_nacos()


def create_app() -> FastAPI:
    """创建 FastAPI 应用实例."""
    app = FastAPI(
        title=settings.APP_NAME,
        description="API 服务",
        version=__version__,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )
    
    # 配置 CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 注册路由
    app.include_router(ping_router)   # K8s 健康检查路由（根路径）
    app.include_router(root_router)   # 根路径路由（如 /token/logout）
    app.include_router(api_router)    # API 业务路由（/api/v1 前缀）
    
    # 注册全局异常处理器
    register_exception_handlers(app)
    
    # 挂载前端静态文件（Docker 部署时前端构建产物在 /app/static）
    from pathlib import Path
    static_dir = Path("/app/static")
    if static_dir.exists():
        from fastapi.staticfiles import StaticFiles
        from fastapi.responses import FileResponse
        
        # 挂载静态资源（JS、CSS、图片等）
        app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")
        
        # SPA 回退：非 API 路由返回 index.html
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            """提供 SPA 前端页面，支持客户端路由."""
            if full_path.startswith("api/"):
                from fastapi import HTTPException
                raise HTTPException(status_code=404, detail="API endpoint not found")
            
            file_path = static_dir / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(static_dir / "index.html")
        
        logger.info(f"前端静态文件已挂载: {static_dir}")
    
    return app


def register_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器."""
    
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        """应用异常处理器."""
        logger.warning(f"应用异常: {exc.message}", code=exc.code, path=request.url.path)
        
        if exc.code >= 5000:
            http_status = 500
        elif 1001 <= exc.code <= 1002:
            http_status = 401
        elif 1003 <= exc.code <= 1999:
            http_status = 403
        else:
            http_status = 400
        
        return JSONResponse(
            status_code=http_status,
            content={"code": exc.code, "message": exc.message, "data": exc.data},
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """请求验证错误处理器."""
        logger.warning(f"请求验证错误: path={request.url.path}")
        return JSONResponse(
            status_code=422,
            content={"code": 2001, "message": "请求参数验证失败", "data": exc.errors()},
        )
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """全局异常处理器."""
        logger.exception(f"未处理异常: {str(exc)}", path=request.url.path)
        message = str(exc) if settings.DEBUG else "服务器内部错误"
        return JSONResponse(
            status_code=500,
            content={"code": 5000, "message": message, "data": None},
        )


# 创建应用实例
app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
