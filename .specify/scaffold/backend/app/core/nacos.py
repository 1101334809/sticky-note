"""Nacos 配置中心客户端.

支持从 Nacos 加载配置，用于 K8S 环境。
本地开发时如果 Nacos 不可用，会自动降级到 .env 配置。
"""

import os
from typing import Optional

import yaml
from loguru import logger


# Nacos 环境变量
NACOS_HOST = os.getenv("NACOS_HOST", "")
NACOS_PORT = int(os.getenv("NACOS_PORT", "8848"))
NACOS_USER = os.getenv("NACOS_USER", "nacos")
NACOS_PASSWORD = os.getenv("NACOS_PASSWORD", "nacos")
NACOS_NAMESPACE = os.getenv("NACOS_NAMESPACE", "")
NACOS_DATA_ID = os.getenv("NACOS_DATA_ID", "")
NACOS_GROUP = os.getenv("NACOS_GROUP", "DEFAULT_GROUP")

# 全局 Nacos 客户端
_nacos_client = None


def _init_nacos_client():
    """初始化 Nacos 客户端."""
    global _nacos_client
    
    if not NACOS_HOST or not NACOS_DATA_ID:
        logger.info("Nacos 未配置，跳过初始化")
        return None
    
    try:
        import nacos
        
        _nacos_client = nacos.NacosClient(
            server_addresses=f"{NACOS_HOST}:{NACOS_PORT}",
            namespace=NACOS_NAMESPACE,
            username=NACOS_USER,
            password=NACOS_PASSWORD,
        )
        
        logger.info(f"Nacos 客户端初始化成功: {NACOS_HOST}:{NACOS_PORT}/{NACOS_NAMESPACE}")
        return _nacos_client
        
    except Exception as e:
        logger.warning(f"Nacos 客户端初始化失败: {e}")
        return None


def load_nacos_config() -> dict:
    """同步加载 Nacos 配置."""
    if not NACOS_HOST or not NACOS_DATA_ID:
        return {}
    
    client = _init_nacos_client()
    if not client:
        return {}
    
    try:
        config_content = client.get_config(
            data_id=NACOS_DATA_ID,
            group=NACOS_GROUP,
        )
        
        if config_content:
            config = yaml.safe_load(config_content)
            logger.info(f"Nacos 配置加载成功: {NACOS_DATA_ID}")
            return config or {}
        
        return {}
        
    except Exception as e:
        logger.warning(f"Nacos 配置加载失败: {e}")
        return {}


async def load_nacos_config_async() -> dict:
    """异步加载 Nacos 配置（实际是同步调用的封装）."""
    return load_nacos_config()


async def shutdown_nacos():
    """关闭 Nacos 客户端."""
    global _nacos_client
    
    if _nacos_client:
        try:
            # nacos-sdk-python 没有显式的关闭方法
            _nacos_client = None
            logger.info("Nacos 客户端已关闭")
        except Exception as e:
            logger.warning(f"关闭 Nacos 客户端失败: {e}")
