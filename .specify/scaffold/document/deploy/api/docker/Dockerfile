# ============================================
# Skyline AI 项目通用 Dockerfile
# 多阶段构建：前端 + 后端
# ============================================
#
# 使用说明：
# 1. 直接复制到项目根目录的 document/deploy/api/docker/
# 2. 无需修改，通用适配所有 Skyline AI 项目
#
# 构建命令：
#   docker build -f document/deploy/api/docker/Dockerfile -t {镜像名} .
#
# ============================================

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM harbor.skyline.com/kubesphereio/nodejs:20.17.0-alpine AS frontend-builder

WORKDIR /frontend

# 复制前端依赖文件
COPY frontend/package.json frontend/package-lock.json* ./

# 安装依赖
RUN npm install --registry=https://registry.npmmirror.com

# 复制前端源码
COPY frontend/ ./

# 构建前端
RUN npm run build

# ============================================
# Stage 2: Build Backend
# ============================================
FROM harbor.skyline.com/kubesphereio/kubesphere/builder-python:3.13-slim

# 安装系统依赖和编译工具
RUN apt-get update && apt-get install -y \
    git \
    gcc \
    g++ \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 设置 Python 环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 复制依赖文件
COPY backend/pyproject.toml backend/uv.lock backend/README.md ./

# 安装 uv 并安装依赖
RUN pip install uv \
    --index-url http://maven.tyhtest.com/repository/pip-public/ \
    --extra-index-url http://mirrors.huaweicloud.com/repository/pypi/simple/ \
    --trusted-host maven.tyhtest.com \
    --trusted-host mirrors.huaweicloud.com && \
    uv sync --frozen --no-dev

# 复制后端源码
COPY backend/app/ ./app/
COPY backend/alembic.ini ./
COPY backend/migrations/ ./migrations/

# 从前端构建阶段复制静态文件
COPY --from=frontend-builder /frontend/dist ./static

# 复制启动脚本
COPY backend/start.sh ./start.sh
RUN chmod +x ./start.sh

# 创建必要的目录
RUN mkdir -p logs

# 设置环境变量
ENV PYTHONPATH=/app

# 设置版本信息
ARG COMMIT_SHA
ENV COMMIT_SHA=${COMMIT_SHA}

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["./start.sh"]
