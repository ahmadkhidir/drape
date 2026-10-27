/**
 * WebGPU WGSL Cloth Simulation & Rendering Shaders
 * Permanent Spec Anchors: FEAT-002, NFR-003, C-009
 */

export const CLOTH_COMPUTE_WGSL = /* wgsl */ `
struct Particle {
  pos: vec4<f32>,
  prevPos: vec4<f32>,
  acc: vec4<f32>,
  meta: vec4<f32>, // x: pinned (1.0 or 0.0), y: u, z: v, w: unused
};

struct PhysicsParams {
  gravity: vec4<f32>,
  mousePos: vec4<f32>, // xyz: world pos, w: grab radius
  dt: f32,
  damping: f32,
  bendingStiffness: f32,
  tensileElasticity: f32,
  particleCount: u32,
  mouseActive: u32,
  _padding1: u32,
  _padding2: u32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: PhysicsParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  var p = particles[idx];

  // If particle is pinned, skip Verlet integration
  if (p.meta.x > 0.5) {
    return;
  }

  let dt = params.dt;
  let dtSq = dt * dt;
  let damping = params.damping;

  // Pointer interaction
  if (params.mouseActive > 0u) {
    let dist = distance(p.pos.xyz, params.mousePos.xyz);
    if (dist < params.mousePos.w) {
      let pullDir = normalize(params.mousePos.xyz - p.pos.xyz);
      p.acc = vec4<f32>(p.acc.xyz + pullDir * 15.0, 0.0);
    }
  }

  // Verlet integration
  let currentPos = p.pos.xyz;
  let prevPos = p.prevPos.xyz;
  let acc = p.acc.xyz + params.gravity.xyz;

  let nextPos = currentPos + (currentPos - prevPos) * damping + acc * dtSq;

  p.prevPos = vec4<f32>(currentPos, 0.0);
  p.pos = vec4<f32>(nextPos, 1.0);
  p.acc = vec4<f32>(0.0, 0.0, 0.0, 0.0);

  particles[idx] = p;
}
`;

export const CLOTH_RENDER_WGSL = /* wgsl */ `
struct Uniforms {
  modelViewProjectionMatrix: mat4x4<f32>,
  lightDirection: vec4<f32>,
  lightColor: vec4<f32>,
  ambientColor: vec4<f32>,
  fabricProps: vec4<f32>, // x: roughness, y: metallic, z: subsurface, w: drape
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var fabricSampler: sampler;
@group(0) @binding(2) var albedoTexture: texture_2d<f32>;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.clipPosition = uniforms.modelViewProjectionMatrix * vec4<f32>(input.position, 1.0);
  output.worldPos = input.position;
  output.normal = input.normal;
  output.uv = input.uv;
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let texColor = textureSample(albedoTexture, fabricSampler, input.uv);
  let N = normalize(input.normal);
  let L = normalize(uniforms.lightDirection.xyz);
  let V = normalize(-input.worldPos);
  let H = normalize(L + V);

  // Lambertian diffuse
  let NdotL = max(dot(N, L), 0.0);
  let diffuse = uniforms.lightColor.rgb * NdotL;

  // Anisotropic silk specular sheen
  let NdotH = max(dot(N, H), 0.0);
  let specular = pow(NdotH, 32.0) * uniforms.fabricProps.y * uniforms.lightColor.rgb;

  // Subsurface transmission
  let subsurface = uniforms.fabricProps.z * max(dot(-N, L), 0.0) * vec3<f32>(0.9, 0.85, 0.75);

  let finalColor = texColor.rgb * (uniforms.ambientColor.rgb + diffuse + subsurface) + specular;
  return vec4<f32>(finalColor, 1.0);
}
`;
