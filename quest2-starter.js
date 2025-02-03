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
  // Create a canvas tag
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);
  // Create a 2d animated renderer
  const renderer = new FilteredRenderer(canvasTag);
  await renderer.init();
  // Create a background
  await renderer.appendSceneObject(new Standard2DFullScreenObject(renderer._device, renderer._canvasFormat, "/assets/bucknell.jpg"));
  // Create a triangle geometry
  var vertices1 = new Float32Array([
     // x, y, r, g, b, a
     0, 0.5, 1, 0, 0, 1,
     -0.5, 0, 0, 1, 0, 1,
     0.5,  0, 0, 0, 1, 1,
  ]);
  var pose = [1, 0, 0, 0, 1, 1];
  pose = new Float32Array(pose); // need to covert to Float32Array for uploading to GPU with fixed known size
  await renderer.appendSceneObject(new Standard2DPGAPosedVertexColorObject(renderer._device, renderer._canvasFormat, vertices1, pose));
  // Create another triangle geometry
  var vertices2 = new Float32Array([
     // x, y
     0, -0.6,
     -0.5, -0.1,
     0.5,  -0.1,
     0, -0.6, // loop back to the first vertex
  ]);
  await renderer.appendSceneObject(new LineStrip2DVertexObject(renderer._device, renderer._canvasFormat, vertices2));
  await renderer.appendSceneObject(new DemoTreeObject(renderer._device, renderer._canvasFormat, new Float32Array([1, 0, 0, 0, 0.5, 0.5])));
  // run at every 100 ms
  let angle = Math.PI / 100;
  // rotate about p
  let center = [0, 0];
  let dr = PGA2D.normaliozeMotor([Math.cos(angle / 2), -Math.sin(angle / 2), -center[0] * Math.sin(angle / 2), -center[1] * Math.sin(angle / 2)]);
  setInterval(() => { 
    renderer.render();
    // update the triangle pose
    let newmotor = PGA2D.normaliozeMotor(PGA2D.geometricProduct(dr, [pose[0], pose[1], pose[2], pose[3]]));
    pose[0] = newmotor[0];
    pose[1] = newmotor[1];
    pose[2] = newmotor[2];
    pose[3] = newmotor[3];
  }, 100); // call every 100 ms
  return renderer;
}

init().then( ret => {
  console.log(ret);
}).catch( error => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas").remove();
});