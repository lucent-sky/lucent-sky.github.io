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

// Particle struct definition
struct Particle {
    pos: vec2f,
    vel: vec2f,
    age: f32,
    lifespan: f32,
}

// Particle buffers
@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;

// Mouse position (from uniform buffer)
@group(0) @binding(2) var<uniform> mousePos: vec2f;

// Constants for gravity and initial speed
const GRAVITY: vec2f = vec2f(0.0, -0.0003);
const MOUSE_GRAVITY_STRENGTH: f32 = 0.0005;
const INITIAL_SPEED: f32 = 0.03;
const SPREAD: f32 = 1.0;
const PI: f32 = 3.14159265;
const MAX_LIFESPAN: f32 = 2.0;
const MAX_PARTICLES: u32 = 50;

var<workgroup> activeParticleCount: atomic<u32>;

// Pseudo-random number generator
fn rand(seed: f32) -> f32 {
    return fract(sin(seed) * 43758.5453);
}

@vertex
fn vertexMain(@builtin(instance_index) idx: u32, @builtin(vertex_index) vIdx: u32) -> @builtin(position) vec4f {
    let particle = particlesIn[idx];
    let size = 0.015;
    
    // Calculate the circle position based on the vertex index
    let theta = 2.0 * PI / 8.0 * f32(vIdx);
    let x = cos(theta) * size;
    let y = sin(theta) * size;
    
    // Calculate the age factor (1.0 = full orange, 0.0 = black)
    let ageFactor = 1.0 - (particle.age / particle.lifespan);
    let color = vec4f(238.0 / 255.0 * ageFactor, 118.0 / 255.0 * ageFactor, 35.0 / 255.0 * ageFactor, 1.0);
    
    // Set the final position
    return vec4f(vec2f(x + particle.pos.x, y + particle.pos.y), 0.0, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    // Set the particle color (orange)
    return vec4f(238.0 / 255.0, 118.0 / 255.0, 35.0 / 255.0, 1.0); // (R, G, B, A)
}

@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
    let idx = global_id.x;

    // Ensure the index is within bounds
    if (idx < arrayLength(&particlesIn)) {
        // Read the current particle
        var newParticle = particlesIn[idx];

        // Update age
        newParticle.age += 0.016; // Assuming ~60 FPS, adjust if needed
        
        // Check if the particle should respawn
        if (newParticle.age >= newParticle.lifespan || newParticle.pos.y < -1.0) {
            // Check current particle count
            let count = atomicLoad(&activeParticleCount);
            if (count < MAX_PARTICLES) {
                // Reset to the center
                newParticle.pos = vec2f(0.0, -0.5);
                newParticle.age = 0.0;
                newParticle.lifespan = 1.0 + rand(f32(idx) * 0.321) * 1.0; // 1 to 2 seconds

                // Give it a fresh upward burst
                let seed = f32(idx) * 0.123;
                let angle = -PI / 2.0 + (rand(seed) - 0.5) * SPREAD;
                let speed = INITIAL_SPEED * (0.8 + rand(seed + 1.0) * 0.4); // Slight speed variation
                
                // Make sure the initial burst is always upward
                newParticle.vel = vec2f(cos(angle) * speed, abs(sin(angle)) * speed);

                // Increment the particle count
                atomicAdd(&activeParticleCount, 1);
            } else {
                // Kill the particle if the limit is reached
                newParticle.lifespan = 0.0;
            }
        }

        // Apply velocity
        newParticle.pos += newParticle.vel;
        
        // Apply gravity (downward acceleration)
        newParticle.vel += GRAVITY;
        
        // Apply mouse attraction
        let directionToMouse = normalize(mousePos - newParticle.pos);
        newParticle.vel += directionToMouse * MOUSE_GRAVITY_STRENGTH;
        
        // Write the updated particle to the output buffer
        particlesOut[idx] = newParticle;
    }
}