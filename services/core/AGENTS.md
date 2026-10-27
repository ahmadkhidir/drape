# services/core

This file is authoritative for work in this directory and its subdirectories. Root
`AGENTS.md` is the coordinator's manual: read it for repository-wide workflow, dispatch,
and verification gates.

## Scope

This directory and its subdirectories. The issue's `Own` paths are binding; everything outside `Own` is read-only.

## Task rules

- Work only inside the issue's `Own` paths; everything outside `Own` is read-only.
- Code tasks never write under `docs/`. A doc gap becomes a `doc-gap` issue.
- Commit only your owned paths. Conventional Commits linking spec and issue (e.g. `Implements: FEAT-###`, `Fixes #<n>`). Never `git add -A`.
- Branch from `main`, open a PR, never push to `main`.
- In code and tests, cite permanent spec anchors (`FEAT-###`, `NFR-###`, `EVT-###`, or `C-###`). Commits and PRs link the spec and the GitHub issue.
- Implement all states, schemas, and events assigned to your area; never leave stubbed states or skip declared non-happy paths.
- Never log or commit secrets, tokens, or unmasked identity; credentials live in the secret store.
- Document code inline with docstrings and comments on non-obvious logic; skip trivial comments. Never create ad-hoc markdown documentation files.
- Write lean unit tests for the behavior your issue names.
- If a contract is wrong or incomplete, report a change request; never deviate.
- Execute strictly against the assigned issue contract. Never modify files outside your owned paths. If feedback or findings uncover defects outside your scope, report back to the coordinator for triage rather than performing out-of-scope edits.
- Do not reinvent the wheel: prefer established, battle-tested ecosystem packages over bespoke implementations. Research standard libraries and agree with the user before adding or changing external dependencies.
- Packages and dependencies belong strictly in this area's manifest (package.json), never in `AGENTS.md`.
- If blocked, state the assumption or ask for clarification before proceeding.
- When a fact resists you, verify it with evidence before falling back on recall.
- User-facing copy reads as human-written.

## Discipline

- **ACID Transactional Integrity & Fractional Precision:** Execute all multi-entity state transitions—including bolt deductions, order placement, and tailor dispatch—within explicit Drizzle ORM PostgreSQL transactions (`db.transaction`). Never use native JavaScript floating-point arithmetic for monetary amounts or fractional yardage calculations; compute linear cuts and currency exclusively using fixed-point decimals or integer basis units to guarantee precision down to 1/8th-yard increments without rounding drift.
- **Continuous-Yardage Distributed Locking:** Acquire a Redis distributed lock keyed by bolt identifier (`lock:bolt:<boltId>`) with a mandatory 15-minute time-to-live prior to evaluating yardage availability or executing inventory deductions. Verify unbroken continuous yardage under lock and release the lock atomically via release tokens; never allow split-cut allocations or concurrent checkout races against the same physical roll.
- **Mandatory Biometric Consent Gate:** Guard all photo upload handlers, neural fitting job enqueueing, and portrait-processing routes behind a strict server-side validation check that asserts an affirmative, non-expired `ConsentRecord` (`expiresAt > NOW()`). If valid consent is missing, immediately reject the request with HTTP 403 Forbidden before saving files to ephemeral memory or publishing inference events.
- **Drizzle Migration Safety & Backward Compatibility:** Author all PostgreSQL schema changes as reversible, additive Drizzle migration scripts tested against live development databases. Never execute destructive DDL (e.g., dropping active columns, changing column types, renaming tables) in a single step; implement expand-and-contract migrations to ensure zero-downtime compatibility.
- **Payment Idempotency & Webhook Reconciliation:** Pass deterministic idempotency keys derived from order identifiers to Stripe on every charge attempt. Process Stripe webhooks using cryptographic signature verification and idempotent event dispatch, recording charge status transitions atomically within the primary order transaction before releasing inventory locks.

## Checks

- Build: `pnpm --filter @drape/core build`
- Test: `pnpm --filter @drape/core test`
- Lint: `pnpm --filter @drape/core lint`

## Definition of Done

- All unit tests in this directory pass.
- Checks run cleanly with no unresolved stubs or TODOs.
