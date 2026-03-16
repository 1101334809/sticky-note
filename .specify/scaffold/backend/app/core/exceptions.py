"""应用自定义异常."""

from typing import Any, Optional


class AppException(Exception):
    """应用异常基类."""
    
    def __init__(
        self,
        code: int,
        message: str,
        data: Optional[Any] = None,
    ):
        self.code = code
        self.message = message
        self.data = data
        super().__init__(message)


class AuthenticationError(AppException):
    """认证错误."""
    
    def __init__(self, message: str = "认证失败"):
        super().__init__(code=1001, message=message)


class TokenExpiredError(AppException):
    """Token 过期错误."""
    
    def __init__(self, message: str = "Token 已过期"):
        super().__init__(code=1002, message=message)


class PermissionDeniedError(AppException):
    """权限不足错误."""
    
    def __init__(self, message: str = "权限不足"):
        super().__init__(code=1003, message=message)


class ValidationError(AppException):
    """参数验证错误."""
    
    def __init__(self, message: str = "参数验证失败", data: Any = None):
        super().__init__(code=2001, message=message, data=data)


class BusinessError(AppException):
    """业务逻辑错误."""
    
    def __init__(self, message: str, code: int = 3001, data: Any = None):
        super().__init__(code=code, message=message, data=data)


class NotFoundError(AppException):
    """资源不存在错误."""
    
    def __init__(self, message: str = "资源不存在"):
        super().__init__(code=3002, message=message)


class SystemError(AppException):
    """系统内部错误."""
    
    def __init__(self, message: str = "系统内部错误"):
        super().__init__(code=5001, message=message)
