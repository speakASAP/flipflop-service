# VAL-TASK-003: Catalog Connector Content Preview

```yaml
id: VAL-TASK-003
status: validated
owner: project owner
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
upstream:
  - ../11_tasks/TASK-003-catalog-connector-content-preview.md
downstream:
  - ../docs/IMPLEMENTATION_STATE.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Summary

The Catalog connector content preview lane is implemented, validated, deployed, and runtime-smoked. Product-service exposes a protected read-only preview endpoint, and the admin sync page now lists Catalog products and displays selected `flipflop` connector preview content and metadata.

## Upstream goal

`TASK-003` preserves shared Catalog usage and admin reviewability by exposing a read-only FlipFlop connector preview without changing storefront, checkout, pricing, order, cart, stock, or deployment ownership.

## Criteria checked

- IPS task, goal impact, execution plan, context package, coding prompt, and validation artifacts exist.
- Product-service endpoint is protected and read-only.
- Catalog client uses marketplace key `flipflop`.
- Admin frontend shows preview title, plain text, source metadata, overrides, and warnings.
- Admin frontend does not call the Allegro API route for this preview lane.
- No forbidden files or deploy artifacts are changed.
- Required validation commands pass.

## Issues found

- Initial strict documentation audit failed on route literal parsing and missing graph edges in the new docs; the docs were corrected and the final audit passed.
- Initial product-service build failed because the repo-local package build resolved stale generated shared declarations; the source was adjusted without adding shared generated-dist churn, and the final build passed.
- Live endpoint smoke was not run because this lane is no-deploy by owner instruction.

## Runtime deployment addendum

- FlipFlop deployment completed after commits `0c199ce` and `e4f8781` repaired gateway/product-service runtime packaging and product-service entrypoint layout tolerance.
- Final `./scripts/deploy.sh` completed successfully in 181.24s.
- Public smoke passed: `/` HTTP 200 and `/api/products?limit=1` HTTP 200.
- Protected preview route is mapped as `GET /products/:id/catalog-content-preview`; anonymous access is blocked by the existing JWT guard. Missing/invalid token errors currently surface as HTTP 500 and are tracked as optional auth hardening, not as a connector rendering failure.

## Recommendation

Goal 10/TASK-003 connector preview is released. Optional follow-up: normalize shared guard missing/invalid token failures to HTTP 401.

## Traceability confirmation

Validation maps to `11_tasks/TASK-003-catalog-connector-content-preview.md`, `21_execution_plans/EP-TASK-003-catalog-connector-content-preview.md`, `22_goal_impact/GOAL-IMPACT-TASK-003-catalog-connector-content-preview.md`, and `implementation-goals/GOAL-10-catalog-connector-content-preview.validation-report.md`.
