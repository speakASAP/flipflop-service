# Smart Deployment System

## Overview

The smart deployment system optimizes the blue/green deployment process by only rebuilding and recreating services that have actually changed. This dramatically speeds up deployments when only one or a few services have been modified.

## How It Works

1. **Change Detection**: The system tracks changes to each service by:
   - Monitoring git commits that affect service directories
   - Tracking changes to shared modules (`shared/`, `prisma/`)
   - Detecting Dockerfile modifications
   - Storing hashes in `.deploy-hashes/` directory

2. **Health Checking**: Before rebuilding, the system checks if:
   - The container is already running
   - The container is healthy (via Docker health status or direct endpoint check)

3. **Selective Rebuild**: Only services that have changed OR are unhealthy will be rebuilt

## Usage

### Production Deployment (Recommended)

Use the smart deployment script on the production server:

```bash
ssh statex "cd /home/statex/nginx-microservice && ./scripts/blue-green/deploy-smart.sh e-commerce"
```

This will:

- Only rebuild services that have changed
- Skip healthy containers that haven't changed
- Still perform full blue/green traffic switching
- Monitor health for 5 minutes after deployment

### Local Development

For local testing, use the smart deploy script:

```bash
# Deploy all services (only changed ones will rebuild)
./scripts/smart-deploy.sh

# Deploy a specific service
./scripts/smart-deploy.sh frontend

# Force rebuild everything
./scripts/smart-deploy.sh --force

# Deploy to specific color
./scripts/smart-deploy.sh --color=blue
```

## Benefits

1. **Speed**: If only `frontend` changed, only `frontend` will rebuild (saves ~10-15 minutes)
2. **Efficiency**: Healthy containers that haven't changed are left running
3. **Safety**: Still performs full health checks and blue/green switching
4. **Flexibility**: Can force full rebuild with `--force` flag

## Service Detection

The system automatically detects these services:

- `frontend`
- `api-gateway`
- `user-service`
- `product-service`
- `order-service`
- `cart-service`
- `warehouse-service`

## Change Tracking

Hashes are stored in `.deploy-hashes/` directory (gitignored). Each service has its own hash file that tracks:

- Service code changes
- Shared module changes (affects all services)
- Prisma schema changes (affects all services)
- Dockerfile changes

## Fallback to Standard Deployment

If you need to use the standard deployment (rebuilds everything):

```bash
ssh statex "cd /home/statex/nginx-microservice && ./scripts/blue-green/deploy.sh e-commerce"
```

## Troubleshooting

### Service Not Detecting Changes

If a service should rebuild but isn't:

1. Check if `.deploy-hashes/` exists and has correct permissions
2. Force rebuild: `./scripts/smart-deploy.sh <service> --force`
3. Delete hash file: `rm .deploy-hashes/<service>.hash`

### Container Health Check Failing

If a healthy container is being rebuilt:

1. Check container logs: `docker logs <container-name>`
2. Verify health endpoint: `curl http://localhost:<port>/health`
3. Check Docker health status: `docker inspect <container-name> | grep Health`

### All Services Rebuilding

On first deployment, all services will rebuild (no previous hashes). Subsequent deployments will only rebuild changed services.
