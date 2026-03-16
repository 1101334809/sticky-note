"""SSO 单层鉴权依赖注入模块.

通过 SSO 网关注入的 Header 或调用 SSO 接口获取用户信息。
移除本地 JWT 验证，完全依赖 SSO 网关鉴权。

使用方法:
    from app.api.deps_sso import CurrentUser, CurrentUserId
    
    @router.get("/me")
    async def get_me(user: CurrentUser):
        return user
"""

from datetime import datetime, timezone
from typing import Annotated, Optional
from urllib.parse import unquote

import httpx
from fastapi import Depends, Header, HTTPException, Request, status
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User, UserRole


class SSOUserInfo(BaseModel):
    """SSO 用户信息（从 Header 或 SSO 接口获取）."""
    
    employee_number: str
    display_name: str
    email: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None


async def get_sso_user_from_header(
    x_sso_employee_number: Annotated[str | None, Header(alias="X-SSO-Employee-Number")] = None,
    x_sso_display_name: Annotated[str | None, Header(alias="X-SSO-Display-Name")] = None,
    x_sso_email: Annotated[str | None, Header(alias="X-SSO-Email")] = None,
    x_sso_mobile: Annotated[str | None, Header(alias="X-SSO-Mobile")] = None,
    x_sso_department: Annotated[str | None, Header(alias="X-SSO-Department")] = None,
    x_sso_job_title: Annotated[str | None, Header(alias="X-SSO-Job-Title")] = None,
) -> SSOUserInfo | None:
    """尝试从请求 Header 获取 SSO 用户信息.
    
    SSO 网关验证 satoken 后会注入这些 Header。
    如果 Header 不存在，返回 None（后续会尝试调用 SSO 接口）。
    """
    if not x_sso_employee_number:
        return None
    
    # URL 解码中文字符
    display_name = unquote(x_sso_display_name) if x_sso_display_name else "未知用户"
    department = unquote(x_sso_department) if x_sso_department else None
    job_title = unquote(x_sso_job_title) if x_sso_job_title else None
    
    return SSOUserInfo(
        employee_number=x_sso_employee_number,
        display_name=display_name,
        email=x_sso_email,
        mobile=x_sso_mobile,
        department=department,
        job_title=job_title,
    )


async def get_sso_user_from_api(request: Request) -> SSOUserInfo | None:
    """通过调用 SSO 网关接口获取用户信息.
    
    当 Header 中没有用户信息时，作为降级方案调用 SSO 接口验证。
    
    Token 获取优先级：
    1. 请求中的 SSO Cookie
    2. .env 配置的 SSO_DEV_TOKEN（本地开发用）
    """
    settings = get_settings()
    
    # 获取 SSO Token：优先从请求 Cookie，其次从配置（本地开发）
    sso_token = request.cookies.get(settings.SSO_COOKIE_NAME)
    if not sso_token and settings.SSO_DEV_TOKEN:
        sso_token = settings.SSO_DEV_TOKEN
        logger.debug("[SSO] 使用配置的 SSO_DEV_TOKEN")
    
    if not sso_token:
        return None
    
    sso_gateway_url = settings.SSO_GATEWAY_URL
    logger.info(f"[SSO] 调用 SSO 网关: {sso_gateway_url}/token/userinfo")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{sso_gateway_url}/token/userinfo",
                cookies={settings.SSO_COOKIE_NAME: sso_token},
            )
            
            logger.info(f"[SSO] 网关响应: status={resp.status_code}")
            
            if resp.status_code != 200:
                logger.warning(f"[SSO] 验证失败, status={resp.status_code}")
                return None
            
            data = resp.json()
            
            # 处理可能的嵌套结构：{code: 200, data: {...}} 或直接 {...}
            user_data = data
            if isinstance(data, dict):
                if "data" in data and isinstance(data["data"], dict):
                    user_data = data["data"]
                if "code" in data and data.get("code") != 200 and data.get("code") != 0:
                    logger.warning(f"[SSO] 返回错误码: code={data.get('code')}")
                    return None
            
            # 解析用户信息（支持多种字段名）
            employee_number = (
                user_data.get("employeeNumber") 
                or user_data.get("employee_number")
                or user_data.get("jobNumber")
                or user_data.get("job_number")
                or ""
            )
            if not employee_number:
                logger.warning(f"[SSO] 返回数据中没有工号字段")
                return None
            
            return SSOUserInfo(
                employee_number=employee_number,
                display_name=user_data.get("displayName") or user_data.get("nickName") or user_data.get("name") or "未知用户",
                email=user_data.get("email"),
                mobile=user_data.get("mobile") or user_data.get("workPhoneNumber") or user_data.get("phone"),
                department=user_data.get("department") or user_data.get("deptName"),
                job_title=user_data.get("jobTitle") or user_data.get("job_title") or user_data.get("position"),
            )
            
    except httpx.TimeoutException:
        logger.error("[SSO] 调用 SSO 网关超时")
        return None
    except Exception as e:
        logger.error(f"[SSO] 调用 SSO 网关异常: {e}")
        return None


async def get_sso_user_info(
    request: Request,
    header_info: Annotated[SSOUserInfo | None, Depends(get_sso_user_from_header)],
) -> SSOUserInfo:
    """获取 SSO 用户信息（优先从 Header，降级调用 API）.
    
    Raises:
        HTTPException: 未通过 SSO 认证
    """
    settings = get_settings()
    
    # Mock 用户模式（本地开发用）
    if settings.MOCK_USER_ENABLED and not settings.is_production:
        logger.info("[SSO] Mock 用户模式已启用")
        return SSOUserInfo(
            employee_number=settings.MOCK_USER_USERNAME,
            display_name=settings.MOCK_USER_NAME,
        )
    
    # 优先使用 Header
    if header_info:
        logger.debug(f"[SSO] 从 Header 获取用户信息: {header_info.employee_number}")
        return header_info
    
    # 降级调用 SSO 接口
    api_info = await get_sso_user_from_api(request)
    if api_info and api_info.employee_number:
        logger.debug(f"[SSO] 从 API 获取用户信息: {api_info.employee_number}")
        return api_info
    
    # 未认证
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="未通过 SSO 认证，请重新登录",
    )


async def _get_or_create_user(
    db: AsyncSession,
    sso_info: SSOUserInfo,
) -> User:
    """根据 SSO 信息获取或创建本地用户."""
    # 根据工号查找本地用户
    result = await db.execute(
        select(User).where(User.job_number == sso_info.employee_number)
    )
    user = result.scalar_one_or_none()
    
    current_time = datetime.now(timezone.utc)
    
    if user:
        # 用户存在，更新最后登录时间
        user.last_login_at = current_time
        user.display_name = sso_info.display_name
        if sso_info.email:
            user.email = sso_info.email
        if sso_info.mobile:
            user.mobile = sso_info.mobile
        await db.commit()
    else:
        # 用户不存在，自动创建
        user = User(
            username=f"sso_{sso_info.employee_number}",
            display_name=sso_info.display_name,
            job_number=sso_info.employee_number,
            email=sso_info.email,
            mobile=sso_info.mobile,
            role=UserRole.EMPLOYEE,  # 默认普通员工
            is_active=True,
            last_login_at=current_time,
            created_at=current_time,
            updated_at=current_time,
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"[SSO] 自动创建用户: {user.id} - {user.display_name}")
    
    return user


async def get_current_user(
    sso_info: Annotated[SSOUserInfo, Depends(get_sso_user_info)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """获取当前用户（从数据库匹配或自动创建）.
    
    这是单层 SSO 鉴权的核心依赖，替代原有的 JWT 鉴权。
    
    Raises:
        HTTPException: 用户被禁用
    """
    user = await _get_or_create_user(db, sso_info)
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用，请联系管理员",
        )
    
    return user


async def get_current_user_id(
    user: Annotated[User, Depends(get_current_user)],
) -> int:
    """获取当前用户 ID."""
    return user.id


# 类型别名，方便使用
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentUserId = Annotated[int, Depends(get_current_user_id)]
SSOInfo = Annotated[SSOUserInfo, Depends(get_sso_user_info)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
