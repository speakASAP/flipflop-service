# Agents: flipflop-service

## Coordinator Config

```yaml
model_tier: cheap
cycle_interval_minutes: 60
max_tasks_per_cycle: 15
```

## Worker Pool Config

```yaml
max_concurrent_workers: 5
default_model_tier: free
allowed_mcp_servers: [filesystem, postgres, playwright]
```

## Typical Task Types

- write_product_description
- generate_seo_meta
- analyze_competitor_prices
- write_email_campaign

## Active Agents
<!-- Coordinator-maintained -->
None — awaiting business-orchestrator Phase 1 deployment.
