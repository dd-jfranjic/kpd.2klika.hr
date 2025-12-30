#!/bin/bash
#
# KPD Zero-Downtime Deploy Script
#
# Automatski builda STANDBY environment i nudi switch
# Ne moras znati koji je blue/green - skripta zna!
#
# Usage:
#   ./deploy/deploy.sh              - Build standby + prompt za switch
#   ./deploy/deploy.sh --no-switch  - Samo build, bez switcha
#   ./deploy/deploy.sh --auto       - Build + automatski switch (za CI/CD)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STATUS_FILE="$SCRIPT_DIR/.active-environment"

# Boje za output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

cd "$PROJECT_DIR"

get_active() {
    if [ -f "$STATUS_FILE" ]; then
        cat "$STATUS_FILE"
    else
        echo "blue"
    fi
}

get_standby() {
    local active=$(get_active)
    if [ "$active" == "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        KPD ZERO-DOWNTIME DEPLOYMENT                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

ACTIVE=$(get_active)
STANDBY=$(get_standby)

echo -e "Current: ${GREEN}$ACTIVE${NC} (active) | ${BLUE}$STANDBY${NC} (standby → will build)"
echo ""

# Determine compose file
if [ "$STANDBY" == "green" ]; then
    COMPOSE_FILE="docker/docker-compose.green.yml"
    WEB_CONTAINER="kpd-web-g"
    API_CONTAINER="kpd-api-g"
    WEB_PORT=13630
    API_PORT=13631
else
    COMPOSE_FILE="docker/docker-compose.prod.yml"
    WEB_CONTAINER="kpd-web"
    API_CONTAINER="kpd-api"
    WEB_PORT=13620
    API_PORT=13621
fi

echo -e "${YELLOW}Step 1: Building $STANDBY environment...${NC}"
echo "Compose file: $COMPOSE_FILE"
echo ""

# Build
START_TIME=$(date +%s)

if [ "$STANDBY" == "green" ]; then
    # GREEN - samo web i api (baza je shared)
    docker compose -f "$COMPOSE_FILE" build --no-cache
    docker compose -f "$COMPOSE_FILE" up -d
else
    # BLUE - full stack (ali baza se ne rebuilda ako postoji)
    docker compose -f "$COMPOSE_FILE" up -d --build web api
fi

END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}✓ Build completed in ${BUILD_TIME}s${NC}"

# Wait for health
echo ""
echo -e "${YELLOW}Step 2: Waiting for health checks...${NC}"

MAX_WAIT=120
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    API_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$API_CONTAINER" 2>/dev/null || echo "unknown")
    WEB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$WEB_CONTAINER" 2>/dev/null || echo "unknown")

    if [ "$API_HEALTH" == "healthy" ] && [ "$WEB_HEALTH" == "healthy" ]; then
        echo -e "${GREEN}✓ All containers healthy${NC}"
        break
    fi

    echo -n "."
    sleep 2
    WAITED=$((WAITED + 2))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}✗ Health check timeout!${NC}"
    echo "API: $API_HEALTH, Web: $WEB_HEALTH"
    exit 1
fi

# Docker cleanup - KRITIČNO! Server ima ograničen disk!
echo ""
echo -e "${YELLOW}Step 3: Docker cleanup (OBAVEZNO!)...${NC}"
docker image prune -f
docker builder prune -f
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}')
echo -e "${GREEN}✓ Cleanup done. Disk usage: $DISK_USAGE${NC}"

# Fix file permissions
echo ""
echo -e "${YELLOW}Step 4: Fixing file permissions...${NC}"
chown -R kpd.2klika.hr_cjfmg3wnf4u:psacln "$PROJECT_DIR" 2>/dev/null || true
find "$PROJECT_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
find "$PROJECT_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true
echo -e "${GREEN}✓ Permissions fixed${NC}"

# Show test URLs
echo ""
echo "======================================"
echo -e "${CYAN}$STANDBY environment ready for testing:${NC}"
echo ""
echo "  Web: http://localhost:$WEB_PORT"
echo "  API: http://localhost:$API_PORT/api/v1/health"
echo ""
echo "======================================"

# Handle switch
case "$1" in
    --no-switch)
        echo ""
        echo -e "${YELLOW}Build complete. Run './deploy/switch.sh $STANDBY' when ready.${NC}"
        ;;
    --auto)
        echo ""
        echo -e "${YELLOW}Auto-switching to $STANDBY...${NC}"
        "$SCRIPT_DIR/switch.sh" "$STANDBY"
        ;;
    *)
        echo ""
        read -p "Switch to $STANDBY now? (y/n): " CONFIRM
        if [ "$CONFIRM" == "y" ] || [ "$CONFIRM" == "Y" ]; then
            "$SCRIPT_DIR/switch.sh" "$STANDBY"
        else
            echo ""
            echo -e "${YELLOW}Skipped. Run './deploy/switch.sh $STANDBY' when ready.${NC}"
        fi
        ;;
esac

echo ""
echo -e "${GREEN}Deploy complete!${NC}"
