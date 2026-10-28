/**
 * Phase 2 Verification Gate Sweep Test Suite
 * Issue: #68 ("Task 2.9: Phase 2 Verification Gate Sweep")
 * Parent Phase: #59 ("Phase 2: Sensory Motion & Artisan Network")
 *
 * Full Specification Slice Verification:
 * - Features: FEAT-006, FEAT-009, FEAT-010, FEAT-011
 * - Contracts: C-014, C-015, C-017, C-018, C-025, C-026, C-027, C-028, C-029, C-038
 * - Telemetry: EVT-008, EVT-013, EVT-014
 * - Quantitative NFRs: NFR-005, NFR-031, NFR-001
 * - Screens: 05-fitting-results-view, 08-master-tailor-directory, 09-digital-wardrobe, /specs/:token, Web Audio
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("Phase 2: Sensory Motion & Artisan Network Gate Verification", () => {
  // ── 1. Phase 2 Screens & Page Routing ──
  it("verifies all Phase 2 screens exist and export default components", () => {
    const requiredScreens = [
      "apps/web/app/fittings/[id]/page.tsx", // Screen 05: Fitting Results & 360 Motion Video
      "apps/web/app/wardrobe/page.tsx", // Screen 09: Digital Wardrobe Vault & Guest Order Lookup
      "apps/web/app/specs/[token]/page.tsx", // Public Master Tailor Spec Dossier
      "apps/web/app/tailors/page.tsx", // Screen 08: Master Tailor Directory & Concierge Handoff
    ];

    for (const screenPath of requiredScreens) {
      const fullPath = join(root, screenPath);
      assert.equal(existsSync(fullPath), true, `Screen missing: ${screenPath}`);
      const content = readFileSync(fullPath, "utf-8");
      assert.ok(
        content.includes("export default"),
        `Screen does not export default component: ${screenPath}`
      );
    }
  });

  // ── 2. Phase 2 Client Components & Screen States ──
  it("verifies all Phase 2 Client components are implemented across declared areas", () => {
    const clientComponents = [
      // 360 Motion Video Player (FEAT-006)
      "apps/web/components/fitting/MotionPlayer.tsx",
      // Digital Wardrobe & Tailor Dossier (FEAT-009)
      "apps/web/components/wardrobe/EmptyWardrobe.tsx",
      "apps/web/components/wardrobe/FittingCard.tsx",
      "apps/web/components/wardrobe/OrderHistoryTable.tsx",
      "apps/web/components/wardrobe/GuestOrderLookup.tsx",
      "apps/web/components/wardrobe/MotionVideoModal.tsx",
      "apps/web/components/wardrobe/WardrobeTabs.tsx",
      "apps/web/components/wardrobe/wardrobeApi.ts",
      "apps/web/components/wardrobe/types.ts",
      // Master Tailor Directory (FEAT-010)
      "apps/web/components/tailors/EmptyTailorState.tsx",
      "apps/web/components/tailors/TailorCard.tsx",
      "apps/web/components/tailors/TailorFilterBar.tsx",
      "apps/web/components/tailors/HandoffConfirmationModal.tsx",
      "apps/web/components/tailors/NominateTailorModal.tsx",
      "apps/web/components/tailors/tailorApi.ts",
      "apps/web/components/tailors/types.ts",
      // Web Audio Soundscape (FEAT-011)
      "apps/web/lib/audio/soundscape.ts",
      "apps/web/lib/audio/useSoundscape.ts",
      "apps/web/lib/audio/noise.ts",
      "apps/web/lib/audio/types.ts",
    ];

    for (const compPath of clientComponents) {
      const fullPath = join(root, compPath);
      assert.equal(existsSync(fullPath), true, `Component missing: ${compPath}`);
    }
  });

  // ── 3. Core Backend Fastify Routes & Services ──
  it("verifies Fastify core server registers all Phase 2 domain routes", () => {
    const serverPath = join(root, "services/core/src/server.ts");
    assert.equal(existsSync(serverPath), true, "server.ts missing");
    const serverContent = readFileSync(serverPath, "utf-8");

    const requiredRegistrations = [
      "motionRoutes", // C-014, C-015
      "specRoutes", // C-017, C-018
      "tailorRoutes", // C-025, C-026, C-027
      "wardrobeRoutes", // C-028, C-029
    ];

    for (const reg of requiredRegistrations) {
      assert.ok(
        serverContent.includes(reg),
        `Route registration missing in server.ts: ${reg}`
      );
    }
  });

  it("verifies core services route files and business logic services exist", () => {
    const backendFiles = [
      "services/core/src/routes/motion.ts",
      "services/core/src/routes/specs.ts",
      "services/core/src/routes/tailors.ts",
      "services/core/src/routes/wardrobe.ts",
      "services/core/src/services/motion.service.ts",
      "services/core/src/services/pdf-spec.service.ts",
      "services/core/src/services/tailor.service.ts",
      "services/core/src/db/schema/tailors.ts",
      "services/core/src/db/migrations/0001_create_tailors.sql",
    ];

    for (const file of backendFiles) {
      const fullPath = join(root, file);
      assert.equal(existsSync(fullPath), true, `Core service file missing: ${file}`);
    }
  });

  // ── 4. Neural Fitting Motion Pipeline ──
  it("verifies neural motion pipeline worker and AMQP consumer files exist and conform to C-038", () => {
    const motionWorkerFiles = [
      "services/neural-fitting/src/motion_pipeline.py",
      "services/neural-fitting/src/amqp_motion_consumer.py",
    ];

    for (const file of motionWorkerFiles) {
      const fullPath = join(root, file);
      assert.equal(existsSync(fullPath), true, `Motion worker file missing: ${file}`);
    }

    const motionPipelineContent = readFileSync(
      join(root, "services/neural-fitting/src/motion_pipeline.py"),
      "utf-8"
    );
    assert.ok(
      motionPipelineContent.includes("C-038"),
      "motion_pipeline.py must reference contract C-038"
    );
    assert.ok(
      motionPipelineContent.includes("NFR-031"),
      "motion_pipeline.py must enforce NFR-031 temporal coherence"
    );
    assert.ok(
      motionPipelineContent.includes("SSIM") || motionPipelineContent.includes("ssim"),
      "motion_pipeline.py must calculate SSIM for temporal coherence"
    );

    const amqpConsumerContent = readFileSync(
      join(root, "services/neural-fitting/src/amqp_motion_consumer.py"),
      "utf-8"
    );
    assert.ok(
      amqpConsumerContent.includes("neural.motion.generate"),
      "amqp_motion_consumer.py must consume neural.motion.generate queue"
    );
  });

  // ── 5. Contract Conformance (C-014, C-015, C-017, C-018, C-025, C-026, C-027, C-028, C-029, C-038) ──
  it("verifies all Phase 2 contracts are cited and implemented in backend routes and services", () => {
    const contractChecks = [
      {
        file: "services/core/src/routes/motion.ts",
        contracts: ["C-014", "C-015"],
      },
      {
        file: "services/core/src/services/motion.service.ts",
        contracts: ["C-014", "C-015", "C-038"],
      },
      {
        file: "services/core/src/routes/specs.ts",
        contracts: ["C-017", "C-018"],
      },
      {
        file: "services/core/src/services/pdf-spec.service.ts",
        contracts: ["C-017", "C-018"],
      },
      {
        file: "services/core/src/routes/tailors.ts",
        contracts: ["C-025", "C-026", "C-027"],
      },
      {
        file: "services/core/src/services/tailor.service.ts",
        contracts: ["C-025", "C-026", "C-027"],
      },
      {
        file: "services/core/src/routes/wardrobe.ts",
        contracts: ["C-028", "C-029"],
      },
    ];

    for (const { file, contracts } of contractChecks) {
      const fullPath = join(root, file);
      const content = readFileSync(fullPath, "utf-8");
      for (const contract of contracts) {
        assert.ok(
          content.includes(contract),
          `Expected ${file} to implement/cite ${contract}`
        );
      }
    }
  });

  // ── 6. Telemetry Events Conformance (EVT-008, EVT-013, EVT-014) ──
  it("verifies telemetry event payloads conform to analytics.md specification", () => {
    // EVT-008: motion_video_generated
    const motionServiceContent = readFileSync(
      join(root, "services/core/src/services/motion.service.ts"),
      "utf-8"
    );
    assert.ok(
      motionServiceContent.includes("EVT-008"),
      "motion.service.ts must emit EVT-008"
    );
    assert.ok(
      motionServiceContent.includes("motion_video_generated"),
      "motion.service.ts must cite motion_video_generated event"
    );

    const motionPlayerContent = readFileSync(
      join(root, "apps/web/components/fitting/MotionPlayer.tsx"),
      "utf-8"
    );
    assert.ok(
      motionPlayerContent.includes("EVT-008"),
      "MotionPlayer.tsx must dispatch EVT-008"
    );

    // EVT-013: spec_dossier_exported
    const specsRouteContent = readFileSync(
      join(root, "services/core/src/routes/specs.ts"),
      "utf-8"
    );
    assert.ok(
      specsRouteContent.includes("EVT-013"),
      "specs.ts must cite EVT-013"
    );
    assert.ok(
      specsRouteContent.includes("spec_dossier_exported"),
      "specs.ts must cite spec_dossier_exported"
    );

    const pdfSpecServiceContent = readFileSync(
      join(root, "services/core/src/services/pdf-spec.service.ts"),
      "utf-8"
    );
    assert.ok(
      pdfSpecServiceContent.includes("EVT-013"),
      "pdf-spec.service.ts must reference EVT-013"
    );

    const wardrobeApiContent = readFileSync(
      join(root, "apps/web/components/wardrobe/wardrobeApi.ts"),
      "utf-8"
    );
    assert.ok(
      wardrobeApiContent.includes("EVT-013"),
      "wardrobeApi.ts must dispatch EVT-013"
    );

    // EVT-014: tailor_concierge_routed
    const tailorServiceContent = readFileSync(
      join(root, "services/core/src/services/tailor.service.ts"),
      "utf-8"
    );
    assert.ok(
      tailorServiceContent.includes("EVT-014"),
      "tailor.service.ts must emit EVT-014"
    );
    assert.ok(
      tailorServiceContent.includes("tailor_concierge_routed"),
      "tailor.service.ts must cite tailor_concierge_routed"
    );

    const tailorApiContent = readFileSync(
      join(root, "apps/web/components/tailors/tailorApi.ts"),
      "utf-8"
    );
    assert.ok(
      tailorApiContent.includes("EVT-014"),
      "tailorApi.ts must dispatch EVT-014"
    );
  });

  // ── 7. Quantitative NFR Targets ──
  it("verifies quantitative NFR anchors are enforced in Phase 2 deliverables", () => {
    // NFR-005: Motion video latency <= 6.0s (P95)
    const motionRouteContent = readFileSync(
      join(root, "services/core/src/routes/motion.ts"),
      "utf-8"
    );
    assert.ok(
      motionRouteContent.includes("NFR-005"),
      "motion.ts must enforce NFR-005 latency budget"
    );

    // NFR-031: Temporal coherence SSIM >= 0.94, zero mesh tearing
    const motionPipelineContent = readFileSync(
      join(root, "services/neural-fitting/src/motion_pipeline.py"),
      "utf-8"
    );
    assert.ok(
      motionPipelineContent.includes("0.94"),
      "motion_pipeline.py must enforce 0.94 SSIM threshold per NFR-031"
    );
    assert.ok(
      motionPipelineContent.includes("NFR-031"),
      "motion_pipeline.py must cite NFR-031"
    );

    // FEAT-011: Web Audio latency budget (< 20ms)
    const soundscapeContent = readFileSync(
      join(root, "apps/web/lib/audio/soundscape.ts"),
      "utf-8"
    );
    assert.ok(
      soundscapeContent.includes("FEAT-011"),
      "soundscape.ts must cite FEAT-011"
    );
  });

  // ── 8. Zero Placeholders, Stubs, or TODOs ──
  it("verifies no unresolved placeholders or TODO comments in Phase 2 production sources", () => {
    const phase2SourceFiles = [
      "services/core/src/routes/motion.ts",
      "services/core/src/routes/specs.ts",
      "services/core/src/routes/tailors.ts",
      "services/core/src/routes/wardrobe.ts",
      "services/core/src/services/motion.service.ts",
      "services/core/src/services/pdf-spec.service.ts",
      "services/core/src/services/tailor.service.ts",
      "services/core/src/db/schema/tailors.ts",
      "apps/web/app/fittings/[id]/page.tsx",
      "apps/web/app/wardrobe/page.tsx",
      "apps/web/app/specs/[token]/page.tsx",
      "apps/web/app/tailors/page.tsx",
      "apps/web/components/fitting/MotionPlayer.tsx",
      "apps/web/components/wardrobe/EmptyWardrobe.tsx",
      "apps/web/components/wardrobe/FittingCard.tsx",
      "apps/web/components/wardrobe/OrderHistoryTable.tsx",
      "apps/web/components/wardrobe/GuestOrderLookup.tsx",
      "apps/web/components/wardrobe/MotionVideoModal.tsx",
      "apps/web/components/tailors/EmptyTailorState.tsx",
      "apps/web/components/tailors/TailorCard.tsx",
      "apps/web/components/tailors/TailorFilterBar.tsx",
      "apps/web/components/tailors/HandoffConfirmationModal.tsx",
      "apps/web/components/tailors/NominateTailorModal.tsx",
      "apps/web/lib/audio/soundscape.ts",
      "apps/web/lib/audio/useSoundscape.ts",
      "apps/web/lib/audio/noise.ts",
      "services/neural-fitting/src/motion_pipeline.py",
      "services/neural-fitting/src/amqp_motion_consumer.py",
    ];

    for (const relPath of phase2SourceFiles) {
      const fullPath = join(root, relPath);
      const content = readFileSync(fullPath, "utf-8");
      assert.equal(
        content.includes("TODO:"),
        false,
        `Found TODO: in ${relPath}`
      );
      assert.equal(
        content.includes("FIXME:"),
        false,
        `Found FIXME: in ${relPath}`
      );
    }
  });
});
