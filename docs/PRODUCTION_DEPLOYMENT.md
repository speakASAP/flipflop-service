# Production Deployment Guide - flipflop.statex.cz

**Date**: 2025-11-14  
**Purpose**: Complete guide for deploying the e-commerce platform to production

---

## Overview

This guide covers the complete deployment process for the flipflop.statex.cz e-commerce platform, including infrastructure setup, service configuration, and verification steps.

---

## Prerequisites

1. **Access to Production Server**:

   ```bash
   ssh statex
   ```

2. **Required Services Running**:
   - Database server (PostgreSQL + Redis)
   - Nginx microservice
   - Notification microservice
   - Logging microservice

3. **Network Configuration**:
   - All services must be on `nginx-network` Docker network
   - DNS resolution working for service discovery

---

## Deployment Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                nginx-microservice                       │
│             (flipflop.statex.cz:443)                    │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐          ┌───────▼──────┐
    │ Frontend│          │  API Gateway │
    │  :3000  │          │    :3001     │
    └─────────┘          └───────┬──────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼──┐   ┌────▼────┐  ┌───▼────┐
              │  User  │   │ Product │  │  Order │
              │ :3004  │   │  :3002  │  │ :3003  │
              └────────┘   └─────────┘  └────────┘
                    │            │            │
                    └────────────┼────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼──┐   ┌────▼────┐  ┌────▼────┐
              │Supplier│   │    AI   │  │Analytics│
              │ :3006  │   │  :3007  │  │  :3008  │
              └────────┘   └─────────┘  └─────────┘
                    │            │            │
                    └────────────┼────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
    ┌────▼────┐          ┌───────▼──────┐        ┌───────▼──────┐
    │Database │          │ Notification │        │   Logging    │
    │:5432    │          │    :3010     │        │    :3009     │
    └─────────┘          └──────────────┘        └──────────────┘
```

---

## Step 1: Database Setup

### 1.1 Verify Database Server

```bash
ssh statex
cd /home/statex/database-server
./scripts/status.sh
```

**Expected Output**:

- PostgreSQL container: Running and healthy
- Redis container: Running and healthy
- Network: Connected to nginx-network

### 1.2 Create E-commerce Database

```bash
cd /home/statex/database-server
./scripts/list-databases.sh
```

If `ecommerce` database doesn't exist:

```bash
./scripts/create-database.sh ecommerce ecommerce_user <strong_password>
```

**Note**: Save the credentials for `.env` configuration.

### 1.3 Configure Database Connection

Update `.env` in e-commerce project:

```bash
DB_HOST=db-server-postgres
DB_PORT=5432
DB_USER=ecommerce_user  # or dbadmin
DB_PASSWORD=<your_password>
DB_NAME=ecommerce
DB_SYNC=false
```

---

## Step 2: Nginx Configuration

### 2.1 Add Domain Configuration

```bash
cd /home/statex/nginx-microservice
./scripts/add-domain.sh flipflop.statex.cz e-commerce-frontend 3000
```

This script will:

- Create nginx configuration file
- Check for SSL certificate
- Request certificate if needed
- Test nginx configuration
- Reload nginx

### 2.2 Manual Configuration (Alternative)

If using manual configuration:

1. **Create config file**:

   ```bash
   cd /home/statex/nginx-microservice
   cp nginx/templates/domain.conf.template nginx/conf.d/flipflop.statex.cz.conf
   ```

2. **Edit configuration**:
   - Replace `{{DOMAIN_NAME}}` with `flipflop.statex.cz`
   - Replace `{{CONTAINER_NAME}}` with `e-commerce-frontend`
   - Replace `{{CONTAINER_PORT}}` with `3000`

3. **Test and reload**:

   ```bash
   docker compose exec nginx nginx -t
   docker compose exec nginx nginx -s reload
   ```

---

## Step 3: SSL Certificate Setup

### 3.1 Request SSL Certificate

```bash
cd /home/statex/nginx-microservice
docker compose run --rm certbot /scripts/request-cert.sh flipflop.statex.cz
```

**What this does**:

- Requests certificate from Let's Encrypt
- Stores certificate in `certificates/flipflop.statex.cz/`
- Updates nginx configuration

### 3.2 Verify Certificate

```bash
cd /home/statex/nginx-microservice
docker compose run --rm certbot /scripts/check-cert-expiry.sh flipflop.statex.cz
```

**Expected Output**:

```text
✅ flipflop.statex.cz: Valid for X days
```

### 3.3 Setup Automatic Renewal

```bash
cd /home/statex/nginx-microservice
./scripts/setup-cert-renewal.sh
```

This will create either:

- Systemd timer (preferred)
- Cron job (fallback)

**Verify renewal setup**:

```bash
# Systemd
systemctl list-timers | grep certbot

# Cron
crontab -l | grep certbot
```

---

## Step 4: E-commerce Services Deployment

### 4.1 Prepare Environment

1. **Navigate to project**:

   ```bash
   ssh statex
   cd /path/to/e-commerce  # Adjust path as needed
   ```

2. **Verify `.env` file**:

   ```bash
   cat .env | grep -E "DB_|NOTIFICATION_|LOGGING_|NGINX_NETWORK"
   ```

3. **Required environment variables**:

   ```env
   # Database
   DB_HOST=db-server-postgres
   DB_PORT=5432
   DB_USER=<your_user>
   DB_PASSWORD=<your_password>
   DB_NAME=ecommerce

   # Services
   NOTIFICATION_SERVICE_URL=http://notification-microservice:3010
   LOGGING_SERVICE_URL=http://logging-microservice:3009

   # Network
   NGINX_NETWORK_NAME=nginx-network
   ```

### 4.2 Start Services

```bash
docker compose up -d
```

**Verify services are running**:

```bash
docker compose ps
```

**Expected services**:

- e-commerce-frontend
- e-commerce-api-gateway
- e-commerce-user-service
- e-commerce-product-service
- e-commerce-order-service
- e-commerce-supplier-service
- e-commerce-ai-service
- e-commerce-analytics-service

### 4.3 Verify Network Connectivity

```bash
# Check if services are on nginx-network
docker network inspect nginx-network | grep e-commerce

# If services are not connected, connect them:
docker network connect nginx-network e-commerce-frontend
docker network connect nginx-network e-commerce-api-gateway
# ... repeat for all services
```

**Or ensure docker-compose.yml includes**:

```yaml
services:
  frontend:
    networks:
      - default
      - nginx-network

networks:
  nginx-network:
    external: true
    name: nginx-network
```

---

## Step 5: Verification and Testing

### 5.1 Test HTTPS

```bash
curl -I https://flipflop.statex.cz
```

**Expected Response**:

```text
HTTP/2 200
server: nginx
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

### 5.2 Test API

```bash
curl -I https://flipflop.statex.cz/api/health
```

### 5.3 Test Service Health

```bash
# From within a service container
docker exec e-commerce-api-gateway curl http://localhost:3001/health

# Test database connection
docker exec e-commerce-api-gateway psql -h db-server-postgres -U dbadmin -d ecommerce -c "SELECT 1;"

# Test notification service
docker exec e-commerce-order-service curl http://notification-microservice:3010/health

# Test logging service
docker exec e-commerce-api-gateway curl http://logging-microservice:3009/health
```

### 5.4 Test Service Discovery

```bash
# Test DNS resolution
docker exec e-commerce-api-gateway nslookup notification-microservice
docker exec e-commerce-api-gateway nslookup logging-microservice
docker exec e-commerce-api-gateway nslookup db-server-postgres
```

---

## Step 6: Update from Repository

### 6.1 Update Nginx Configuration

```bash
ssh statex
cd /home/statex/nginx-microservice
git pull origin main
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

### 6.2 Update E-commerce Services

```bash
ssh statex
cd /path/to/e-commerce
git pull origin main
docker compose build  # If Dockerfiles changed
docker compose up -d
```

---

## Troubleshooting

### Nginx Issues

**Configuration errors**:

```bash
docker exec nginx-microservice nginx -t
docker logs nginx-microservice | tail -50
```

**502 Bad Gateway**:

1. Check if backend services are running:

   ```bash
   docker ps | grep e-commerce
   ```

2. Check if services are on nginx-network:

   ```bash
   docker network inspect nginx-network | grep e-commerce
   ```

3. Test container connectivity:

   ```bash
   docker run --rm --network nginx-network alpine/curl:latest \
     curl -s http://e-commerce-frontend:3000
   ```

### SSL Certificate Issues

**Certificate not found**:

```bash
cd /home/statex/nginx-microservice
ls -la certificates/flipflop.statex.cz/
docker compose run --rm certbot /scripts/request-cert.sh flipflop.statex.cz
```

**Certificate expiration**:

```bash
cd /home/statex/nginx-microservice
docker compose run --rm certbot /scripts/check-cert-expiry.sh flipflop.statex.cz
docker compose run --rm certbot /scripts/renew-cert.sh
```

### Database Connection Issues

**Connection refused**:

```bash
# Test from e-commerce container
docker exec e-commerce-api-gateway ping db-server-postgres

# Test database connection
docker exec e-commerce-api-gateway psql -h db-server-postgres -U dbadmin -d ecommerce -c "SELECT 1;"
```

**Authentication failed**:

- Verify credentials in `.env` match database server
- Check database user permissions

### Service Discovery Issues

**DNS resolution fails**:

```bash
# Verify network exists
docker network inspect nginx-network

# Verify services are on network
docker network inspect nginx-network | grep -A 5 e-commerce

# Test DNS
docker exec e-commerce-api-gateway nslookup notification-microservice
```

---

## Maintenance

### Certificate Renewal

Certificates are automatically renewed, but you can manually renew:

```bash
cd /home/statex/nginx-microservice
docker compose run --rm certbot /scripts/renew-cert.sh
docker compose exec nginx nginx -s reload
```

### Service Updates

1. **Pull latest code**:

   ```bash
   git pull origin main
   ```

2. **Rebuild if needed**:

   ```bash
   docker compose build
   ```

3. **Restart services**:

   ```bash
   docker compose up -d
   ```

### Logs

**View service logs**:

```bash
docker compose logs -f [service-name]
```

**View nginx logs**:

```bash
docker logs nginx-microservice
docker logs nginx-certbot
```

**View database logs**:

```bash
docker logs db-server-postgres
docker logs db-server-redis
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Database server running
- [ ] E-commerce database created
- [ ] Database credentials configured in `.env`
- [ ] Nginx microservice running
- [ ] Notification microservice running
- [ ] Logging microservice running

### Deployment

- [ ] Nginx configuration created
- [ ] SSL certificate obtained
- [ ] SSL certificate installed
- [ ] Nginx reloaded
- [ ] E-commerce services started
- [ ] Services connected to nginx-network

### Post-Deployment

- [ ] HTTPS accessible
- [ ] Frontend accessible
- [ ] API accessible
- [ ] Database connection working
- [ ] Notification service working
- [ ] Logging service working
- [ ] All health checks passing

---

## Quick Reference

### Common Commands

```bash
# Check nginx status
docker compose -f /home/statex/nginx-microservice/docker-compose.yml ps

# Reload nginx
docker compose -f /home/statex/nginx-microservice/docker-compose.yml exec nginx nginx -s reload

# Check certificate
docker compose -f /home/statex/nginx-microservice/docker-compose.yml run --rm certbot /scripts/check-cert-expiry.sh flipflop.statex.cz

# Check service logs
docker compose logs -f [service-name]

# Restart services
docker compose restart [service-name]
```

### Important Paths

- **Nginx config**: `/home/statex/nginx-microservice/nginx/conf.d/flipflop.statex.cz.conf`
- **SSL certificates**: `/home/statex/nginx-microservice/certificates/flipflop.statex.cz/`
- **E-commerce project**: `/path/to/e-commerce` (adjust as needed)
- **Database server**: `/home/statex/database-server`

---

## Support

For issues or questions:

- Check logs: `docker compose logs [service-name]`
- Review documentation in `/docs`
- Check nginx error logs: `docker logs nginx-microservice`

---

**Last Updated**: 2025-11-14
