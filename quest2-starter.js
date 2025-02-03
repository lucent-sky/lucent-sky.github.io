/*!
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

// Check your browser supports: https://github.com/gpuweb/gpuweb/wiki/Implementation-Status#implementation-status
// Need to enable experimental flags chrome://flags/
// Chrome & Edge 113+ : Enable Vulkan, Default ANGLE Vulkan, Vulkan from ANGLE, Unsafe WebGPU Support, and WebGPU Developer Features (if exsits)
// Firefox Nightly: sudo snap install firefox --channel=latext/edge or download from https://www.mozilla.org/en-US/firefox/channel/desktop/

import FilteredRenderer from '/lib/Viz/2DFilteredRenderer.js'
import Standard2DFullScreenObject from '/lib/DSViz/Standard2DFullScreenObject.js'
import Standard2DPGAPosedVertexColorObject from '/lib/DSViz/Standard2DPGAPosedVertexColorObject.js'
import LineStrip2DVertexObject from '/lib/DSViz/LineStrip2DVertexObject.js'
import DemoTreeObject from '/lib/DSViz/DemoTreeObject.js'
import PGA2D from '/lib/Math/PGA2D.js'

async function init() {
    const canvasTag = document.createElement('canvas');
    canvasTag.id = "renderCanvas";
    document.body.appendChild(canvasTag);
    
    const renderer = new FilteredRenderer(canvasTag);
    await renderer.init();
    
    // Space background
    await renderer.appendSceneObject(new Standard2DFullScreenObject(renderer._device, renderer._canvasFormat, "/assets/space.jpg"));

    // Sun - Large yellow circle
    const sun = createCircle(0, 0, 0.2, [1, 1, 0, 1]);
    await renderer.appendSceneObject(sun);

    // Planets data: [distance, size, color]
    const planets = [
        [0.3, 0.05, [0.5, 0.5, 1, 1]],  // Mercury
        [0.5, 0.07, [1, 0.5, 0, 1]],    // Venus
        [0.7, 0.08, [0, 0, 1, 1]],      // Earth
        [0.9, 0.06, [1, 0, 0, 1]],      // Mars
        [1.2, 0.1, [1, 1, 0, 1]],       // Jupiter
        [1.5, 0.09, [0.6, 0.6, 1, 1]],  // Saturn
        [1.8, 0.07, [0, 1, 1, 1]],      // Uranus
        [2.1, 0.06, [0, 0, 0.5, 1]]     // Neptune
    ];
    
    let planetObjects = [];
    for (let i = 0; i < planets.length; i++) {
        let [dist, size, color] = planets[i];
        let planet = createCircle(dist, 0, size, color);
        await renderer.appendSceneObject(planet);
        planetObjects.push({ obj: planet, dist, angle: 0, speed: 0.02 - i * 0.002 });
    }

    // Moon orbiting Earth
    let moon = createCircle(0.75, 0, 0.02, [0.7, 0.7, 0.7, 1]);
    await renderer.appendSceneObject(moon);
    
    // Elliptical orbit for a planet
    let ellipseOrbit = createEllipse(1.3, 0.7);
    await renderer.appendSceneObject(ellipseOrbit);
    
    // Spaceship (Triangle + two rectangles)
    let spaceship = createSpaceship();
    await renderer.appendSceneObject(spaceship);
    
    // Animation loop
    setInterval(() => {
        renderer.render();

        // Rotate planets
        planetObjects.forEach(p => {
            p.angle += p.speed;
            let x = p.dist * Math.cos(p.angle);
            let y = p.dist * Math.sin(p.angle);
            p.obj.pose.set([1, 0, 0, 0, x, y]);
        });

        // Moon orbiting Earth
        let earth = planetObjects[2];
        let moonAngle = earth.angle * 3;
        let mx = earth.dist * Math.cos(earth.angle) + 0.1 * Math.cos(moonAngle);
        let my = earth.dist * Math.sin(earth.angle) + 0.1 * Math.sin(moonAngle);
        moon.pose.set([1, 0, 0, 0, mx, my]);
        
        // Spaceship moves along the elliptical orbit
        let t = performance.now() / 2000;
        let sx = 1.3 * Math.cos(t);
        let sy = 0.7 * Math.sin(t);
        spaceship.pose.set([1, 0, 0, 0, sx, sy]);
    }, 50);

    return renderer;
}

function createCircle(x, y, size, color) {
    let vertices = new Float32Array([
        x, y, color[0], color[1], color[2], color[3]
    ]);
    return new Standard2DPGAPosedVertexColorObject(null, null, vertices, new Float32Array([1, 0, 0, 0, x, y]));
}

function createEllipse(a, b) {
    let vertices = [];
    for (let t = 0; t <= Math.PI * 2; t += 0.1) {
        vertices.push(a * Math.cos(t), b * Math.sin(t));
    }
    return new LineStrip2DVertexObject(null, null, new Float32Array(vertices));
}

function createSpaceship() {
    let vertices = new Float32Array([
        // Triangle (body)
        0, 0.05, 1, 1, 1, 1,
        -0.02, -0.05, 1, 1, 1, 1,
        0.02, -0.05, 1, 1, 1, 1,
        
        // Left wing (rectangle)
        -0.03, -0.03, 0.7, 0.7, 0.7, 1,
        -0.05, -0.05, 0.7, 0.7, 0.7, 1,
        -0.03, -0.07, 0.7, 0.7, 0.7, 1,

        // Right wing (rectangle)
        0.03, -0.03, 0.7, 0.7, 0.7, 1,
        0.05, -0.05, 0.7, 0.7, 0.7, 1,
        0.03, -0.07, 0.7, 0.7, 0.7, 1
    ]);
    return new Standard2DPGAPosedVertexColorObject(null, null, vertices, new Float32Array([1, 0, 0, 0, 0, 0]));
}

init().then( ret => {
  console.log(ret);
}).catch( error => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas").remove();
});
