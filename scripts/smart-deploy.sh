#!/bin/bash
# Smart Deployment Script - Only rebuild/recreate services that have changed
# Usage: smart-deploy.sh [service_name] [--force] [--color=green|blue]
# If service_name is omitted, deploys all services
# --force flag forces rebuild even if no changes detected
# --color specifies which color to deploy (default: green)

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

# Parse arguments
SERVICE_NAME=""
FORCE_REBUILD=false
DEPLOY_COLOR="green"

for arg in "$@"; do
    case "$arg" in
        --force)
            FORCE_REBUILD=true
            ;;
        --color=*)
            DEPLOY_COLOR="${arg#*=}"
            ;;
        *)
            if [ -z "$SERVICE_NAME" ]; then
                SERVICE_NAME="$arg"
            fi
            ;;
    esac
done

# Service definitions
declare -A SERVICES
SERVICES[frontend]="services/frontend"
SERVICES[api-gateway]="services/api-gateway"
SERVICES[user-service]="services/user-service"
SERVICES[product-service]="services/product-service"
SERVICES[order-service]="services/order-service"
SERVICES[cart-service]="services/cart-service"
SERVICES[warehouse-service]="services/warehouse-service"

# Function to get git hash of directory (faster method using git diff)
get_dir_hash() {
    local dir="$1"
    if [ -d "$dir" ]; then
        # Get last commit hash that touched this directory
        local last_commit=$(git log -1 --format="%H" -- "$dir" 2>/dev/null || echo "")
        # Also check for uncommitted changes
        local uncommitted=$(git diff --name-only "$dir" 2>/dev/null | head -1 || echo "")
        if [ -n "$uncommitted" ]; then
            # Has uncommitted changes, use current timestamp + file list
            echo "$(git ls-files "$dir" 2>/dev/null | sort | sha256sum | cut -d' ' -f1)-$(date +%s)"
        else
            echo "$last_commit"
        fi
    else
        echo ""
    fi
}

# Function to check if service has changed
service_has_changed() {
    local service_name="$1"
    local service_path="${SERVICES[$service_name]}"
    local hash_file=".deploy-hashes/${service_name}.hash"
    
    if [ "$FORCE_REBUILD" = "true" ]; then
        return 0  # Force rebuild
    fi
    
    # Get current hash
    local current_hash=""
    if [ -n "$service_path" ] && [ -d "$service_path" ]; then
        local service_hash=$(get_dir_hash "$service_path")
        local shared_hash=$(get_dir_hash "shared")
        local prisma_hash=$(get_dir_hash "prisma")
        # Also check Dockerfile changes
        local dockerfile_hash=""
        if [ -f "${service_path}/Dockerfile" ]; then
            dockerfile_hash=$(git hash-object "${service_path}/Dockerfile" 2>/dev/null || echo "")
        fi
        current_hash=$(echo -n "${service_hash}-${shared_hash}-${prisma_hash}-${dockerfile_hash}" | sha256sum | cut -d' ' -f1)
    fi
    
    # Check if hash file exists
    if [ ! -f "$hash_file" ]; then
        # No previous hash, consider it changed
        mkdir -p "$(dirname "$hash_file")"
        echo "$current_hash" > "$hash_file"
        return 0
    fi
    
    # Compare with stored hash
    local stored_hash=$(cat "$hash_file" 2>/dev/null || echo "")
    if [ "$current_hash" != "$stored_hash" ]; then
        # Update hash file
        echo "$current_hash" > "$hash_file"
        return 0  # Changed
    fi
    
    return 1  # Not changed
}

# Function to check if container is running and healthy
container_is_healthy() {
    local container_name="$1"
    local health_endpoint="$2"
    local port="$3"
    
    # Check if container exists and is running
    if ! docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        return 1  # Container not running
    fi
    
    # Check container health status
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
    
    if [ "$health_status" = "healthy" ]; then
        return 0  # Healthy
    fi
    
    # If container is starting, wait a bit
    if [ "$health_status" = "starting" ]; then
        return 1  # Still starting
    fi
    
    # If no healthcheck defined, try to check the endpoint directly
    if [ "$health_status" = "none" ] && [ -n "$health_endpoint" ] && [ -n "$port" ]; then
        if docker exec "$container_name" curl -f -s --max-time 3 "http://localhost:${port}${health_endpoint}" >/dev/null 2>&1; then
            return 0  # Endpoint responds
        fi
    fi
    
    return 1  # Not healthy
}

# Function to deploy a single service
deploy_service() {
    local service_name="$1"
    local service_path="${SERVICES[$service_name]}"
    
    if [ -z "$service_path" ]; then
        print_error "Unknown service: $service_name"
        return 1
    fi
    
    print_info "Processing service: $service_name"
    
    # Determine container name
    local container_name="e-commerce-${service_name}-${DEPLOY_COLOR}"
    local compose_file="docker-compose.${DEPLOY_COLOR}.yml"
    
    # Determine health check endpoint and port
    local health_endpoint="/health"
    local port=""
    case "$service_name" in
        frontend)
            port="3000"
            health_endpoint="/"
            ;;
        product-service)
            port="3002"
            ;;
        order-service)
            port="3003"
            ;;
        user-service)
            port="3004"
            ;;
        warehouse-service)
            port="3005"
            ;;
        supplier-service)
            port="3006"
            ;;
        cart-service)
            port="3009"
            ;;
        api-gateway)
            port="3011"
            ;;
    esac
    
    # Check if service has changed
    if ! service_has_changed "$service_name"; then
        print_info "Service $service_name has no changes, checking container status..."
        
        # Check if container is already running and healthy
        if container_is_healthy "$container_name" "$health_endpoint" "$port"; then
            print_success "Service $service_name container is already running and healthy, skipping rebuild"
            return 0
        else
            print_warning "Service $service_name has no code changes but container is not healthy, will rebuild"
        fi
    else
        print_info "Service $service_name has changes, will rebuild"
    fi
    
    # Build only this service
    print_info "Building service: $service_name"
    if ! docker compose -f "$compose_file" build "$service_name"; then
        print_error "Failed to build service: $service_name"
        return 1
    fi
    
    # Start/restart the service
    print_info "Starting service: $service_name"
    if ! docker compose -f "$compose_file" up -d "$service_name"; then
        print_error "Failed to start service: $service_name"
        return 1
    fi
    
    # Wait a bit for service to start
    sleep 5
    
    # Check health
    local max_attempts=6
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        if container_is_healthy "$container_name" "$health_endpoint" "$port"; then
            print_success "Service $service_name is healthy"
            return 0
        fi
        print_info "Waiting for $service_name to become healthy (attempt $attempt/$max_attempts)..."
        sleep 5
    done
    
    print_error "Service $service_name failed health check after $max_attempts attempts"
    return 1
}

# Main deployment logic
main() {
    print_info "Starting smart deployment (color: $DEPLOY_COLOR)..."
    
    if [ -z "$SERVICE_NAME" ]; then
        print_info "No specific service specified, deploying all services"
        SERVICES_TO_DEPLOY=("${!SERVICES[@]}")
    else
        if [ -z "${SERVICES[$SERVICE_NAME]}" ]; then
            print_error "Unknown service: $SERVICE_NAME"
            print_info "Available services: ${!SERVICES[*]}"
            exit 1
        fi
        SERVICES_TO_DEPLOY=("$SERVICE_NAME")
    fi
    
    # Deploy each service
    local failed_services=()
    for service in "${SERVICES_TO_DEPLOY[@]}"; do
        if ! deploy_service "$service"; then
            failed_services+=("$service")
        fi
    done
    
    # Summary
    if [ ${#failed_services[@]} -eq 0 ]; then
        print_success "All services deployed successfully!"
    else
        print_error "Some services failed: ${failed_services[*]}"
        exit 1
    fi
}

# Run main function
main

