# Multi-stage build: frontend (Node) -> backend (Python) single container

# 1) Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 2) Backend runtime with Poetry
FROM python:3.11-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

WORKDIR /app/backend

# System deps (curl for poetry install)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry

# Install backend deps first (cache layer)
COPY backend/pyproject.toml ./
RUN poetry install --no-root --no-ansi

# Copy backend source
COPY backend/ ./

# Copy built frontend to a static dir consumed by FastAPI
WORKDIR /app
RUN mkdir -p /app/static
COPY --from=frontend /app/frontend/dist/ /app/static/

# Env for static mount
ENV STATIC_DIR=/app/static

EXPOSE 8000
WORKDIR /app/backend
CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


