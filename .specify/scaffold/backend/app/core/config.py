"""应用配置管理模块.

支持 Nacos 配置中心 + .env 本地配置双模式。
K8S 环境优先从 Nacos 加载，本地开发使用 .env 兜底。
"""

from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    # 应用配置
    APP_NAME: str = "skyline-app"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # 数据库配置
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 3306
    DATABASE_NAME: str = "app_db"
    DATABASE_USER: str = "root"
    DATABASE_PASSWORD: str = ""
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    # Redis配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    
    # SSO 配置 [必须]
    SSO_GATEWAY_URL: str = "http://skyline-ai-sso-gateway.skyline-ai.svc.cluster.local:8080"
    SSO_COOKIE_NAME: str = "satoken"
    SSO_DEV_TOKEN: str = ""  # 本地开发用的 SSO Token
    
    # Mock 用户配置（仅开发环境生效）
    MOCK_USER_ENABLED: bool = False
    MOCK_USER_ID: int = 1
    MOCK_USER_NAME: str = "测试用户"
    MOCK_USER_USERNAME: str = "test_user"
    MOCK_USER_ROLE: str = "employee"
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    
    # CORS配置
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """解析CORS配置."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v
    
    @property
    def database_url(self) -> str:
        """构建异步数据库连接URL."""
        from urllib.parse import quote_plus
        encoded_password = quote_plus(self.DATABASE_PASSWORD)
        return (
            f"mysql+asyncmy://{self.DATABASE_USER}:{encoded_password}"
            f"@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )
    
    @property
    def database_url_sync(self) -> str:
        """构建同步数据库连接URL (用于Alembic迁移)."""
        from urllib.parse import quote_plus
        encoded_password = quote_plus(self.DATABASE_PASSWORD)
        return (
            f"mysql+pymysql://{self.DATABASE_USER}:{encoded_password}"
            f"@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )
    
    @property
    def redis_url(self) -> str:
        """构建Redis连接URL."""
        password_part = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{password_part}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    @property
    def is_production(self) -> bool:
        """是否为生产环境."""
        return self.APP_ENV.lower() == "production"


_settings_instance: Settings | None = None


def get_settings() -> Settings:
    """获取配置单例.
    
    配置加载优先级:
    1. Nacos 配置中心 (K8S 环境)
    2. .env 文件 (本地开发兜底)
    """
    global _settings_instance
    
    if _settings_instance is not None:
        return _settings_instance
    
    # 尝试从 Nacos 加载配置
    nacos_config = _load_nacos_config()
    
    if nacos_config:
        _settings_instance = Settings(**nacos_config)
    else:
        _settings_instance = Settings()
    
    return _settings_instance


def _load_nacos_config() -> dict:
    """从 Nacos 加载配置."""
    try:
        from app.core.nacos import load_nacos_config
        return load_nacos_config()
    except Exception as e:
        import logging
        logging.warning(f"Nacos 配置加载失败，使用 .env 兜底: {e}")
        return {}


def reload_settings() -> Settings:
    """重新加载配置."""
    global _settings_instance
    _settings_instance = None
    return get_settings()


async def reload_settings_async() -> Settings:
    """异步重新加载配置（应用启动时调用）."""
    global _settings_instance
    
    try:
        from app.core.nacos import load_nacos_config_async
        nacos_config = await load_nacos_config_async()
        
        from loguru import logger
        
        if nacos_config:
            _settings_instance = Settings(**nacos_config)
            logger.info(f"Nacos 配置已加载，共 {len(nacos_config)} 项")
        else:
            logger.info("Nacos 配置为空，保持 .env 配置")
    except Exception as e:
        import logging
        logging.warning(f"异步加载 Nacos 配置失败: {e}")
    
    return get_settings()


# 导出配置单例
settings = get_settings()
