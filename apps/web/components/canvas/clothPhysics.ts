/**
 * Zero-Allocation Verlet Cloth Physics Engine
 * Permanent Spec Anchors: FEAT-002, NFR-003, Discipline Rule 2
 *
 * Implements a fixed-timestep particle-grid simulation calibrated by physical
 * textile parameters (GSM mass density, bending stiffness, tensile elasticity,
 * and air damping).
 *
 * Strictly zero heap allocations inside the hot integration loop (requestAnimationFrame).
 */

import { GravityPreset, PhysicsMatrix } from './types';

export interface ClothGridConfig {
  gridX: number; // number of particles along X
  gridY: number; // number of particles along Y
  spacing: number; // rest distance between adjacent particles
  physicsMatrix: PhysicsMatrix;
  pinMode?: 'atelier_dual' | 'corners_and_center';
}

export class VerletClothEngine {
  public readonly gridX: number;
  public readonly gridY: number;
  public readonly particleCount: number;
  public readonly spacing: number;
  public readonly pinMode: 'atelier_dual' | 'corners_and_center';

  // Zero-allocation pre-allocated typed buffers
  public readonly positions: Float32Array; // x, y, z per particle [N * 3]
  public readonly prevPositions: Float32Array; // x, y, z per particle [N * 3]
  public readonly accelerations: Float32Array; // x, y, z per particle [N * 3]
  public readonly normals: Float32Array; // normal nx, ny, nz per particle [N * 3]
  public readonly uvs: Float32Array; // u, v per particle [N * 2]
  public readonly pinned: Uint8Array; // 1 = pinned, 0 = free [N]

  // Pre-allocated constraint lists (Structural, Shear, Bending)
  public readonly constraintCount: number;
  public readonly constraintA: Int32Array;
  public readonly constraintB: Int32Array;
  public readonly restDistances: Float32Array;
  public readonly constraintType: Uint8Array; // 0: structural, 1: shear, 2: bending

  // Mesh triangle index buffer
  public readonly indices: Uint16Array;
  public readonly indexCount: number;

  // Calibrated physics matrix
  private massDensity: number;
  private bendingStiffness: number;
  private tensileElasticity: number;
  private airDamping: number;
  private gravityX: number;
  private gravityY: number;
  private gravityZ: number;

  // Interaction state
  private grabbedIndex: number = -1;
  private grabbedTargetX: number = 0;
  private grabbedTargetY: number = 0;
  private grabbedTargetZ: number = 0;
  private isInteracting: boolean = false;
  // Soft-radius pinch cluster buffers (zero-allocation)
  private readonly maxGrabbedCluster: number = 64;
  public grabbedClusterCount: number = 0;
  public readonly grabbedClusterIndices: Int32Array;
  public readonly grabbedClusterWeights: Float32Array;
  public readonly grabbedClusterOffsetsX: Float32Array;
  public readonly grabbedClusterOffsetsY: Float32Array;
  public readonly grabbedClusterOffsetsZ: Float32Array;
  // Anchor distance matrices for taut inextensibility clamping
  public readonly minAnchorDist: Float32Array;
  public readonly nearestAnchorIdx: Int32Array;

  private gravityPreset: GravityPreset = 'drape';
  private elapsedTime: number = 0;

  // Fixed timestep accumulator
  private readonly fixedTimestep: number = 1 / 60; // 60 FPS target
  private accumulator: number = 0;

  // Scratch variables for zero-allocation math
  private _dx: number = 0;
  private _dy: number = 0;
  private _dz: number = 0;
  private _dist: number = 0;
  private _diff: number = 0;
  private _norm: number = 0;

  constructor(config: ClothGridConfig) {
    this.gridX = config.gridX;
    this.gridY = config.gridY;
    this.spacing = config.spacing;
    this.pinMode = config.pinMode || 'corners_and_center'
    this.particleCount = this.gridX * this.gridY;

    // Allocate continuous typed arrays
    this.positions = new Float32Array(this.particleCount * 3);
    this.prevPositions = new Float32Array(this.particleCount * 3);
    this.accelerations = new Float32Array(this.particleCount * 3);
    this.normals = new Float32Array(this.particleCount * 3);
    this.uvs = new Float32Array(this.particleCount * 2);
    this.pinned = new Uint8Array(this.particleCount);
    this.grabbedClusterIndices = new Int32Array(this.maxGrabbedCluster);
    this.grabbedClusterWeights = new Float32Array(this.maxGrabbedCluster);
    this.grabbedClusterOffsetsX = new Float32Array(this.maxGrabbedCluster);
    this.grabbedClusterOffsetsY = new Float32Array(this.maxGrabbedCluster);
    this.grabbedClusterOffsetsZ = new Float32Array(this.maxGrabbedCluster);
    this.minAnchorDist = new Float32Array(this.particleCount);
    this.nearestAnchorIdx = new Int32Array(this.particleCount);


    // Initialize physical properties from C-009 physicsMatrix
    this.massDensity = Math.max(0.05, config.physicsMatrix.massDensity || 0.28);
    this.bendingStiffness = config.physicsMatrix.bendingStiffness ?? 3.5;
    this.tensileElasticity = config.physicsMatrix.tensileElasticity ?? 0.85;
    this.airDamping = config.physicsMatrix.airDamping ?? 0.04;
    this.gravityX = config.physicsMatrix.gravityVector?.[0] ?? 0;
    this.gravityY = config.physicsMatrix.gravityVector?.[1] ?? -9.8;
    this.gravityZ = config.physicsMatrix.gravityVector?.[2] ?? 0;

    // Count constraints
    // Structural: (gx - 1)*gy + (gy - 1)*gx
    const structuralCount = (this.gridX - 1) * this.gridY + (this.gridY - 1) * this.gridX;
    // Shear: 2 * (gx - 1) * (gy - 1)
    const shearCount = 2 * (this.gridX - 1) * (this.gridY - 1);
    // Bending: (gx - 2)*gy + (gy - 2)*gx
    const bendingCount = Math.max(0, (this.gridX - 2) * this.gridY) + Math.max(0, (this.gridY - 2) * this.gridX);

    this.constraintCount = structuralCount + shearCount + bendingCount;
    this.constraintA = new Int32Array(this.constraintCount);
    this.constraintB = new Int32Array(this.constraintCount);
    this.restDistances = new Float32Array(this.constraintCount);
    this.constraintType = new Uint8Array(this.constraintCount);

    // Count triangle indices: 2 triangles per cell, 3 indices per triangle
    const quadCount = (this.gridX - 1) * (this.gridY - 1);
    this.indexCount = quadCount * 6;
    this.indices = new Uint16Array(this.indexCount);

    this.initGridGeometry();
    this.initConstraints();
    this.initTriangles();
    this.computeNormals();
    this.initAnchorDistances();
  }

  /**
   * Initializes initial planar positions and UV coordinates for the cloth swatch.
   */

  /**
   * Precomputes shortest geodesic rest distance from each particle to nearest anchor point.
   * Used to clamp drag target positions so cloth pulls taut firmly without stretching like rubber.
   */
  private initAnchorDistances(): void {
    const pinnedIndices: number[] = [];
    for (let i = 0; i < this.particleCount; i++) {
      if (this.pinned[i] === 1) {
        pinnedIndices.push(i);
      }
    }

    if (pinnedIndices.length === 0) {
      this.minAnchorDist.fill(100.0);
      this.nearestAnchorIdx.fill(-1);
      return;
    }

    for (let i = 0; i < this.particleCount; i++) {
      const ix = i % this.gridX;
      const iy = Math.floor(i / this.gridX);

      let minDist = Infinity;
      let nearestAnchor = pinnedIndices[0];

      for (const p of pinnedIndices) {
        const px = p % this.gridX;
        const py = Math.floor(p / this.gridX);
        const dist = Math.hypot((ix - px) * this.spacing, (iy - py) * this.spacing);
        if (dist < minDist) {
          minDist = dist;
          nearestAnchor = p;
        }
      }

      this.minAnchorDist[i] = minDist;
      this.nearestAnchorIdx[i] = nearestAnchor;
    }
  }
  private initGridGeometry(): void {
    const halfWidth = ((this.gridX - 1) * this.spacing) / 2;
    const halfHeight = ((this.gridY - 1) * this.spacing) / 2;

    for (let y = 0; y < this.gridY; y++) {
      for (let x = 0; x < this.gridX; x++) {
        const idx = y * this.gridX + x;
        const pIdx = idx * 3;
        const uvIdx = idx * 2;

        const posX = x * this.spacing - halfWidth;
        const posY = halfHeight - y * this.spacing;
        const posZ = 0.0;

        this.positions[pIdx] = posX;
        this.positions[pIdx + 1] = posY;
        this.positions[pIdx + 2] = posZ;

        this.prevPositions[pIdx] = posX;
        this.prevPositions[pIdx + 1] = posY;
        this.prevPositions[pIdx + 2] = posZ;

        this.accelerations[pIdx] = 0;
        this.accelerations[pIdx + 1] = 0;
        this.accelerations[pIdx + 2] = 0;

        this.uvs[uvIdx] = x / (this.gridX - 1);
        this.uvs[uvIdx + 1] = 1 - y / (this.gridY - 1);

        // Pin suspension points based on pinMode
        if (this.pinMode === 'atelier_dual') {
          const pinLeft = Math.round(this.gridX * 0.22);
          const pinRight = Math.round(this.gridX * 0.78);
          // Realistic atelier clamp: pin a realistic support width (small radius of 3 particles) along top edge
          const isLeftClamp = Math.abs(x - pinLeft) <= 1 && y === 0;
          const isRightClamp = Math.abs(x - pinRight) <= 1 && y === 0;
          if (isLeftClamp || isRightClamp) {
            this.pinned[idx] = 1;
          } else {
            this.pinned[idx] = 0;
          }
        } else {
          if (y === 0 && (x === 0 || x === this.gridX - 1 || x === Math.floor(this.gridX / 2))) {
            this.pinned[idx] = 1;
          } else {
            this.pinned[idx] = 0;
          }
        }
      }
    }
  }

  /**
   * Constructs structural, shear, and bending (flexion) constraints.
   */
  private initConstraints(): void {
    let cIdx = 0;

    // 1. Structural horizontal constraints
    for (let y = 0; y < this.gridY; y++) {
      for (let x = 0; x < this.gridX - 1; x++) {
        const a = y * this.gridX + x;
        const b = y * this.gridX + (x + 1);
        this.addConstraint(cIdx++, a, b, this.spacing, 0);
      }
    }

    // 2. Structural vertical constraints
    for (let y = 0; y < this.gridY - 1; y++) {
      for (let x = 0; x < this.gridX; x++) {
        const a = y * this.gridX + x;
        const b = (y + 1) * this.gridX + x;
        this.addConstraint(cIdx++, a, b, this.spacing, 0);
      }
    }

    // 3. Shear diagonal constraints
    const diagonalDist = Math.SQRT2 * this.spacing;
    for (let y = 0; y < this.gridY - 1; y++) {
      for (let x = 0; x < this.gridX - 1; x++) {
        const a = y * this.gridX + x;
        const b = (y + 1) * this.gridX + (x + 1);
        this.addConstraint(cIdx++, a, b, diagonalDist, 1);

        const c = y * this.gridX + (x + 1);
        const d = (y + 1) * this.gridX + x;
        this.addConstraint(cIdx++, c, d, diagonalDist, 1);
      }
    }

    // 4. Bending constraints (2-hop neighbors)
    const doubleDist = this.spacing * 2;
    for (let y = 0; y < this.gridY; y++) {
      for (let x = 0; x < this.gridX - 2; x++) {
        const a = y * this.gridX + x;
        const b = y * this.gridX + (x + 2);
        this.addConstraint(cIdx++, a, b, doubleDist, 2);
      }
    }
    for (let y = 0; y < this.gridY - 2; y++) {
      for (let x = 0; x < this.gridX; x++) {
        const a = y * this.gridX + x;
        const b = (y + 2) * this.gridX + x;
        this.addConstraint(cIdx++, a, b, doubleDist, 2);
      }
    }
  }

  private addConstraint(
    index: number,
    a: number,
    b: number,
    restDist: number,
    type: number
  ): void {
    this.constraintA[index] = a;
    this.constraintB[index] = b;
    this.restDistances[index] = restDist;
    this.constraintType[index] = type;
  }

  /**
   * Initializes triangle vertex indices for mesh rendering.
   */
  private initTriangles(): void {
    let tIdx = 0;
    for (let y = 0; y < this.gridY - 1; y++) {
      for (let x = 0; x < this.gridX - 1; x++) {
        const topLeft = y * this.gridX + x;
        const topRight = topLeft + 1;
        const bottomLeft = (y + 1) * this.gridX + x;
        const bottomRight = bottomLeft + 1;

        // Triangle 1
        this.indices[tIdx++] = topLeft;
        this.indices[tIdx++] = bottomLeft;
        this.indices[tIdx++] = topRight;

        // Triangle 2
        this.indices[tIdx++] = topRight;
        this.indices[tIdx++] = bottomLeft;
        this.indices[tIdx++] = bottomRight;
      }
    }
  }

  /**
   * Sets physical matrix parameters dynamically.
   */
  public updatePhysicsMatrix(matrix: Partial<PhysicsMatrix>): void {
    if (matrix.massDensity !== undefined) {
      this.massDensity = Math.max(0.05, matrix.massDensity);
    }
    if (matrix.bendingStiffness !== undefined) {
      this.bendingStiffness = matrix.bendingStiffness;
    }
    if (matrix.tensileElasticity !== undefined) {
      this.tensileElasticity = matrix.tensileElasticity;
    }
    if (matrix.airDamping !== undefined) {
      this.airDamping = matrix.airDamping;
    }
    if (matrix.gravityVector !== undefined) {
      this.gravityX = matrix.gravityVector[0];
      this.gravityY = matrix.gravityVector[1];
      this.gravityZ = matrix.gravityVector[2];
    }
  }

  /**
   * Switches gravity preset: "breeze", "drape", or "drop".
   */
  public setGravityPreset(preset: GravityPreset): void {
    this.gravityPreset = preset;
    if (preset === 'breeze') {
      this.gravityY = -2.5;
    } else if (preset === 'drape') {
      this.gravityY = -9.8;
    } else if (preset === 'drop') {
      this.gravityY = -18.0;
    }
  }

  public getGravityPreset(): GravityPreset {
    return this.gravityPreset;
  }

  /**
   * Grab nearest particle at world coordinates, and bind a soft pinch cluster
   * within a small radius so dragged fabric moves as an authentic folded patch
   * instead of a sharp needle spike.
   */
  public grab(worldX: number, worldY: number, radius: number = 0.38): number {
    let closestIdx = -1;
    let minSqDist = radius * radius;

    for (let i = 0; i < this.particleCount; i++) {
      const pIdx = i * 3;
      const dx = this.positions[pIdx] - worldX;
      const dy = this.positions[pIdx + 1] - worldY;
      const sqDist = dx * dx + dy * dy;

      if (sqDist < minSqDist) {
        minSqDist = sqDist;
        closestIdx = i;
      }
    }

    if (closestIdx !== -1) {
      this.grabbedIndex = closestIdx;
      this.grabbedTargetX = worldX;
      this.grabbedTargetY = worldY;
      this.grabbedTargetZ = this.positions[closestIdx * 3 + 2];
      this.isInteracting = true;

      // Populate soft-radius cluster around the pinch center
      this.grabbedClusterCount = 0;
      const pinchRadius = Math.max(radius, this.spacing * 2.5);
      const rSq = pinchRadius * pinchRadius;

      for (let i = 0; i < this.particleCount; i++) {
        if (this.pinned[i] === 1) continue;

        const pIdx = i * 3;
        const dx = this.positions[pIdx] - worldX;
        const dy = this.positions[pIdx + 1] - worldY;
        const sqDist = dx * dx + dy * dy;

        if (sqDist <= rSq && this.grabbedClusterCount < this.maxGrabbedCluster) {
          const cIdx = this.grabbedClusterCount++;
          const dist = Math.sqrt(sqDist);
          // Smooth cosine falloff from 1.0 (center) to 0.0 (edge of radius)
          const normDist = dist / pinchRadius;
          const weight = 0.5 * (1 + Math.cos(normDist * Math.PI));

          this.grabbedClusterIndices[cIdx] = i;
          this.grabbedClusterWeights[cIdx] = weight;
          this.grabbedClusterOffsetsX[cIdx] = this.positions[pIdx] - worldX;
          this.grabbedClusterOffsetsY[cIdx] = this.positions[pIdx + 1] - worldY;
          this.grabbedClusterOffsetsZ[cIdx] = this.positions[pIdx + 2] - this.grabbedTargetZ;
        }
      }
    }

    return closestIdx;
  }

  /**
   * Update position of grabbed particle cluster.
   * Clamps target displacement against the nearest anchor rest length to ensure
   * the fabric pulls taut with clean tension folds and CANNOT stretch like rubber.
   */
  public drag(worldX: number, worldY: number, worldZ: number = 0): void {
    if (this.grabbedIndex !== -1) {
      let targetX = worldX;
      let targetY = worldY;
      let targetZ = worldZ;

      // Inextensibility enforcement: prevent stretching like rubber from anchors
      const anchor = this.nearestAnchorIdx[this.grabbedIndex];
      if (anchor !== -1) {
        const aIdx = anchor * 3;
        const anchorX = this.positions[aIdx];
        const anchorY = this.positions[aIdx + 1];
        const anchorZ = this.positions[aIdx + 2];

        const dx = targetX - anchorX;
        const dy = targetY - anchorY;
        const dz = targetZ - anchorZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Allow at most 3% tensile extension beyond rest path length from anchor
        const maxAllowed = Math.max(this.spacing, this.minAnchorDist[this.grabbedIndex] * 1.03);
        if (dist > maxAllowed && dist > 0.0001) {
          const scale = maxAllowed / dist;
          targetX = anchorX + dx * scale;
          targetY = anchorY + dy * scale;
          targetZ = anchorZ + dz * scale;
        }
      }

      this.grabbedTargetX = targetX;
      this.grabbedTargetY = targetY;
      this.grabbedTargetZ = targetZ;
    }
  }

  /**
   * Imparts a directional ripple/wave velocity impulse across neighbor particles.
   */
  public applyRipple(
    worldX: number,
    worldY: number,
    impulseX: number,
    impulseY: number,
    impulseZ: number,
    radius: number = 0.8
  ): void {
    const rSq = radius * radius;
    for (let i = 0; i < this.particleCount; i++) {
      const pIdx = i * 3;
      const dx = this.positions[pIdx] - worldX;
      const dy = this.positions[pIdx + 1] - worldY;
      const sqDist = dx * dx + dy * dy;

      if (sqDist < rSq) {
        const falloff = 1 - Math.sqrt(sqDist) / radius;
        this.accelerations[pIdx] += impulseX * falloff;
        this.accelerations[pIdx + 1] += impulseY * falloff;
        this.accelerations[pIdx + 2] += impulseZ * falloff;
      }
    }
  }

  /**
   * Releases active grab, allowing gravitational relaxation.
   */
  public release(): void {
    if (this.grabbedIndex !== -1) {
      const pIdx = this.grabbedIndex * 3;
      this.accelerations[pIdx] = 0;
      this.accelerations[pIdx + 1] = 0;
      this.accelerations[pIdx + 2] = 0;
    }
    this.grabbedIndex = -1;
    this.grabbedClusterCount = 0;
    this.isInteracting = false;
  }

  /**
   * Advances the simulation using fixed-timestep accumulation.
   * Decoupled from variable requestAnimationFrame delta times per Discipline Rule 2.
   */
  public update(deltaTimeSeconds: number): void {
    // Clamp maximum delta time to avoid spiral-of-death on background tabs
    const dt = Math.min(deltaTimeSeconds, 0.1);
    this.accumulator += dt;

    while (this.accumulator >= this.fixedTimestep) {
      this.step(this.fixedTimestep);
      this.accumulator -= this.fixedTimestep;
    }

    this.computeNormals();
  }

  /**
   * Executes one fixed Verlet integration step.
   * Strictly zero-allocation inside loop.
   */
  public step(dt: number): void {
    this.elapsedTime += dt;

    // Compute dynamic wind vector for breeze preset
    let windX = 0;
    let windZ = 0;
    if (this.gravityPreset === 'breeze') {
      windX = Math.sin(this.elapsedTime * 2.5) * 1.8;
      windZ = Math.cos(this.elapsedTime * 1.8) * 1.2;
    }

    // Mass damping factor calibrated by GSM
    const effectiveDamping = Math.min(0.99, 1.0 - this.airDamping * (dt / this.massDensity));
    const dtSq = dt * dt;

    // 1. Verlet Particle Position Integration
    for (let i = 0; i < this.particleCount; i++) {
      const pIdx = i * 3;

      if (this.pinned[i] === 1) {
        continue;
      }

      if (i === this.grabbedIndex && this.isInteracting) {
        // Direct manipulation of grabbed point
        this.prevPositions[pIdx] = this.positions[pIdx];
        this.prevPositions[pIdx + 1] = this.positions[pIdx + 1];
        this.prevPositions[pIdx + 2] = this.positions[pIdx + 2];

        this.positions[pIdx] = this.grabbedTargetX;
        this.positions[pIdx + 1] = this.grabbedTargetY;
        this.positions[pIdx + 2] = this.grabbedTargetZ;

        this.accelerations[pIdx] = 0;
        this.accelerations[pIdx + 1] = 0;
        this.accelerations[pIdx + 2] = 0;
        continue;
      }

      // Current positions
      const px = this.positions[pIdx];
      const py = this.positions[pIdx + 1];
      const pz = this.positions[pIdx + 2];

      // Previous positions
      const ox = this.prevPositions[pIdx];
      const oy = this.prevPositions[pIdx + 1];
      const oz = this.prevPositions[pIdx + 2];

      // Acceleration sum (gravity + wind + user impulses)
      const ax = this.gravityX + windX + this.accelerations[pIdx];
      const ay = this.gravityY + this.accelerations[pIdx + 1];
      const az = this.gravityZ + windZ + this.accelerations[pIdx + 2];

      // Verlet formula
      const nx = px + (px - ox) * effectiveDamping + (ax / this.massDensity) * dtSq;
      const ny = py + (py - oy) * effectiveDamping + (ay / this.massDensity) * dtSq;
      const nz = pz + (pz - oz) * effectiveDamping + (az / this.massDensity) * dtSq;

      this.prevPositions[pIdx] = px;
      this.prevPositions[pIdx + 1] = py;
      this.prevPositions[pIdx + 2] = pz;

      this.positions[pIdx] = nx;
      this.positions[pIdx + 1] = ny;
      this.positions[pIdx + 2] = nz;

      // Reset per-step impulses
      this.accelerations[pIdx] = 0;
      this.accelerations[pIdx + 1] = 0;
      this.accelerations[pIdx + 2] = 0;
    }

    // Move soft-radius cluster particles smoothly with the pointer
    if (this.isInteracting && this.grabbedClusterCount > 0) {
      for (let c = 0; c < this.grabbedClusterCount; c++) {
        const p = this.grabbedClusterIndices[c];
        if (p === this.grabbedIndex || this.pinned[p] === 1) continue;

        const pIdx = p * 3;
        const w = this.grabbedClusterWeights[c];
        const tx = this.grabbedTargetX + this.grabbedClusterOffsetsX[c];
        const ty = this.grabbedTargetY + this.grabbedClusterOffsetsY[c];
        const tz = this.grabbedTargetZ + this.grabbedClusterOffsetsZ[c];

        this.prevPositions[pIdx] = this.positions[pIdx];
        this.prevPositions[pIdx + 1] = this.positions[pIdx + 1];
        this.prevPositions[pIdx + 2] = this.positions[pIdx + 2];

        // Soft pinch pull: smooth quadratic falloff towards target
        const blend = w * 0.55;
        this.positions[pIdx] = this.positions[pIdx] * (1 - blend) + tx * blend;
        this.positions[pIdx + 1] = this.positions[pIdx + 1] * (1 - blend) + ty * blend;
        this.positions[pIdx + 2] = this.positions[pIdx + 2] * (1 - blend) + tz * blend;
      }
    }

    // 2. Constraint Relaxation (6 Gauss-Seidel iterations for authentic inextensible textile weave)
    const iterations = 6;
    for (let iter = 0; iter < iterations; iter++) {
      this.satisfyConstraints();
    }
  }

  /**
   * Enforces distance constraints between particles.
   * Zero heap allocations.
   */
  private satisfyConstraints(): void {
    // Structural yarns have very high tensile resistance (inextensible warp/weft)
    const structuralStiffness = Math.min(1.0, Math.max(0.92, this.tensileElasticity));
    const shearStiffness = 0.45;
    // Bending stiffness scaled from 0..10 rating
    const bendingFactor = Math.min(0.85, Math.max(0.05, this.bendingStiffness * 0.08));

    for (let i = 0; i < this.constraintCount; i++) {
      const a = this.constraintA[i];
      const b = this.constraintB[i];
      const type = this.constraintType[i];
      const rest = this.restDistances[i];

      const pA = a * 3;
      const pB = b * 3;

      this._dx = this.positions[pB] - this.positions[pA];
      this._dy = this.positions[pB + 1] - this.positions[pA + 1];
      this._dz = this.positions[pB + 2] - this.positions[pA + 2];

      this._dist = Math.sqrt(
        this._dx * this._dx + this._dy * this._dy + this._dz * this._dz
      );

      if (this._dist === 0) continue;

      // Provot strain limiting: strictly clamp structural yarn elongation to max 3%
      let stiffness = structuralStiffness;
      if (type === 0 && this._dist > rest * 1.03) {
        this._diff = (this._dist - rest * 1.02) / this._dist;
        stiffness = 1.0;
      } else {
        this._diff = (this._dist - rest) / this._dist;
        if (type === 2) {
          // Bending constraint (flexion resistance)
          stiffness = bendingFactor;
        } else if (type === 1) {
          // Shear constraint (allows diagonal drape without rubber elasticity)
          stiffness = shearStiffness;
        }
      }

      const pA_pinned = this.pinned[a] === 1 || (a === this.grabbedIndex && this.isInteracting);
      const pB_pinned = this.pinned[b] === 1 || (b === this.grabbedIndex && this.isInteracting);

      if (pA_pinned && pB_pinned) {
        continue;
      }

      const offsetX = this._dx * this._diff * 0.5 * stiffness;
      const offsetY = this._dy * this._diff * 0.5 * stiffness;
      const offsetZ = this._dz * this._diff * 0.5 * stiffness;

      if (!pA_pinned && !pB_pinned) {
        this.positions[pA] += offsetX;
        this.positions[pA + 1] += offsetY;
        this.positions[pA + 2] += offsetZ;

        this.positions[pB] -= offsetX;
        this.positions[pB + 1] -= offsetY;
        this.positions[pB + 2] -= offsetZ;
      } else if (!pA_pinned) {
        this.positions[pA] += offsetX * 2;
        this.positions[pA + 1] += offsetY * 2;
        this.positions[pA + 2] += offsetZ * 2;
      } else if (!pB_pinned) {
        this.positions[pB] -= offsetX * 2;
        this.positions[pB + 1] -= offsetY * 2;
        this.positions[pB + 2] -= offsetZ * 2;
      }
    }
  }

  /**
   * Computes per-vertex surface normals using cross products of adjacent edges.
   * Zero-allocation.
   */
  public computeNormals(): void {
    // Zero out all normals
    for (let i = 0; i < this.normals.length; i++) {
      this.normals[i] = 0;
    }

    // Accumulate triangle face normals into vertex normals
    for (let t = 0; t < this.indexCount; t += 3) {
      const i0 = this.indices[t];
      const i1 = this.indices[t + 1];
      const i2 = this.indices[t + 2];

      const p0 = i0 * 3;
      const p1 = i1 * 3;
      const p2 = i2 * 3;

      // Edge 1 = p1 - p0
      const e1x = this.positions[p1] - this.positions[p0];
      const e1y = this.positions[p1 + 1] - this.positions[p0 + 1];
      const e1z = this.positions[p1 + 2] - this.positions[p0 + 2];

      // Edge 2 = p2 - p0
      const e2x = this.positions[p2] - this.positions[p0];
      const e2y = this.positions[p2 + 1] - this.positions[p0 + 1];
      const e2z = this.positions[p2 + 2] - this.positions[p0 + 2];

      // Cross product (e1 x e2)
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;

      this.normals[p0] += nx;
      this.normals[p0 + 1] += ny;
      this.normals[p0 + 2] += nz;

      this.normals[p1] += nx;
      this.normals[p1 + 1] += ny;
      this.normals[p1 + 2] += nz;

      this.normals[p2] += nx;
      this.normals[p2 + 1] += ny;
      this.normals[p2 + 2] += nz;
    }

    // Normalize each vertex normal
    for (let i = 0; i < this.particleCount; i++) {
      const nIdx = i * 3;
      const nx = this.normals[nIdx];
      const ny = this.normals[nIdx + 1];
      const nz = this.normals[nIdx + 2];

      this._norm = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (this._norm > 0.0001) {
        this.normals[nIdx] = nx / this._norm;
        this.normals[nIdx + 1] = ny / this._norm;
        this.normals[nIdx + 2] = nz / this._norm;
      } else {
        this.normals[nIdx] = 0;
        this.normals[nIdx + 1] = 0;
        this.normals[nIdx + 2] = 1;
      }
    }
  }
}
