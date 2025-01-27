async function init() {
    // Create a canvas tag
    const canvasTag = document.createElement('canvas');
    canvasTag.id = "renderCanvas";
    document.body.appendChild(canvasTag);

    // Check if the browser supports WebGPU
    if (!navigator.gpu) {
        throw Error("WebGPU is not supported in this browser.");
    }

    // Get a GPU adapter
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw Error("Couldn't request WebGPU adapter.");
    }

    // Get a GPU device
    const device = await adapter.requestDevice();

    // Get canvas context using WebGPU
    const context = canvasTag.getContext("webgpu");
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: canvasFormat,
    });

    // Define vertices for the large star (center)
    const centerStarVertices = new Float32Array([
        0.0, 0.0,  0.0, 0.5,  -0.2, 0.2,
        0.0, 0.0,  -0.2, 0.2,  -0.5, 0.2,
        0.0, 0.0,  -0.5, 0.2,  -0.2, 0.0,
        0.0, 0.0,  -0.2, 0.0,  -0.3, -0.5,
        0.0, 0.0,  -0.3, -0.5,  0.0, -0.2,
        0.0, 0.0,  0.0, -0.2,  0.3, -0.5,
        0.0, 0.0,  0.3, -0.5,  0.2, 0.0,
        0.0, 0.0,  0.2, 0.0,  0.5, 0.2,
        0.0, 0.0,  0.5, 0.2,  0.2, 0.2,
        0.0, 0.0,  0.2, 0.2,  0.0, 0.5
    ]);

    // Define vertices for a smaller star (top-left, scaled down and shifted)
    const smallStar1Vertices = new Float32Array(centerStarVertices.map((v, i) => 
        i % 2 === 0 ? v * 0.5 - 0.5 : v * 0.5 + 0.5
    ));

    // Define vertices for another smaller star (bottom-right, scaled down and shifted)
    const smallStar2Vertices = new Float32Array(centerStarVertices.map((v, i) => 
        i % 2 === 0 ? v * 0.3 + 0.5 : v * 0.3 - 0.5
    ));

    // Generate vertices for a circle in the lower-left corner
    const numSegments = 50;
    const radius = 0.2;
    const circleCenterX = -0.7;
    const circleCenterY = -0.7;
    const circleVertices = [];
    for (let i = 0; i <= numSegments; i++) {
        const angle = (i / numSegments) * 2 * Math.PI;
        circleVertices.push(circleCenterX, circleCenterY); // Center point
        circleVertices.push(circleCenterX + radius * Math.cos(angle), circleCenterY + radius * Math.sin(angle)); // Edge points
    }

    const allVertices = new Float32Array([
        ...centerStarVertices,
        ...smallStar1Vertices,
        ...smallStar2Vertices,
        ...circleVertices,
    ]);

    // Create vertex buffer
    const vertexBuffer = device.createBuffer({
        label: "Vertices",
        size: allVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, allVertices);

    // Define vertex buffer layout
    const vertexBufferLayout = {
        arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
        attributes: [{
            format: "float32x2",
            offset: 0,
            shaderLocation: 0,
        }],
    };

    // Create shader code with color uniforms for each shape
    const vertCode = `
        @vertex
        fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
            return vec4f(pos, 0, 1);
        }`;

    const fragCode = `
        struct Color {
            r: f32,
            g: f32,
            b: f32,
            a: f32,
        };

        @group(0) @binding(0) var<uniform> color: Color;

        @fragment
        fn fragmentMain() -> @location(0) vec4f {
            return vec4f(color.r, color.g, color.b, color.a);
        }`;

    // Create shader module
    const shaderModule = device.createShaderModule({
        label: "Shader",
        code: vertCode + '\n' + fragCode,
    });

    // Create render pipeline
    const renderPipeline = device.createRenderPipeline({
        label: "Render Pipeline",
        layout: "auto",
        vertex: {
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: [vertexBufferLayout],
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat,
            }],
        },
    });

    // Create uniform buffers for each shape's color
    const colors = [
        new Float32Array([1.0, 0.0, 0.0, 1.0]), // Red
        new Float32Array([1.0, 1.0, 1.0, 1.0]), // White
        new Float32Array([1.0, 0.65, 0.0, 1.0]), // Orange
        new Float32Array([0.0, 0.0, 1.0, 1.0]), // Blue
    ];

    const colorBuffers = colors.map(color => {
        const buffer = device.createBuffer({
            size: 4 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(buffer, 0, color);
        return buffer;
    });

    // Create bind groups for each shape
    const bindGroups = colorBuffers.map(buffer =>
        device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: { buffer: buffer },
            }],
        })
    );

    // Create a command encoder
    const encoder = device.createCommandEncoder();

    // Begin render pass
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 }, // Black background
            loadOp: "clear",
            storeOp: "store",
        }],
    });

    // Draw the red star
    pass.setPipeline(renderPipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroups[0]);
    pass.draw(centerStarVertices.length / 2);

    // Draw the white star
    pass.setBindGroup(0, bindGroups[1]);
    pass.draw(smallStar1Vertices.length / 2, 1, centerStarVertices.length / 2);

    // Draw the orange star
    pass.setBindGroup(0, bindGroups[2]);
    pass.draw(smallStar2Vertices.length / 2, 1, centerStarVertices.length / 2 + smallStar1Vertices.length / 2);

    // Draw the blue circle
    pass.setBindGroup(0, bindGroups[3]);
    pass.draw(circleVertices.length / 2, 1, centerStarVertices.length / 2 + smallStar1Vertices.length / 2 + smallStar2Vertices.length / 2);

    pass.end();

    // Submit commands to GPU
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

init().catch(error => {
    const pTag = document.createElement('p');
    pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
    document.body.appendChild(pTag);
    document.getElementById("renderCanvas")?.remove();
});
