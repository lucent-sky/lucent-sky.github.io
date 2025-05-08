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


import SceneObject from '/lib/DSViz/SceneObject.js';

export default class ParticleSystemObject extends SceneObject {
  constructor(device, canvasFormat, numParticles = 4096) {
    super(device, canvasFormat);
    this._numParticles = numParticles;
    this._step = 0;
    this.mousePos = new Float32Array([0.0, 0.0]); // Normalized mouse position
    
    // Create a buffer to store the mouse position
    this._mouseBuffer = this._device.createBuffer({
        size: this.mousePos.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Add mouse movement listener
    window.addEventListener("mousemove", (event) => {
        const rect = this._device.canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        this.mousePos[0] = x;
        this.mousePos[1] = y;
        
        // Update the GPU buffer
        this._device.queue.writeBuffer(this._mouseBuffer, 0, this.mousePos);
    });
}
  
  async createGeometry() { 
    await this.createParticleGeometry();
  }
  
  async createParticleGeometry() {
    // Create particles
    this._particles = new Float32Array(this._numParticles * 6); // [x, y, ix, iy, vx, vy]
    
    // Create ping-pong buffers to store and update the particles in GPU
    this._particleBuffers = [
      this._device.createBuffer({
        size: this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      }),
      this._device.createBuffer({
        size: this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      })
    ];
    
    // Initialize the buffers with particle data
    new Float32Array(this._particleBuffers[0].getMappedRange()).set(this._particles);
    new Float32Array(this._particleBuffers[1].getMappedRange()).set(this._particles);
    this._particleBuffers[0].unmap();
    this._particleBuffers[1].unmap();
    
    // Call the reset function to initialize particle positions and velocities
    this.resetParticles();
  }
    
resetParticles() {
    const initialSpeed = 0.03;  // Strong initial burst
    const spread = Math.PI / 3; // 60 degree spread for the fountain effect
    const centerX = 0.0;
    const centerY = -0.5; // Start slightly below the center
    const maxParticles = 100; // Maximum number of active particles
    let activeParticles = 0;

    for (let i = 0; i < this._numParticles; ++i) {
        if (activeParticles >= maxParticles) break;

        // Start all particles from the center
        this._particles[8 * i + 0] = centerX;
        this._particles[8 * i + 1] = centerY;
        
        // Store the initial positions
        this._particles[8 * i + 2] = centerX;
        this._particles[8 * i + 3] = centerY;
        
        // Random upward velocity with a wide spread
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
        const vx = Math.cos(angle) * initialSpeed;
        const vy = Math.sin(angle) * initialSpeed;
        
        // Ensure the y-component is always positive for an upward burst
        this._particles[8 * i + 4] = vx;
        this._particles[8 * i + 5] = Math.abs(vy);
        
        // Add initial age and lifespan
        this._particles[8 * i + 6] = 0.0; // Age
        this._particles[8 * i + 7] = 1.0 + Math.random(); // Lifespan (1 to 2 seconds)

        // Increment active particle count
        activeParticles++;
    }
    
    // Copy from CPU to GPU for the initial step
    this._step = 0;
    this._device.queue.writeBuffer(this._particleBuffers[this._step % 2], 0, this._particles);
}

async createShaders() {
    let shaderCode = await this.loadShader("/shaders/particles.wgsl");
    this._shaderModule = this._device.createShaderModule({
        label: "Particles Shader " + this.getName(),
        code: shaderCode,
    });
    
    // Create the bind group layout for using the ping-pong buffers and mouse position
    this._bindGroupLayout = this._device.createBindGroupLayout({
        label: "Particles Bind Group Layout",
        entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" }},
            { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: "storage" }},
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } }
        ]
    });
    
    // Create the pipeline layout using the bind group layout
    this._pipelineLayout = this._device.createPipelineLayout({
        label: "Particles Pipeline Layout",
        bindGroupLayouts: [ this._bindGroupLayout ],
    });
}
  
  async createRenderPipeline() { 
    await this.createParticlePipeline();
  }
  
async createParticlePipeline() {
    this._particlePipeline = this._device.createRenderPipeline({
        label: "Particles Render Pipeline " + this.getName(),
        layout: this._pipelineLayout,
        vertex: {
            module: this._shaderModule, 
            entryPoint: "vertexMain",
        },
        fragment: {
            module: this._shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: this._canvasFormat
            }]
        },
        primitive: {
            topology: 'point-list'
        }
    });
    
    // Create bind groups for the ping-pong buffers
    this._bindGroups = [
        this._device.createBindGroup({
            layout: this._bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this._particleBuffers[0] }},
                { binding: 1, resource: { buffer: this._particleBuffers[1] }},
                { binding: 2, resource: { buffer: this._mouseBuffer } }
            ]
        }),
        this._device.createBindGroup({
            layout: this._bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this._particleBuffers[1] }},
                { binding: 1, resource: { buffer: this._particleBuffers[0] }},
                { binding: 2, resource: { buffer: this._mouseBuffer } }
            ]
        })
    ];
}
  
  render(pass) { 
    pass.setPipeline(this._particlePipeline); 
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.draw(this._numParticles);
  }
  
  async createComputePipeline() { 
    this._computePipeline = this._device.createComputePipeline({
      label: "Particles Compute Pipeline " + this.getName(),
      layout: this._pipelineLayout,
      compute: {
        module: this._shaderModule,
        entryPoint: "computeMain",
      }
    });
  }
  
  compute(pass) { 
    // Reset the active particle counter before each frame
    const zero = new Uint32Array([0]);
    this._device.queue.writeBuffer(this._particleCountBuffer, 0, zero);
    
    pass.setPipeline(this._computePipeline);
    pass.setBindGroup(0, this._bindGroups[this._step % 2]);
    pass.dispatchWorkgroups(Math.ceil(this._numParticles / 256));
    ++this._step;
}
}
