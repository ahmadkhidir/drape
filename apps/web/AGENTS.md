# apps/web

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
- Packages and dependencies belong strictly in this area's coordinating manifest, never in `AGENTS.md`.
- If blocked, state the assumption or ask for clarification before proceeding.
- When a fact resists you, verify it with evidence before falling back on recall.
- User-facing copy reads as human-written.

## Discipline

- **WebGPU Lifecycle, Context Recovery & Tiered Fallbacks:** Initialize WebGPU canvas contexts (`GPUCanvasContext`, `GPUDevice`) and Three.js renderers strictly inside client-side lifecycle hooks within client components. Inspect `navigator.gpu` availability at mount: when WebGPU is unavailable or device initialization fails, execute automatic graceful degradation to WebGL 2.0 compute/fragment shaders; if WebGL 2.0 is unsupported, downgrade to pre-rendered video loops and static editorial photography. Attach explicit event handlers for `device.lost` and WebGL context loss/restoration (`webglcontextlost`, `webglcontextrestored`) that cleanly release pipelines, buffers, textures, and bind groups, restoring interactive simulation state without a full page reload.
- **Hot-Path Physics Simulation & Allocation Zeroing:** Execute cloth physics particle integration and WGSL compute passes at a fixed simulation timestep decoupled from React UI re-renders and animation frame rates. Strictly prohibit dynamic heap allocations, object instantiations, closures, or array re-allocations inside hot animation frame loops (`requestAnimationFrame`); pre-allocate all vertex, uniform, and staging buffers upfront to eliminate garbage-collection stutter.
- **Design Token & Editorial Styling Fidelity:** Consume design tokens exclusively through configured Tailwind CSS utility classes and design system theme abstractions (color palettes, font scales, spacing, elevation shadows, and corner radii). Never hardcode raw hex codes, arbitrary pixel dimensions, or ad-hoc animation timing strings at call sites. Structure layouts mobile-first and enforce editorial visual rhythm through tokens.
- **Complete Screen State Coverage & Inclusive Accessibility:** Every route and interactive component must explicitly implement all applicable operational states: initial/empty, loading skeleton, success, validation error, submitting/disabled, and network/rendering failure. Maintain WCAG 2.2 Level AA compliance across all client surfaces by ensuring touch targets meet minimum accessible hit areas, preserving high-contrast keyboard focus indicators, attaching descriptive text alternatives and semantic fallback labels to 3D canvas viewports, and broadcasting dynamic asynchronous updates through polite ARIA live regions.
- **Web Audio Lifecycle, Autoplay & Ambient Muting:** Manage spatial and haptic audio synthesis through a singleton Web Audio `AudioContext` that initializes in a suspended state and resumes strictly in response to an explicit user interaction, adhering to browser autoplay policies. Honor user preferences, persistent audio toggles, and system reduced-motion flags immediately by muting audio output and suspending the audio graph. Disconnect and release all audio nodes and event listeners on component unmount to prevent audio thread memory leaks.

## Checks

- Build: `pnpm --filter @drape/web build`
- Test: `pnpm --filter @drape/web test`
- Lint: `pnpm --filter @drape/web lint`

## Definition of Done

- All unit tests in this directory pass.
- Checks run cleanly with no unresolved stubs or TODOs.
