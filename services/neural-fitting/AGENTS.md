# services/neural-fitting

This file is authoritative for work in this directory and its subdirectories. Root
`AGENTS.md` is the coordinator's manual: read it for repository-wide workflow, dispatch,
and verification gates.

## Scope

This directory and its subdirectories. The issue's `Own` paths are binding; everything outside `Own` is read-only.

## Task rules

- Work only inside the issue's `Own` paths; everything outside `Own` is read-only.
- Code tasks never write under `docs/`. A doc gap becomes a `doc-gap` issue.
- Commit only your owned paths. Conventional Commits linking spec and issue (e.g. `Implements: FEAT-###`, `Fixes #<n>`). Never `git add -A`.
- Branch from `main` with `<class>/<issue-number>-<slug>` (e.g. `implement/12-feat-001-auth`), open a PR, never push to `main`.
- In code and tests, cite permanent spec anchors (`FEAT-###`, `NFR-###`, `EVT-###`, or `C-###`). Commits and PRs link the spec and the GitHub issue.
- Implement all states, schemas, and events assigned to your area; never leave stubbed states or skip declared non-happy paths.
- Never log or commit secrets, tokens, or unmasked identity; credentials live in the secret store.
- Document code inline with docstrings and comments on non-obvious logic; skip trivial comments. Never create ad-hoc markdown documentation files.
- Write lean unit tests for the behavior your issue names.
- If a contract is wrong or incomplete, report a change request; never deviate.
- Execute strictly against the assigned issue contract. Never modify files outside your owned paths. If feedback or findings uncover defects outside your scope, report back to the coordinator for triage rather than performing out-of-scope edits.
- Do not reinvent the wheel: prefer established, battle-tested ecosystem packages over bespoke implementations. Research standard libraries and agree with the user before adding or changing external dependencies.
- Packages and dependencies belong strictly in this area's manifest (pyproject.toml), never in `AGENTS.md`.
- If blocked, state the assumption or ask for clarification before proceeding.
- When a fact resists you, verify it with evidence before falling back on recall.
- User-facing copy reads as human-written.

## Discipline

- **Ephemeral RAM-Disk Photo Lifecycle & Zero-Disk-Leak:** Customer portrait uploads and intermediate segmentation tensors must be processed strictly within encrypted volatile RAM-disks (`tmpfs` / `/dev/shm`) with swap strictly disabled. Code must never write raw customer imagery, extracted body keypoints, or unmasked biometric tensors to persistent disk volumes or container root filesystems. All temporary memory structures, file descriptors, and scratch buffers must be cryptographically wiped or zeroed in a guaranteed `finally` cleanup block upon inference completion or error, and worker routines must enforce an absolute timeout time-to-live to guarantee complete eradication of ephemeral session artifacts.
- **Pinned Model Weights & Deterministic Pipelines:** Serverless Modal worker functions and PyTorch/Diffusers pipelines must load strictly immutable, version-pinned model weights and checkpoint digests defined in static configuration. Never download untagged `latest` weights or execute unpinned dynamic remote pulls at container startup. Pin random seeds, scheduler parameters, and inference precision modes (e.g., `torch.float16`) to guarantee reproducible garment draping and motion video generation across worker instances.
- **Automated Parametric Mannequin Fallback:** Inference dispatch handlers must wrap Modal worker execution in explicit circuit breakers with strict deadline timeouts. If worker cold-starts, queue delays, GPU memory exhaustion, or network partitions exceed latency bounds or trigger unrecoverable worker errors, the orchestrator must immediately downgrade execution to the deterministic 3D parametric mannequin rendering pipeline, returning a structured fallback payload rather than dropping connections or bubbling unhandled exceptions.
- **Deterministic Offline Synthetic Testing:** Unit and integration test suites executed via `pytest` must run completely offline without dispatching remote Modal calls, accessing live GPU hardware, or contacting external model registries. All worker stubs, diffusion runners, and geometry estimators must be tested against deterministic synthetic tensor fixtures, mock memory buffers, and fixed fixture responses.
- **Master Tailor Golden Benchmark & Verifier Separation:** Model evaluation harnesses and golden benchmark suites must remain strictly isolated from model generation logic and production worker entrypoints. Generation pipelines must never grade their own output or access evaluation ground truths. Benchmark runners must consume frozen reference datasets across diverse anatomical archetypes as read-only fixtures, asserting silhouette conformity, fabric drape realism, and video temporal stability through independent verification routines.

## Checks

- Test: `pytest`
- Lint: `ruff check . && ruff format --check .`

## Definition of Done

- All unit tests in this directory pass.
- Checks run cleanly with no unresolved stubs or TODOs.
