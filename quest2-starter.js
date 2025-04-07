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

// Shape generators
function generateCircleVertices(radius, segments, r, g, b, a) {
  const vertices = [0, 0, r, g, b, a];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    vertices.push(radius * Math.cos(angle), radius * Math.sin(angle), r, g, b, a);
  }
  return new Float32Array(vertices);
}

function generateRectangleVertices(width, height, r, g, b, a) {
  return new Float32Array([
    -width/2,  height/2, r, g, b, a,
    -width/2, -height/2, r, g, b, a,
     width/2, -height/2, r, g, b, a,
     width/2,  height/2, r, g, b, a,
  ]);
}

function generateTriangleVertices(size, r, g, b, a) {
  return new Float32Array([
     0,  size, r, g, b, a,
    -size, -size, r, g, b, a,
     size, -size, r, g, b, a,
  ]);
}

function lerpMotor(m1, m2, t) {
  const result = new Float32Array(4);
  for (let i = 0; i < 4; i++) result[i] = (1 - t) * m1[i] + t * m2[i];
  return PGA2D.normaliozeMotor(result);
}

function sineEase(t) {
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

async function init() {
  const canvasTag = document.createElement('canvas');
  canvasTag.id = "renderCanvas";
  document.body.appendChild(canvasTag);

  const renderer = new FilteredRenderer(canvasTag);
  await renderer.init();

  await renderer.appendSceneObject(
    new Standard2DFullScreenObject(renderer._device, renderer._canvasFormat, "/assets/black.jpg")
  );

  // --- Sun ---
  const sun = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat,
    generateCircleVertices(0.05, 40, 1, 1, 0, 1),
    new Float32Array([1, 0, 0, 0, 1, 1])
  );
  await renderer.appendSceneObject(sun);

  // --- Mercury ---
  const mercuryVertices = generateCircleVertices(0.015, 40, 0.6, 0.6, 0.6, 1);
  let mercuryPose = new Float32Array([1, 0, 0.2, 0, 1, 1]);
  const mercury = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, mercuryVertices, mercuryPose
  );
  await renderer.appendSceneObject(mercury);

  // --- Venus ---
  const venusVertices = generateCircleVertices(0.025, 40, 1, 0.8, 0.4, 1);
  let venusPose = new Float32Array([1, 0, 0.4, 0, 1, 1]);
  const venus = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, venusVertices, venusPose
  );
  await renderer.appendSceneObject(venus);

  // --- Earth + Moon ---
  const earthVertices = generateCircleVertices(0.03, 40, 0.2, 0.4, 1, 1);
  let earthPose = new Float32Array([1, 0, 0.6, 0, 1, 1]);
  const earth = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, earthVertices, earthPose
  );
  await renderer.appendSceneObject(earth);

  const moonVertices = generateCircleVertices(0.015, 40, 0.9, 0.9, 0.9, 1);
  let moonPose = new Float32Array([1, 0, 0.65, 0, 1, 1]);
  const moon = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, moonVertices, moonPose
  );
  await renderer.appendSceneObject(moon);

  // --- Mars ---
  const marsVertices = generateCircleVertices(0.025, 40, 0.8, 0.2, 0.2, 1);
  let marsPose = new Float32Array([1, 0, 0.8, 0, 1, 1]);
  const mars = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, marsVertices, marsPose
  );
  await renderer.appendSceneObject(mars);

  // --- Jupiter ---
  const jupiterVertices = generateCircleVertices(0.05, 40, 0.8, 0.5, 0.2, 1);
  let jupiterPose = new Float32Array([1, 0, 1.2, 0, 1, 1]);
  const jupiter = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, jupiterVertices, jupiterPose
  );
  await renderer.appendSceneObject(jupiter);

  // --- Saturn ---
  const saturnVertices = generateCircleVertices(0.045, 40, 1, 0.8, 0.2, 1);
  let saturnPose = new Float32Array([1, 0, 1.6, 0, 1, 1]);
  const saturn = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, saturnVertices, saturnPose
  );
  await renderer.appendSceneObject(saturn);

  // --- Uranus ---
  const uranusVertices = generateCircleVertices(0.035, 40, 0.4, 0.8, 1, 1);
  let uranusPose = new Float32Array([1, 0, 2.0, 0, 1, 1]);
  const uranus = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, uranusVertices, uranusPose
  );
  await renderer.appendSceneObject(uranus);

  // --- Neptune ---
  const neptuneVertices = generateCircleVertices(0.035, 40, 0.2, 0.6, 1, 1);
  let neptunePose = new Float32Array([1, 0, 2.4, 0, 1, 1]);
  const neptune = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, neptuneVertices, neptunePose
  );
  await renderer.appendSceneObject(neptune);

  // === SPACESHIP 1 === (Was: spaceship)
  const spaceship1Pose = new Float32Array([1, 0, 0.5, 0, 1, 1]);

  const ship1Nose = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat,
    generateTriangleVertices(0.025, 1, 1, 1, 1),
    spaceship1Pose
  );
  const ship1Body = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat,
    generateRectangleVertices(0.03, 0.07, 0.3, 0.9, 0.3, 1),
    spaceship1Pose
  );
  const ship1Left = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat,
    generateCircleVertices(0.01, 20, 0.8, 0.8, 1, 1),
    spaceship1Pose
  );
  const ship1Right = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat,
    generateCircleVertices(0.01, 20, 0.8, 0.8, 1, 1),
    spaceship1Pose
  );

  await renderer.appendSceneObject(ship1Nose);
  await renderer.appendSceneObject(ship1Body);
  await renderer.appendSceneObject(ship1Left);
  await renderer.appendSceneObject(ship1Right);

  // SPACESHIP 1 motion
  const sPose1 = PGA2D.normaliozeMotor([1, 0, 0.4, 0.4]);
  const sPose2 = PGA2D.normaliozeMotor([1, 0, 0.6, -0.4]);
  let spaceshipTime = 0;
  let spaceshipDir = 1;
  const spaceshipSpeed = 0.01;

  // === SPACESHIP 2 === (Was: interpolating planet2)
  const ship2Pose = new Float32Array([1, 0, -0.3, 0.3, 1, 1]);

  const ship2Nose = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat,
    generateTriangleVertices(0.025, 1, 0.9, 0.2, 0.2, 1),
    ship2Pose
  );
  const ship2Body = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat,
    generateRectangleVertices(0.03, 0.07, 0.9, 0.4, 0.4, 1),
    ship2Pose
  );
  const ship2Left = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat,
    generateCircleVertices(0.01, 20, 1, 0.6, 0.6, 1),
    ship2Pose
  );
  const ship2Right = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat,
    generateCircleVertices(0.01, 20, 1, 0.6, 0.6, 1),
    ship2Pose
  );

  await renderer.appendSceneObject(ship2Nose);
  await renderer.appendSceneObject(ship2Body);
  await renderer.appendSceneObject(ship2Left);
  await renderer.appendSceneObject(ship2Right);

  const keyframes = [
    PGA2D.normaliozeMotor([1, 0, -0.4, 0.4]),
    PGA2D.normaliozeMotor([1, 0, 0.0, -0.4]),
    PGA2D.normaliozeMotor([1, 0, 0.4, 0.4]),
  ];
  let interpTime = 0;
  let currentKeyframe = 0;
  const interpSpeed = 0.01;

  // --- Animation Loop ---
  let planetAngles = {
    mercury: 0,
    venus: 0,
    earth: 0,
    mars: 0,
    jupiter: 0,
    saturn: 0,
    uranus: 0,
    neptune: 0,
  };

  const planetOrbitRadii = {
    mercury: 0.2,
    venus: 0.4,
    earth: 0.6,
    mars: 0.8,
    jupiter: 1.2,
    saturn: 1.6,
    uranus: 2.0,
    neptune: 2.4,
  };

  const planetSpeeds = {
    mercury: Math.PI / 500,
    venus: Math.PI / 400,
    earth: Math.PI / 100,
    mars: Math.PI / 150,
    jupiter: Math.PI / 60,
    saturn: Math.PI / 40,
    uranus: Math.PI / 30,
    neptune: Math.PI / 20,
  };

  let moonAngle = 0;
  const moonOrbitRadius = 0.05;
  const moonSpeed = Math.PI / 50;

  setInterval(() => {
    renderer.render();

    // Update planet positions
    for (let planet in planetAngles) {
      planetAngles[planet] += planetSpeeds[planet];
      const px = planetOrbitRadii[planet] * Math.cos(planetAngles[planet]);
      const py = planetOrbitRadii[planet] * Math.sin(planetAngles[planet]);

      // Update each planet's position
      if (planet === 'earth') {
        // Earth and moon
        window[planet + 'Pose'].set(PGA2D.normaliozeMotor([1, 0, px, py]));

        // Move moon
        moonAngle += moonSpeed;
        const mx = px + moonOrbitRadius * Math.cos(moonAngle);
        const my = py + moonOrbitRadius * Math.sin(moonAngle);
        moonPose.set(PGA2D.normaliozeMotor([1, 0, mx, my]));
      } else {
        // Other planets
        window[planet + 'Pose'].set(PGA2D.normaliozeMotor([1, 0, px, py]));
      }
    }

    // Spaceship 1 movement (linear + eased)
    let t = spaceshipTime;
    if (t <= 0.5) {
      spaceship1Pose.set(lerpMotor(sPose1, sPose2, t * 2));
    } else {
      spaceship1Pose.set(lerpMotor(sPose2, sPose1, sineEase((t - 0.5) * 2)));
    }

    spaceshipTime += spaceshipSpeed * spaceshipDir;
    if (spaceshipTime >= 1 || spaceshipTime <= 0) {
      spaceshipDir *= -1;
      spaceshipTime = Math.max(0, Math.min(1, spaceshipTime));
    }

    // Spaceship 2 keyframe interpolation
    interpTime += interpSpeed;
    if (interpTime >= 1) {
      interpTime = 0;
      currentKeyframe = (currentKeyframe + 1) % keyframes.length;
    }
    ship2Pose.set(lerpMotor(
      keyframes[currentKeyframe],
      keyframes[(currentKeyframe + 1) % keyframes.length],
      interpTime
    ));

  }, 100);

  return renderer;
}

init().then(ret => {
  console.log(ret);
}).catch(error => {
  const pTag = document.createElement('p');
  pTag.innerHTML = navigator.userAgent + "</br>" + error.message;
  document.body.appendChild(pTag);
  document.getElementById("renderCanvas")?.remove();
});
