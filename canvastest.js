async function init() {
    // Create a canvas tag
    const canvasTag = document.createElement('canvas');
    canvasTag.id = "renderCanvas"; // Important! This tells which CSS style to use
    document.body.appendChild(canvasTag);
    // Check if the browser supports WebGPU
    if (!navigator.gpu) {
      throw Error("WebGPU is not supported in this browser.");
    }
    // Get an GPU adapter
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw Error("Couldn't request WebGPU adapter.");
    }
    // Get a GPU device
    const device = await adapter.requestDevice();
    // Get canvas context using webgpu
    const context = canvasTag.getContext("webgpu");
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device: device,
      format: canvasFormat,
    });
    // Create a gpu command encoder
    const encoder = device.createCommandEncoder();

    // Create a triangle geometry in CPU
    var vertices = new Float32Array([
        // waow it's a 4 pointed star this time
        0, 0.5,   // Top
        -0.2, 0.2, // Top-left inner
        -0.5, 0.2, // Left outer
        -0.2, 0,   // Bottom-left inner
        -0.3, -0.5, // Bottom-left outer
        0, -0.2,  // Bottom inner
        0.3, -0.5, // Bottom-right outer
        0.2, 0,    // Bottom-right inner
        0.5, 0.2,  // Right outer
        0.2, 0.2   // Top-right inner
        ]);

        // Create vertex buffer to store the vertices in GPU
    var vertexBuffer = device.createBuffer({
        label: "Vertices",
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Copy from CPU to GPU
    device.queue.writeBuffer(vertexBuffer, 0, vertices);
    
    // Defne vertex buffer layout - how the shader should read the buffer
    var vertexBufferLayout = {
        arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
        attributes: [{
            format: "float32x2", // 32 bits, each has two coordiantes
            offset: 0,
            shaderLocation: 0, // position in the vertex shader
        }],
    };

    // Use the encoder to begin render pass
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 56/255, b: 101/255, a: 1 }, // Bucknell Blue
        loadOp: "clear",
        storeOp: "store",
      }]
    });

    var vertCode = `
        @vertex // this compute the scene coordinate of each input vertex
        fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
        return vec4f(pos, 0, 1); // (pos, Z, W) = (X, Y, Z, W)
    }`;

    var fragCode = `
        @fragment // this compute the color of each pixel
        fn fragmentMain() -> @location(0) vec4f {
        return vec4f(238.f/255, 118.f/255, 35.f/255, 1); // (R, G, B, A)
    }`;

    // Create shader module
    var shaderModule = device.createShaderModule({
        label: "Shader",
        code: vertCode + '\n' + fragCode,
    });


  // Use the module to create a render pipeline
    var renderPipeline = device.createRenderPipeline({
        label: "Render Pipeline",
        layout: "auto", // we will talk about layout later
        vertex: {
            module: shaderModule,         // the shader module
            entryPoint: "vertexMain",     // where the vertex shader starts
            buffers: [vertexBufferLayout] // the buffer layout - more about it soon
        },
        fragment: {
            module: shaderModule,         // the shader module
            entryPoint: "fragmentMain",   // where the fragment shader starts
            targets: [{
                format: canvasFormat        // the target canvas format (the output)
            }]
        }
    }); 

    // add more render pass to draw the plane
    pass.setPipeline(renderPipeline);      // which render pipeline to use
    pass.setVertexBuffer(0, vertexBuffer); // which vertex buffer is used at location 0
    pass.draw(vertices.length / 2);        // how many vertices to draw

    pass.end(); // end the pass
    // Create the command buffer
    const commandBuffer = encoder.finish();
    // Submit to the device to render
    device.queue.submit([commandBuffer]);
  
    return context;
  }
  
  init().then( ret => {
    console.log(ret);
  }).catch( error => {
    // error handling - add a p tag to display the error message
    const pTag = document.createElement('p');
    pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
    document.body.appendChild(pTag);
    // also remove the created canvas tag
    document.getElementById("renderCanvas").remove();
  });
