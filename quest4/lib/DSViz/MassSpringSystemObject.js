import SceneObject from '/lib/DSViz/SceneObject.js'

export default class MassSpringSystemObject extends SceneObject {
  constructor(device, canvasFormat, numParticles = 16) {
    super(device, canvasFormat);
    this._size = numParticles;
    this._numParticles = this._size * this._size;
    this._numSprings = this._size * (this._size-1)*2;
    this._step = 0;
  }
  
  async createGeometry() { 
    await this.createParticleGeometry();
    await this.createSpringGeometry();
  }
  
  async createParticleGeometry() {
    // Create particles
    this._particles = new Float32Array(this._numParticles * 8); // [x, y, vx, vy, dx, dy, m, -]
    // Create vertex+storage buffer to store the particles in GPU
    this._particleBuffers = [
      this._device.createBuffer({
        label: "Particles Buffer 1 " + this.getName(),
        size: this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      this._device.createBuffer({
        label: "Particles Buffer 2 " + this.getName(),
        size: this._particles.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      })
    ];
    this.resetParticles();
  }
    
  async createSpringGeometry() {
    // Create springs in CPU and GPU
    this._springs = new Float32Array(this._numSprings * 4);
    this._springBuffer = this._device.createBuffer({
      label: "Springs Buffer " + this.getName(),
      size: this._springs.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.resetSprings();
  }
    
resetParticles() {
    let edgeLength = 0.7;
    let delta = edgeLength / this._size;
    for (let j = 0; j < this._size; ++j) {
        for (let i = 0; i < this._size; ++i) {
            let idx = j * this._size + i;
            this._particles[8 * idx + 0] = -0.25 + delta * i;
            this._particles[8 * idx + 1] = 0.5 - delta * j;
            this._particles[8 * idx + 2] = 0;
            this._particles[8 * idx + 3] = 0;
            this._particles[8 * idx + 4] = 0;
            this._particles[8 * idx + 5] = 0;
            this._particles[8 * idx + 6] = 0.0001 * this._numParticles;
            this._particles[8 * idx + 7] = (j == 0) ? 1 : 0;
        }
    }
    this._step = 0;
    this._device.queue.writeBuffer(this._particleBuffers[this._step % 2], 0, this._particles);
}
  
  resetSprings() {
    let edgeLength = 0.7;
    let delta = edgeLength / this._size;
    let stiffness = 4;
    let ysize = this._size - 1;
    
    // Initialize the springs
    for (let j = 0; j < this._size; ++j) {
        for (let i = 0; i < ysize; ++i) {
            // Horizontal springs
            let idx = j * ysize + i;
            this._springs[4 * idx + 0] = j * this._size + i;
            this._springs[4 * idx + 1] = j * this._size + i + 1;
            this._springs[4 * idx + 2] = delta;
            this._springs[4 * idx + 3] = stiffness;
            
            // Vertical springs
            idx += this._size * (this._size - 1);
            this._springs[4 * idx + 0] = i * this._size + j;
            this._springs[4 * idx + 1] = (i + 1) * this._size + j;
            this._springs[4 * idx + 2] = delta;
            this._springs[4 * idx + 3] = stiffness;
        }
    }
    
    // Reset simulation step and copy to GPU
    this._step = 0;
    this._device.queue.writeBuffer(this._springBuffer, 0, this._springs);
}
  
  async createShaders() {
    let shaderCode = await this.loadShader("/shaders/massspring.wgsl");
    this._shaderModule = this._device.createShaderModule({
      label: "Particles Shader " + this.getName(),
      code: shaderCode,
    });
    this._bindGroupLayout = this._device.createBindGroupLayout({
      label: "Mass-Spring Bind Group Layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }
      ]
    });
    this._pipelineLayout = this._device.createPipelineLayout({
      label: "Particles Pipeline Layout",
      bindGroupLayouts: [this._bindGroupLayout],
    });
  }

  async createParticlePipeline() {
    this._bindGroups = [
      this._device.createBindGroup({
        layout: this._bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this._particleBuffers[0] }},
          { binding: 1, resource: { buffer: this._particleBuffers[1] }},
          { binding: 2, resource: { buffer: this._springBuffer }}
        ]
      }),
      this._device.createBindGroup({
        layout: this._bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this._particleBuffers[1] }},
          { binding: 1, resource: { buffer: this._particleBuffers[0] }},
          { binding: 2, resource: { buffer: this._springBuffer }}
        ]
      })
    ];
  }
}
