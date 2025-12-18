#!/bin/bash
# Start all microservices for local development (without Docker)

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

# PID file to track running processes
PID_FILE="$PROJECT_ROOT/.dev-pids"

# Function to cleanup on exit
cleanup() {
    print_info "Stopping all services..."
    if [ -f "$PID_FILE" ]; then
        while read pid service; do
            if kill -0 "$pid" 2>/dev/null; then
                print_info "Stopping $service (PID: $pid)..."
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Check if services are already running
if [ -f "$PID_FILE" ]; then
    print_warning "Found existing PID file. Stopping previous instances..."
    while read pid service; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

# Start services in order (backend services first, then frontend)
print_info "Starting microservices..."

# Start backend services
print_info "Starting user-service..."
cd "$PROJECT_ROOT/services/user-service"
npm run start:watch > "$PROJECT_ROOT/logs/user-service.log" 2>&1 &
echo "$! user-service" >> "$PID_FILE"
print_success "user-service started (PID: $!)"

print_info "Starting product-service..."
cd "$PROJECT_ROOT/services/product-service"
npm run start:watch > "$PROJECT_ROOT/logs/product-service.log" 2>&1 &
echo "$! product-service" >> "$PID_FILE"
print_success "product-service started (PID: $!)"

print_info "Starting order-service..."
cd "$PROJECT_ROOT/services/order-service"
npm run start:watch > "$PROJECT_ROOT/logs/order-service.log" 2>&1 &
echo "$! order-service" >> "$PID_FILE"
print_success "order-service started (PID: $!)"

print_info "Starting cart-service..."
cd "$PROJECT_ROOT/services/cart-service"
npm run start:watch > "$PROJECT_ROOT/logs/cart-service.log" 2>&1 &
echo "$! cart-service" >> "$PID_FILE"
print_success "cart-service started (PID: $!)"

print_info "Starting warehouse-service..."
cd "$PROJECT_ROOT/services/warehouse-service"
npm run start:watch > "$PROJECT_ROOT/logs/warehouse-service.log" 2>&1 &
echo "$! warehouse-service" >> "$PID_FILE"
print_success "warehouse-service started (PID: $!)"

print_info "Starting supplier-service..."
cd "$PROJECT_ROOT/services/supplier-service"
npm run start:watch > "$PROJECT_ROOT/logs/supplier-service.log" 2>&1 &
echo "$! supplier-service" >> "$PID_FILE"
print_success "supplier-service started (PID: $!)"

# Wait a bit for backend services to start
print_info "Waiting for backend services to initialize..."
sleep 3

# Start API Gateway
print_info "Starting api-gateway..."
cd "$PROJECT_ROOT/services/api-gateway"
npm run start:watch > "$PROJECT_ROOT/logs/api-gateway.log" 2>&1 &
echo "$! api-gateway" >> "$PID_FILE"
print_success "api-gateway started (PID: $!)"

# Wait a bit for API Gateway to start
print_info "Waiting for API Gateway to initialize..."
sleep 3

# Start Frontend
print_info "Starting frontend..."
cd "$PROJECT_ROOT/services/frontend"
# Load .env to get FRONTEND_PORT
source "$PROJECT_ROOT/.env" 2>/dev/null || true
PORT=${FRONTEND_PORT:-3500} npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
echo "$! frontend" >> "$PID_FILE"
print_success "frontend started (PID: $!) on port ${FRONTEND_PORT:-3500}"

print_success "All services started!"
print_info "Services are running in the background."
print_info "Logs are available in: $PROJECT_ROOT/logs/"
print_info "To stop all services, press Ctrl+C or run: npm run dev:stop"
print_info ""
print_info "Service URLs:"
print_info "  Frontend: http://localhost:${FRONTEND_PORT:-3500}"
print_info "  Product Service: http://localhost:${PRODUCT_SERVICE_PORT:-3502}"
print_info "  Order Service: http://localhost:${ORDER_SERVICE_PORT:-3503}"
print_info "  User Service: http://localhost:${USER_SERVICE_PORT:-3504}"
print_info "  Warehouse Service: http://localhost:${WAREHOUSE_SERVICE_PORT:-3505}"
print_info "  Supplier Service: http://localhost:${SUPPLIER_SERVICE_PORT:-3506}"
print_info "  Cart Service: http://localhost:${CART_SERVICE_PORT:-3509}"
print_info "  API Gateway: http://localhost:${API_GATEWAY_PORT:-3511}"

# Keep script running
wait

