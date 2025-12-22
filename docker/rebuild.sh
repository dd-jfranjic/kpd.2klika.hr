#!/bin/bash
# KPD Rebuild Script with automatic Docker cleanup
# Usage: ./rebuild.sh [service]
# Examples:
#   ./rebuild.sh        - Rebuild all services
#   ./rebuild.sh web    - Rebuild only web service
#   ./rebuild.sh api    - Rebuild only api service
#   ./rebuild.sh admin  - Rebuild only admin service

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

SERVICE=${1:-""}

echo "=== KPD Rebuild Script ==="
echo "Time: $(date)"
echo ""

# Function to rebuild
rebuild_service() {
    local svc=$1
    echo ">>> Stopping $svc..."
    docker compose -f docker-compose.prod.yml stop $svc 2>/dev/null || true

    echo ">>> Removing $svc container..."
    docker compose -f docker-compose.prod.yml rm -f $svc 2>/dev/null || true

    echo ">>> Building $svc..."
    docker compose -f docker-compose.prod.yml build --no-cache $svc

    echo ">>> Starting $svc..."
    docker compose -f docker-compose.prod.yml up -d $svc
}

# Rebuild specific service or all
if [ -n "$SERVICE" ]; then
    rebuild_service "$SERVICE"
else
    echo ">>> Stopping all services..."
    docker compose -f docker-compose.prod.yml down

    echo ">>> Building all services..."
    docker compose -f docker-compose.prod.yml build --no-cache

    echo ">>> Starting all services..."
    docker compose -f docker-compose.prod.yml up -d
fi

# Wait for health checks
echo ""
echo ">>> Waiting for health checks (30s)..."
sleep 30

# Show status
echo ""
echo ">>> Container Status:"
docker ps --filter "name=kpd-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Docker cleanup - remove unused images, containers, networks
echo ""
echo ">>> Cleaning up Docker resources..."
docker image prune -f --filter "dangling=true" 2>/dev/null || true
docker container prune -f 2>/dev/null || true
docker builder prune -f --keep-storage=5GB 2>/dev/null || true

# Show disk usage after cleanup
echo ""
echo ">>> Docker Disk Usage:"
docker system df

echo ""
echo "=== Rebuild Complete ==="
echo "Time: $(date)"
