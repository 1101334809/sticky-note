"""SSO 登出路由模块.

处理前端登出跳转，重定向到 SSO 网关登出地址。
防止 SPA 应用重新加载并导致 CORS 错误。
"""

from urllib.parse import quote

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from loguru import logger

from app.core.config import get_settings

router = APIRouter()


@router.get("/token/logout", summary="SSO登出重定向")
async def sso_logout_redirect(request: Request):
    """处理前端登出跳转.
    
    前端跳转到 /token/logout，后端负责重定向到 SSO 网关的登出地址。
    """
    settings = get_settings()
    origin = str(request.base_url).rstrip("/")
    
    # Mock 模式：直接跳转回首页
    if settings.MOCK_USER_ENABLED:
        logger.info("[Auth] Mock 模式登出，重定向到首页")
        response = RedirectResponse(url=f"{origin}/")
        response.delete_cookie(settings.SSO_COOKIE_NAME)
        return response

    # 构建 SSO 登出 URL
    sso_gateway_url = settings.SSO_GATEWAY_URL.rstrip("/")
    encoded_origin = quote(origin, safe="")
    logout_url = f"{sso_gateway_url}/token/logout?redirect_uri={encoded_origin}"
    
    logger.info(f"[Auth] SSO 登出重定向: {logout_url}")
    
    response = RedirectResponse(url=logout_url)
    response.delete_cookie(settings.SSO_COOKIE_NAME)
    
    return response
