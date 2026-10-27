# ADR-001: Technology stack and platform choices

- Status: Accepted
- Date: 2026-10-27

## Context

The specification defines the architectural, functional, and performance requirements for Drape. The technology stack, runtime, frameworks, and tooling were selected to fulfill these constraints and quality targets.

## Decision

The following stack and platform choices are adopted:

| Layer | Choice | Rationale |
|---|---|---|
| Topology | Separate repositories (`docs/Drape` specification repo, application monorepo) | Enforces absolute requirements isolation and prevents context pollution |
| Workspace Orchestration | pnpm workspaces + Turborepo | High-speed caching, strict dependency graph, efficient monorepo execution |
| Web Application (`apps/web`) | Next.js 15 (App Router, React 19, TypeScript) + Tailwind CSS | Server-side rendering, streaming, luxury editorial styling tokens |
| Graphics & Cloth Physics | Three.js + WebGPU WGSL shaders (WebGL 2.0 fallback) | Real-time 60 FPS interactive cloth manipulation directly in browser (FEAT-002, NFR-003) |
| Tactile Audio Engine | Web Audio API | Reactive haptic audio feedback for fabric drag and tactile interactions (FEAT-011) |
| Core Backend Service (`services/core`) | TypeScript (Node.js / Fastify) + Drizzle ORM | High-throughput async API, strict schema type-safety, light overhead |
| Relational Database | PostgreSQL 16+ | ACID transactional integrity for orders, fabric rolls, and audit logs |
| In-Memory Cache & Locks | Redis 7+ | 15-minute distributed bolt reservation locks, session management, rate limits |
| Payment Gateway | Stripe SDK | PCI-DSS SAQ-A compliant fractional yardage checkout and swatch box credits |
| Neural Fitting Service (`services/neural-fitting`) | Python 3.11+, Modal SDK, PyTorch / Diffusers | Elastic serverless GPU execution, ephemeral encrypted RAM-disk photo processing |
| Testing & Quality Verification | Vitest (`apps/web`, `services/core`), pytest (`services/neural-fitting`), Playwright E2E | Unified unit, component, integration, and golden benchmark test harness |

## Consequences

- Toolchains and package manifests are bootstrapped and pinned during Phase 0 (Foundation).
- Commands defined for build, test, and verification are wired into repo scripts/Makefile and CI/CD.
- Code written in subsequent roadmap phases must conform to these platform choices.
