#!/bin/bash
#
# KPD Blue-Green Switch Script
# Prebacuje Apache ProxyPass između BLUE i GREEN environmenta
#
# Usage:
#   ./deploy/switch.sh blue   - Switch na BLUE
#   ./deploy/switch.sh green  - Switch na GREEN
#   ./deploy/switch.sh status - Prikaži trenutni status
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STATUS_FILE="$SCRIPT_DIR/.active-environment"
VHOST_CONF="/var/www/vhosts/system/kpd.2klika.hr/conf/vhost.conf"
VHOST_SSL_CONF="/var/www/vhosts/system/kpd.2klika.hr/conf/vhost_ssl.conf"

# Boje za output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Portovi
BLUE_WEB_PORT=13620
BLUE_API_PORT=13621
GREEN_WEB_PORT=13630
GREEN_API_PORT=13631

get_active() {
    if [ -f "$STATUS_FILE" ]; then
        cat "$STATUS_FILE"
    else
        echo "blue"  # Default je blue
    fi
}

set_active() {
    echo "$1" > "$STATUS_FILE"
}

check_health() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Checking $name health...${NC}"

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "http://localhost:$port" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $name is healthy${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e "${RED}✗ $name health check failed after $max_attempts attempts${NC}"
    return 1
}

update_apache() {
    local target=$1
    local web_port=$2
    local api_port=$3

    echo -e "${YELLOW}Updating Apache ProxyPass to $target (web: $web_port, api: $api_port)...${NC}"

    # Update vhost.conf (HTTP)
    cat > "$VHOST_CONF" << EOF
# KPD 2KLIKA Reverse Proxy Configuration - Apache
# Active environment: $target
# Generated: $(date)
# DO NOT EDIT MANUALLY - Use deploy/switch.sh

ProxyPreserveHost On
ProxyRequests Off

# Increase timeout for AI queries (Gemini RAG can take 60+ seconds)
ProxyTimeout 120
Timeout 120

# Next.js API routes (must be BEFORE NestJS catch-all!)
ProxyPass /api/kpd/ http://127.0.0.1:$web_port/api/kpd/
ProxyPassReverse /api/kpd/ http://127.0.0.1:$web_port/api/kpd/

# API routes go to NestJS backend
ProxyPass /api/ http://127.0.0.1:$api_port/api/
ProxyPassReverse /api/ http://127.0.0.1:$api_port/api/

# Everything else goes to Next.js frontend
ProxyPass / http://127.0.0.1:$web_port/
ProxyPassReverse / http://127.0.0.1:$web_port/

# WebSocket support for Next.js HMR
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /(.*) ws://127.0.0.1:$web_port/\$1 [P,L]

# Set proper headers
RequestHeader set X-Forwarded-Proto "http"
RequestHeader set X-Forwarded-Port "80"
RequestHeader set X-Real-IP %{REMOTE_ADDR}e
EOF

    # Update vhost_ssl.conf (HTTPS)
    cat > "$VHOST_SSL_CONF" << EOF
# KPD 2KLIKA Reverse Proxy Configuration - Apache SSL
# Active environment: $target
# Generated: $(date)
# DO NOT EDIT MANUALLY - Use deploy/switch.sh

ProxyPreserveHost On
ProxyRequests Off

# Increase timeout for AI queries (Gemini RAG can take 60+ seconds)
ProxyTimeout 120
Timeout 120

# Next.js API routes (must be BEFORE NestJS catch-all!)
ProxyPass /api/kpd/ http://127.0.0.1:$web_port/api/kpd/
ProxyPassReverse /api/kpd/ http://127.0.0.1:$web_port/api/kpd/

# API routes go to NestJS backend
ProxyPass /api/ http://127.0.0.1:$api_port/api/
ProxyPassReverse /api/ http://127.0.0.1:$api_port/api/

# Everything else goes to Next.js frontend
ProxyPass / http://127.0.0.1:$web_port/
ProxyPassReverse / http://127.0.0.1:$web_port/

# WebSocket support for Next.js HMR
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /(.*) ws://127.0.0.1:$web_port/\$1 [P,L]

# Set proper headers
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Port "443"
RequestHeader set X-Real-IP %{REMOTE_ADDR}e
EOF

    # Reload Apache (graceful - no downtime)
    echo -e "${YELLOW}Reloading Apache...${NC}"
    if apachectl configtest 2>/dev/null; then
        systemctl reload httpd 2>/dev/null || systemctl reload apache2 2>/dev/null || apachectl graceful
        echo -e "${GREEN}✓ Apache reloaded successfully${NC}"
    else
        echo -e "${RED}✗ Apache config test failed!${NC}"
        return 1
    fi
}

show_status() {
    local active=$(get_active)

    echo ""
    echo "======================================"
    echo "       KPD DEPLOYMENT STATUS"
    echo "======================================"
    echo ""

    if [ "$active" == "blue" ]; then
        echo -e "  BLUE:  ${GREEN}● ACTIVE${NC} (ports $BLUE_WEB_PORT/$BLUE_API_PORT)"
        echo -e "  GREEN: ${BLUE}○ STANDBY${NC} (ports $GREEN_WEB_PORT/$GREEN_API_PORT)"
    else
        echo -e "  BLUE:  ${BLUE}○ STANDBY${NC} (ports $BLUE_WEB_PORT/$BLUE_API_PORT)"
        echo -e "  GREEN: ${GREEN}● ACTIVE${NC} (ports $GREEN_WEB_PORT/$GREEN_API_PORT)"
    fi

    echo ""
    echo "Container Status:"
    echo "-----------------"
    docker ps --format "  {{.Names}}: {{.Status}}" | grep kpd || echo "  No KPD containers running"
    echo ""
}

switch_to() {
    local target=$1
    local current=$(get_active)

    if [ "$target" == "$current" ]; then
        echo -e "${YELLOW}Already on $target environment${NC}"
        show_status
        return 0
    fi

    echo ""
    echo "======================================"
    echo "  SWITCHING: $current → $target"
    echo "======================================"
    echo ""

    if [ "$target" == "blue" ]; then
        # Check BLUE health before switching
        check_health $BLUE_WEB_PORT "BLUE web" || return 1

        update_apache "blue" $BLUE_WEB_PORT $BLUE_API_PORT
        set_active "blue"
    else
        # Check GREEN health before switching
        check_health $GREEN_WEB_PORT "GREEN web" || return 1

        update_apache "green" $GREEN_WEB_PORT $GREEN_API_PORT
        set_active "green"
    fi

    echo ""
    echo -e "${GREEN}✓ Successfully switched to $target${NC}"
    show_status
}

case "$1" in
    blue)
        switch_to "blue"
        ;;
    green)
        switch_to "green"
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {blue|green|status}"
        echo ""
        echo "Commands:"
        echo "  blue   - Switch traffic to BLUE environment"
        echo "  green  - Switch traffic to GREEN environment"
        echo "  status - Show current deployment status"
        exit 1
        ;;
esac
