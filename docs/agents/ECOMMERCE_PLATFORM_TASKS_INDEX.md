## E-commerce Unified Platform Tasks Index (Phase 0 / Sync A Focus)

This index lists the main **Implementation Agents** and **Validator Agents** for the E‑commerce Unified Platform, focusing on Phase 0 / Sync A.

See:

- Global program: `shared/docs/ECOSYSTEM_REFACTOR_MASTER_PROMPT.md`
- E‑commerce master prompt: `flipflop-service/docs/agents/ecommerce-unified-platform-master-prompt.md`

---

## Phase 0 — Contracts & Documentation (Sync A)

### Task Group E0.1 — DTO and Contract Confirmation

- **Implementation Agent**
  - Role: `Ecommerce Contracts Implementer`
  - Scope:
    - Review and, if necessary, adjust the DTOs and flows in:
      - `flipflop-service/docs/agents/ecommerce-unified-platform-master-prompt.md`
      - `shared/docs/UNIFIED_ECOMMERCE_ARCHITECTURE.md`
    - Ensure a single, consistent definition for:
      - Catalog ↔ FlipFlop (ProductForDisplay).
      - Catalog ↔ channel export (BaseProductExportDTO).
      - FlipFlop ↔ orders (CreateOrderRequest/Response).
      - FlipFlop ↔ payments (CreatePaymentRequest/Response with VS/QR).
  - Inputs:
    - The two docs above.
    - Current service READMEs for catalog, orders, payments, warehouse, leads.
  - Outputs:
    - Updated contracts (if needed) so both docs are aligned and clearly marked as the frozen source of truth for Sync A.

- **Validator Agent**
  - Role: `Ecommerce Contracts Validator`
  - Checks:
    - DTOs and flows in both docs are consistent with each other.
    - No contradictions with `shared/README.md` service descriptions.
    - Contracts are specific enough that implementers can work without guessing.
    - Any required changes are reflected in both documents.
  - Exit:
    - Approve Sync A (e‑commerce side) or send detailed corrections back to E0.1.

### Task Group E0.2 — Channel Metadata Strategy Confirmation

- **Implementation Agent**
  - Role: `Channel Metadata Strategy Implementer`
  - Scope:
    - Confirm and, if needed, refine the decision that:
      - Catalog stores core product data only in main tables.
      - Per‑channel metadata lives in separate tables (`product_flipflop_meta`, `product_allegro_meta`, etc.).
    - Ensure this is clearly documented as mandatory and non‑optional in the e‑commerce master prompt.

- **Validator Agent**
  - Role: `Channel Metadata Strategy Validator`
  - Checks:
    - Documentation clearly forbids a single shared metadata table for all channels.
    - API descriptions reflect the “one channel per request, one meta table joined” rule.

---

## Next Phases

Later phases (catalog admin + warehouse orchestration, orders/payments integration, events to leads) must also define Implementation + Validator agents, following this structure, but those are executed after Sync A is approved.

