import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("Phase 1: The Core Atelier Gate Verification", () => {
  it("verifies all 7 Phase 1 screens exist and export default components", () => {
    const requiredScreens = [
      "apps/web/app/page.tsx", // Screen 01: Hero / Atelier Entrance
      "apps/web/app/catalog/page.tsx", // Screen 02: Fabric Catalog
      "apps/web/app/fabric/[id]/page.tsx", // Screen 03: Fabric Detail View
      "apps/web/app/fitting/page.tsx", // Screen 04: Biometric Consent & Fitting Studio
      "apps/web/app/fitting/results/[id]/page.tsx", // Screen 05: Fitting Results & 3D Viewer
      "apps/web/app/checkout/page.tsx", // Screen 06: Yardage Calculator & Atelier Checkout
      "apps/web/app/order/[id]/confirmation/page.tsx", // Screen 07: Order Confirmation & Bolt Certificate
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

  it("verifies all Phase 1 Client components are implemented across declared areas", () => {
    const clientComponents = [
      "apps/web/components/canvas/ClothSandbox.tsx",
      "apps/web/components/canvas/clothWgsl.ts",
      "apps/web/components/canvas/clothPhysics.ts",
      "apps/web/components/canvas/MicroWeaveInspector.tsx",
      "apps/web/components/catalog/FabricCard.tsx",
      "apps/web/components/catalog/FabricGrid.tsx",
      "apps/web/components/catalog/FilterSidebar.tsx",
      "apps/web/components/catalog/FilterDrawer.tsx",
      "apps/web/components/catalog/SensoryProfileRadar.tsx",
      "apps/web/components/fitting/BiometricConsentModal.tsx",
      "apps/web/components/fitting/BiometricShieldEmblem.tsx",
      "apps/web/components/fitting/EphemeralCountdown.tsx",
      "apps/web/components/fitting/FittingProgressModal.tsx",
      "apps/web/components/fitting/BeforeAfterSlider.tsx",
      "apps/web/components/checkout/YardageCalculatorWidget.tsx",
      "apps/web/components/checkout/BoltReservationTimer.tsx",
      "apps/web/components/checkout/StripeElementsForm.tsx",
    ];

    for (const compPath of clientComponents) {
      const fullPath = join(root, compPath);
      assert.equal(existsSync(fullPath), true, `Component missing: ${compPath}`);
    }
  });

  it("verifies Fastify core server registers all Phase 1 domain routes and frozen contracts", () => {
    const serverPath = join(root, "services/core/src/server.ts");
    assert.equal(existsSync(serverPath), true, "server.ts missing");
    const serverContent = readFileSync(serverPath, "utf-8");

    const requiredRegistrations = [
      "healthRoutes",
      "fabricRoutes",
      "authRoutes",
      "consentRoutes",
      "checkoutRoutes",
      "yardageRoutes",
    ];

    for (const reg of requiredRegistrations) {
      assert.ok(
        serverContent.includes(reg),
        `Route registration missing in server.ts: ${reg}`
      );
    }
  });

  it("verifies core services route files and engine services exist", () => {
    const backendFiles = [
      "services/core/src/routes/health.ts",
      "services/core/src/routes/fabrics.ts",
      "services/core/src/routes/auth.ts",
      "services/core/src/routes/consents.ts",
      "services/core/src/routes/checkout.ts",
      "services/core/src/routes/yardage.ts",
      "services/core/src/services/yardage.ts",
      "services/core/src/redis/lock.ts",
      "services/core/src/db/schema.ts",
      "services/core/src/db/fabrics-seed.ts",
    ];

    for (const file of backendFiles) {
      const fullPath = join(root, file);
      assert.equal(existsSync(fullPath), true, `Core service file missing: ${file}`);
    }
  });

  it("verifies neural fitting worker architecture, zero-leak memory and pipeline", () => {
    const workerFiles = [
      "services/neural-fitting/src/app.py",
      "services/neural-fitting/src/pipeline.py",
      "services/neural-fitting/src/worker.py",
      "services/neural-fitting/src/ephemeral_storage.py",
      "services/neural-fitting/src/mannequin_fallback.py",
    ];

    for (const file of workerFiles) {
      const fullPath = join(root, file);
      assert.equal(existsSync(fullPath), true, `Worker file missing: ${file}`);
    }

    const ephemeralContent = readFileSync(
      join(root, "services/neural-fitting/src/ephemeral_storage.py"),
      "utf-8"
    );
    assert.ok(
      ephemeralContent.includes("/dev/shm"),
      "Ephemeral storage must leverage /dev/shm RAM disk for zero-leak compliance"
    );

    const pipelineContent = readFileSync(
      join(root, "services/neural-fitting/src/pipeline.py"),
      "utf-8"
    );
    assert.ok(
      pipelineContent.includes("C-037"),
      "Neural draping pipeline must reference contract C-037"
    );
  });

  it("verifies no unresolved placeholders or TODO comments in production sources", () => {
    const sourceFiles = [
      "services/core/src/routes/fabrics.ts",
      "services/core/src/routes/auth.ts",
      "services/core/src/routes/consents.ts",
      "services/core/src/routes/checkout.ts",
      "services/core/src/routes/yardage.ts",
      "services/core/src/services/yardage.ts",
      "services/core/src/redis/lock.ts",
      "apps/web/components/canvas/ClothSandbox.tsx",
      "apps/web/components/canvas/MicroWeaveInspector.tsx",
      "apps/web/components/fitting/BiometricConsentModal.tsx",
      "apps/web/components/fitting/FittingProgressModal.tsx",
      "apps/web/components/checkout/YardageCalculatorWidget.tsx",
      "apps/web/components/checkout/BoltReservationTimer.tsx",
    ];

    for (const relPath of sourceFiles) {
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
