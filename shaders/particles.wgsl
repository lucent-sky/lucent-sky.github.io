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

// TODO 3: Define a struct to store a particle
struct Particle {
    pos: vec2f, // Current position
    vel: vec2f, // Current velocity
    init_pos: vec2f, // Initial position (for reset logic)
};

// TODO 4: Write the bind group spells here using array<Particle>
// name the binded variables particlesIn and particlesOut

// Group 0, Binding 0 - Read-Only Storage Buffer (Input)
@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;

// Group 0, Binding 1 - Storage Buffer (Output)
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;

@vertex
fn vertexMain(@builtin(instance_index) idx: u32, @builtin(vertex_index) vIdx: u32) -> @builtin(position) vec4f {
    // Retrieve the current particle
    let particle = particlesIn[idx].pos;
    
    // Set the particle size
    let size = 0.015;
    let pi = 3.14159265;
    
    // Calculate the circle position based on the vertex index
    let theta = 2.0 * pi / 8.0 * f32(vIdx);
    let x = cos(theta) * size;
    let y = sin(theta) * size;
    
    // Return the final position of the vertex
    return vec4f(vec2f(x + particle.x, y + particle.y), 0.0, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    // Set the particle color (orange)
    return vec4f(238.0 / 255.0, 118.0 / 255.0, 35.0 / 255.0, 1.0); // (R, G, B, A)
}

@compute @workgroup_size(256)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
    let idx = global_id.x;

    // Check if the index is within the bounds of the particles array
    if (idx < arrayLength(&particlesIn)) {
        // Read the current particle
        let inParticle = particlesIn[idx];
        
        // Update the position based on velocity
        var newParticle = inParticle;
        newParticle.pos += newParticle.vel;
        
        // TODO 7: Add boundary checking and respawn the particle when it is offscreen
        if (newParticle.pos.x > 1.0 || newParticle.pos.x < -1.0 ||
            newParticle.pos.y > 1.0 || newParticle.pos.y < -1.0) {
            // Respawn at initial position
            newParticle.pos = newParticle.init_pos;
        }
        
        // Write the updated particle to the output buffer
        particlesOut[idx] = newParticle;
    }
}
