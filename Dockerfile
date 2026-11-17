# ==========================================
# Multi-stage Dockerfile for GetSATGo
# Builds React frontend & serves via FastAPI
# ==========================================

# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG MIXPANEL_PROJECT_TOKEN
RUN VITE_MIXPANEL_TOKEN=$MIXPANEL_PROJECT_TOKEN npm run build

# Stage 2: Production Python Backend
FROM python:3.13-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    ENVIRONMENT=production

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install backend Python requirements, including the PostgreSQL driver.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend /app/backend

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose default port
EXPOSE 8000
ENV PORT=8000

# Start server
CMD ["sh", "-c", "python3 -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

