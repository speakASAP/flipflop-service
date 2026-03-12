## FlipFlop E-commerce Tasks Index (Dev Phase, Phase 0+)

This index lists the main **Implementation Agents** and **Validator Agents** for the FlipFlop.cz e‑commerce service in development phase.

See:

- Global program: `shared/docs/ECOSYSTEM_REFACTOR_MASTER_PROMPT.md`
- FlipFlop dev‑phase prompt: `flipflop-service/docs/agents/master-prompt.md`
- E‑commerce unified prompt: `flipflop-service/docs/agents/ecommerce-unified-platform-master-prompt.md`

---

## Phase 0 — Contracts Alignment (Depends on Sync A)

### Task Group F0.1 — FlipFlop Contract Consumer Review

- **Implementation Agent**
  - Role: `FlipFlop Contract Consumer Implementer`
  - Scope:
    - Review how FlipFlop currently (or will) consume:
      - Auth (per `UNIFIED_AUTH_CONTRACT.md`).
      - Catalog, warehouse, orders, payments, leads (per e‑commerce unified prompt).
    - Ensure the FlipFlop dev‑phase prompt points only to the unified contracts and does not redefine them.
  - Outputs:
    - Updated dev‑phase prompt if any references are missing or ambiguous.

- **Validator Agent**
  - Role: `FlipFlop Contract Consumer Validator`
  - Checks:
    - FlipFlop dev‑phase prompt references the unified auth and e‑commerce docs.
    - No duplicate or conflicting contract definitions exist in FlipFlop docs.

---

## Phase 1–2 — Auth Integration and E‑commerce Flows

Concrete implementation and validation tasks for:

- Auth integration (redirect to auth, token handling).
- Orders + payments + catalog + leads integration.

must each define:

- An **Implementation Agent** prompt (what to change in code).
- A **Validator Agent** prompt (how to verify behavior and contracts).

Those prompts are defined closer to implementation time, after Sync A is fully validated.

