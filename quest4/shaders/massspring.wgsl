/* 
 * Copyright (c) 2025 SingChun LEE @ Bucknell University. CC BY-NC 4.0.
 * 
 * This code is provided mainly for educational purposes at Bucknell University.
 *
 * This code is licensed under the Creative Commons Attribution-NonCommerical 4.0
 * International License. To view a copy of the license, visit 
 *   https://creativecommons.org/licenses/by-nc/4.0/
 * or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 *
 * You are free to:
 *  - Share: copy and redistribute the material in any medium or format.
 *  - Adapt: remix, transform, and build upon the material.
 *
 * Under the following terms:
 *  - Attribution: You must give appropriate credit, provide a link to the license,
 *                 and indicate if changes where made.
 *  - NonCommerical: You may not use the material for commerical purposes.
 *  - No additional restrictions: You may not apply legal terms or technological 
 *                                measures that legally restrict others from doing
 *                                anything the license permits.
 */

struct Particle {
  p: vec2f,   // the particle position
  v: vec2f,   // the particle velocity
  dv: vec2f,  // the velocity update
  m: f32,     // the particle mass
  dummy: f32, // a dummy value for memory alignment
}

struct Spring {
  pts: vec2f, // the indices of two connected particles
  l: f32,     // the original spring length
  s: f32      // the stiffness coefficient
}

// Bind the storage buffer variables (TODO 4)
@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(2) var<storage, read> springsIn: array<Spring>;

@vertex
fn vertexMain(@builtin(instance_index) idx: u32, @builtin(vertex_index) vIdx: u32) -> @builtin(position) vec4f {
  // draw circles to represent a particle
  let particle = particlesIn[idx];
  let r = particle.m;
  let pi = 3.14159265;
  let theta = 2. * pi / 8 * f32(vIdx);
  let x = cos(theta) * r;
  let y = sin(theta) * r;
  return vec4f(vec2f(x + particle.p[0], y + particle.p[1]), 0, 1);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
  return vec4f(238.0 / 255.0, 118.0 / 255.0, 35.0 / 255.0, 1.0); // (R, G, B, A)
}

@vertex
fn vertexSpringMain(@builtin(instance_index) idx: u32, @builtin(vertex_index) vIdx: u32) -> @builtin(position) vec4f {
  // Draw lines to represent a spring
  return vec4f(particlesIn[u32(springsIn[idx].pts[vIdx % 2])].p, 0, 1);
}

@fragment
fn fragmentSpringMain() -> @location(0) vec4f {
  return vec4f(255.0 / 255.0, 163.0 / 255.0, 0.0 / 255.0, 1.0); // (R, G, B, A)
}

@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx < arrayLength(&springsIn)) {
    var spring = springsIn[idx];
    let aIdx = u32(spring.pts[0]);
    let bIdx = u32(spring.pts[1]);
    let ptA = particlesIn[aIdx].p;
    let ptB = particlesIn[bIdx].p;
    let massA = particlesIn[aIdx].m;
    let massB = particlesIn[bIdx].m;

    // Hooke's Law (TODO 5a)
    let diff = ptB - ptA;
    let dist = length(diff);
    let force = spring.s * (dist - spring.l);

    // Newton's Second Law (TODO 5b)
    if (dist > 0.0001) {
      let dir = normalize(diff);
      particlesOut[aIdx].dv += (force * dir) / (massA * 1000.0);
      particlesOut[bIdx].dv -= (force * dir) / (massB * 1000.0);
    }
  }
}

@compute @workgroup_size(256)
fn updateMain(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx < arrayLength(&particlesIn)) {
    var particle = particlesIn[idx];
    // Only update if the particle is not pinned down
    if (particle.dummy != 1) {
      particlesOut[idx].p = particle.p + particle.v + particlesOut[idx].dv;
      particlesOut[idx].v = (particle.v + particlesOut[idx].dv) * 0.95; // Damping
      particlesOut[idx].dv = vec2f(0.0, 0.0); // Reset delta velocity
    }
    // Always copy the mass to preserve it
    particlesOut[idx].m = particle.m;
    particlesOut[idx].dummy = particle.dummy;
  }
}
