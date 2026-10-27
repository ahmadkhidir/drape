import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("Phase 0: Foundation Gate Verification", () => {
  it("verifies all foundational manifests are present and valid", () => {
    const requiredManifests = [
      "package.json",
      "pnpm-workspace.yaml",
      "turbo.json",
      "apps/web/package.json",
      "services/core/package.json",
      "services/neural-fitting/pyproject.toml",
    ];

    for (const manifest of requiredManifests) {
      const fullPath = join(root, manifest);
      assert.equal(existsSync(fullPath), true, `Manifest missing: ${manifest}`);
    }
  });

  it("verifies all 10 foundational brand assets (A-001 through A-010) exist on disk", () => {
    const brandAssets = [
      "assets/brand/monogram.svg",
      "assets/brand/monogram-dark.svg",
      "assets/brand/monogram-gold.svg",
      "assets/brand/app-icon.png",
      "assets/brand/favicon.ico",
      "assets/brand/favicon.svg",
      "assets/brand/lockup-horizontal.svg",
      "assets/brand/lockup-horizontal-dark.svg",
      "assets/brand/wordmark.svg",
      "assets/brand/wordmark-dark.svg",
    ];

    for (const asset of brandAssets) {
      const fullPath = join(root, asset);
      assert.equal(existsSync(fullPath), true, `Brand asset missing: ${asset}`);
    }
  });

  it("verifies ASSETS.md ledger reflects Done for foundational slots", () => {
    const assetsMd = readFileSync(join(root, "ASSETS.md"), "utf-8");
    for (let i = 1; i <= 10; i++) {
      const slot = `A-${String(i).padStart(3, "0")}`;
      assert.equal(assetsMd.includes(`| ${slot} |`), true);
      const row = assetsMd.split("\n").find((line) => line.includes(`| ${slot} |`));
      assert.ok(row, `Slot ${slot} not found in ASSETS.md`);
      assert.equal(row.includes("Done"), true, `Slot ${slot} not marked Done`);
    }
  });

  it("verifies CI/CD pipeline workflow configuration", () => {
    const ciPath = join(root, ".github/workflows/ci.yml");
    assert.equal(existsSync(ciPath), true, "ci.yml missing");
    const ciContent = readFileSync(ciPath, "utf-8");
    assert.equal(ciContent.includes("lint:"), true);
    assert.equal(ciContent.includes("build:"), true);
    assert.equal(ciContent.includes("test:"), true);
  });

  it("verifies core domain components in services/core", () => {
    assert.equal(existsSync(join(root, "services/core/src/server.ts")), true);
    assert.equal(existsSync(join(root, "services/core/src/routes/health.ts")), true);
    assert.equal(existsSync(join(root, "services/core/src/redis/lock.ts")), true);
    assert.equal(existsSync(join(root, "services/core/src/db/schema.ts")), true);
  });

  it("verifies web client foundations in apps/web", () => {
    assert.equal(existsSync(join(root, "apps/web/app/page.tsx")), true);
    assert.equal(existsSync(join(root, "apps/web/lib/tokens.ts")), true);
    assert.equal(existsSync(join(root, "apps/web/components/canvas/ClothSandboxBoot.tsx")), true);
  });

  it("verifies neural fitting worker foundations in services/neural-fitting", () => {
    assert.equal(existsSync(join(root, "services/neural-fitting/src/app.py")), true);
    assert.equal(existsSync(join(root, "services/neural-fitting/src/ephemeral_storage.py")), true);
    assert.equal(existsSync(join(root, "services/neural-fitting/src/mannequin_fallback.py")), true);
  });
});
