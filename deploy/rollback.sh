#!/bin/bash
#
# KPD Instant Rollback Script
#
# Vraća se na prethodni environment (1 sekunda!)
# Koristi nakon switch ako nešto ne radi
#
# Usage:
#   ./deploy/rollback.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATUS_FILE="$SCRIPT_DIR/.active-environment"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

get_active() {
    if [ -f "$STATUS_FILE" ]; then
        cat "$STATUS_FILE"
    else
        echo "blue"
    fi
}

get_previous() {
    local active=$(get_active)
    if [ "$active" == "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

ACTIVE=$(get_active)
PREVIOUS=$(get_previous)

echo ""
echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║          EMERGENCY ROLLBACK            ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Rolling back: ${RED}$ACTIVE${NC} → ${GREEN}$PREVIOUS${NC}"
echo ""

# --force flag za automatski rollback (bez potvrde)
if [ "$1" == "--force" ] || [ "$1" == "-f" ]; then
    "$SCRIPT_DIR/switch.sh" "$PREVIOUS"
    echo ""
    echo -e "${GREEN}✓ Rollback complete!${NC}"
    exit 0
fi

read -p "Are you sure? (y/n): " CONFIRM

if [ "$CONFIRM" == "y" ] || [ "$CONFIRM" == "Y" ]; then
    "$SCRIPT_DIR/switch.sh" "$PREVIOUS"
    echo ""
    echo -e "${GREEN}✓ Rollback complete!${NC}"
else
    echo "Rollback cancelled."
fi
