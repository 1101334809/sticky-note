#!/bin/bash
# ============================================
# 容器启动脚本
# 
# 功能：
# 1. 执行数据库迁移（可选）
# 2. 启动 FastAPI 应用
# ============================================

set -e

echo "========================================"
echo "Running database migrations..."
echo "========================================"

cd /app

# 尝试执行迁移，失败时发出警告但不阻止启动
# 取消注释以启用自动迁移
# if .venv/bin/alembic upgrade head; then
#     echo "Database migrations completed successfully."
# else
#     echo "WARNING: Database migrations failed!"
#     echo "You may need to run migrations manually."
#     echo "Continuing with application startup..."
# fi

echo "========================================"
echo "Starting application..."
echo "========================================"

exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
