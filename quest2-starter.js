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

  // --- Planet 1 + Moon ---
  const planet1Vertices = generateCircleVertices(0.03, 40, 0.2, 0.4, 1, 1);
  let planet1Pose = new Float32Array([1, 0, 0.3, 0, 1, 1]);
  const planet1 = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, planet1Vertices, planet1Pose
  );
  await renderer.appendSceneObject(planet1);

  const moonVertices = generateCircleVertices(0.015, 40, 0.9, 0.9, 0.9, 1);
  let moonPose = new Float32Array([1, 0, 0.35, 0, 1, 1]);
  const moon = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, moonVertices, moonPose
  );
  await renderer.appendSceneObject(moon);

  // --- New Planet 2 (closer to Sun) ---
  const planet2Vertices = generateCircleVertices(0.03, 40, 0.5, 0.5, 1, 1);
  let planet2Pose = new Float32Array([1, 0, 0.2, 0, 1, 1]);
  const planet2 = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, planet2Vertices, planet2Pose
  );
  await renderer.appendSceneObject(planet2);

  // --- New Planet 3 (even closer to Sun) ---
  const planet3Vertices = generateCircleVertices(0.03, 40, 0.8, 0.8, 1, 1);
  let planet3Pose = new Float32Array([1, 0, 0.1, 0, 1, 1]);
  const planet3 = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, planet3Vertices, planet3Pose
  );
  await renderer.appendSceneObject(planet3);

  // --- New Planets (farther from Sun) ---
  const newPlanets = [];
  const planetRadii = [0.4, 0.5, 0.6, 0.7, 0.8]; // Orbital radii for the 5 new planets

  for (let i = 0; i < 5; i++) {
    const radius = planetRadii[i];
    const planetVertices = generateCircleVertices(0.03, 40, Math.random(), Math.random(), Math.random(), 1);
    let planetPose = new Float32Array([1, 0, radius, 0, 1, 1]);
    const planet = new Standard2DPGAPosedVertexColorObject(
      renderer._device, renderer._canvasFormat, planetVertices, planetPose
    );
    newPlanets.push(planet);
    await renderer.appendSceneObject(planet);
  }

  // === SPACESHIP 1 ===
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

  // --- Animation Loop ---
  let planet1Angle = 0;
  let planet2Angle = 0;
  let planet3Angle = 0;
  let moonAngle = 0;
  let newPlanetsAngles = Array(5).fill(0); // For 5 new planets
  const planet1OrbitRadius = 0.3;
  const planet2OrbitRadius = 0.2; // New planet 2 closer to the Sun
  const planet3OrbitRadius = 0.1; // New planet 3 closer to the Sun
  const moonOrbitRadius = 0.05;
  const planetSpeed = Math.PI / 100;
  const moonSpeed = Math.PI / 50;

  setInterval(() => {
    renderer.render();

    // Planet 1
    planet1Angle += planetSpeed;
    const px1 = planet1OrbitRadius * Math.cos(planet1Angle);
    const py1 = planet1OrbitRadius * Math.sin(planet1Angle);
    planet1Pose.set(PGA2D.normaliozeMotor([1, 0, px1, py1]));

    // Planet 2 (closer to Sun)
    planet2Angle += planetSpeed;
    const px2 = planet2OrbitRadius * Math.cos(planet2Angle);
    const py2 = planet2OrbitRadius * Math.sin(planet2Angle);
    planet2Pose.set(PGA2D.normaliozeMotor([1, 0, px2, py2]));

    // Planet 3 (even closer to Sun)
    planet3Angle += planetSpeed;
    const px3 = planet3OrbitRadius * Math.cos(planet3Angle);
    const py3 = planet3OrbitRadius * Math.sin(planet3Angle);
    planet3Pose.set(PGA2D.normaliozeMotor([1, 0, px3, py3]));

    // New Planets (farther from Sun)
    for (let i = 0; i < 5; i++) {
      newPlanetsAngles[i] += planetSpeed;
      const px = planetRadii[i + 3] * Math.cos(newPlanetsAngles[i]); // Start from radius 0.4 and onwards
      const py = planetRadii[i + 3] * Math.sin(newPlanetsAngles[i]);
      newPlanets[i].pose.set(PGA2D.normaliozeMotor([1, 0, px, py]));
    }

    // Moon orbiting Planet 1
    moonAngle += moonSpeed;
    const mx = px1 + moonOrbitRadius * Math.cos(moonAngle);
    const my = py1 + moonOrbitRadius * Math.sin(moonAngle);
    moonPose.set(PGA2D.normaliozeMotor([1, 0, mx, my]));

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
