# AI Service Docker Build & Test

## Build Production Image

```bash
cd apps/ai-service

# Build
docker build -t c404-ai-service:latest .

# Build with specific tag
docker build -t c404-ai-service:v1.0.0 .
```

## Build Development Image

```bash
# Build dev image with hot reload
docker build -f Dockerfile.dev -t c404-ai-service:dev .
```

## Run Container

### Production

```bash
docker run -d \
  --name ai-service \
  -p 8000:8000 \
  -e LLM_API_KEY=your_key \
  -e GRAPH_DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e LOG_LEVEL=INFO \
  -v $(pwd)/logs:/app/logs \
  c404-ai-service:latest
```

### Development

```bash
docker run -d \
  --name ai-service-dev \
  -p 8000:8000 \
  -e LLM_API_KEY=your_key \
  -e GRAPH_DATABASE_URL=postgresql://user:pass@host:5432/db \
  -v $(pwd):/app \
  c404-ai-service:dev
```

## Docker Compose

```yaml
# docker-compose.yml
services:
  ai-service:
    build:
      context: ./apps/ai-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - LLM_API_KEY=${LLM_API_KEY}
      - GRAPH_DATABASE_URL=${GRAPH_DATABASE_URL}
      - LOG_LEVEL=INFO
    volumes:
      - ./apps/ai-service/logs:/app/logs
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

## Health Check

```bash
# Check if container is healthy
docker ps

# Manual health check
curl http://localhost:8000/health
```

## View Logs

```bash
# Follow logs
docker logs -f ai-service

# Last 100 lines
docker logs --tail 100 ai-service
```

## Image Size Optimization

The multi-stage build reduces image size:
- Builder stage: ~1.2GB (includes build tools)
- Final image: ~400MB (runtime only)

## Security Features

- ✅ Non-root user (uid 1000)
- ✅ Minimal base image (python:3.12-slim)
- ✅ No unnecessary packages
- ✅ Read-only application code
- ✅ Health check included

## Environment Variables

Required:
- `LLM_API_KEY` - Gemini API key
- `GRAPH_DATABASE_URL` - PostgreSQL connection string

Optional:
- `LOG_LEVEL` - Logging level (default: INFO)
- `AI_SERVICE_API_KEY` - API authentication key
- `GOOGLE_CLOUD_PROJECT` - GCP project ID
- `GOOGLE_CLOUD_REGION` - GCP region

## Troubleshooting

### Container exits immediately
```bash
# Check logs
docker logs ai-service

# Run interactively
docker run -it --rm c404-ai-service:latest /bin/bash
```

### Permission denied on logs
```bash
# Fix permissions
sudo chown -R 1000:1000 logs/
```

### Database connection fails
```bash
# Test from container
docker exec -it ai-service python -c "import asyncpg; print('OK')"
```
