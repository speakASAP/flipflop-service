#!/bin/bash
# Stop all microservices started for local development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PID_FILE="$PROJECT_ROOT/.dev-pids"

if [ ! -f "$PID_FILE" ]; then
    print_warning "No PID file found. Services may not be running."
    exit 0
fi

print_info "Stopping all services..."

while read pid service; do
    if kill -0 "$pid" 2>/dev/null; then
        print_info "Stopping $service (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        # Wait a bit for graceful shutdown
        sleep 1
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
        print_success "$service stopped"
    else
        print_warning "$service (PID: $pid) is not running"
    fi
done < "$PID_FILE"

rm -f "$PID_FILE"
print_success "All services stopped!"

