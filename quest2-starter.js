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

  // --- New Planet Behind (Elliptical Orbit) ---
  const planetBehindVertices = generateCircleVertices(0.03, 40, 0.3, 0.6, 1, 1);
  let planetBehindPose = new Float32Array([1, 0, 0.4, 0, 1, 1]); // New orbit radius 0.4 (behind planet with moon)
  const planetBehind = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, planetBehindVertices, planetBehindPose
  );
  await renderer.appendSceneObject(planetBehind);

  // --- New Planet Behind 2 (even further behind) ---
  const planetBehind2Vertices = generateCircleVertices(0.03, 40, 0.3, 0.6, 1, 1);
  let planetBehind2Pose = new Float32Array([1, 0, 0.5, 0, 1, 1]); // Even further behind with radius 0.5
  const planetBehind2 = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, planetBehind2Vertices, planetBehind2Pose
  );
  await renderer.appendSceneObject(planetBehind2);

  // --- New Planet Behind 3 (even further behind, circular orbit) ---
  const planetBehind3Vertices = generateCircleVertices(0.03, 40, 0.3, 0.6, 1, 1);
  let planetBehind3Pose = new Float32Array([1, 0, 0.6, 0, 1, 1]); // Even further behind with radius 0.6
  const planetBehind3 = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, planetBehind3Vertices, planetBehind3Pose
  );
  await renderer.appendSceneObject(planetBehind3);

  // --- New Planet Behind 4 (even further behind, circular orbit) ---
  const planetBehind4Vertices = generateCircleVertices(0.03, 40, 0.3, 0.6, 1, 1);
  let planetBehind4Pose = new Float32Array([1, 0, 0.7, 0, 1, 1]); // Even further behind with radius 0.7
  const planetBehind4 = new Standard2DPGAPosedVertexColorObject(
    renderer._device, renderer._canvasFormat, planetBehind4Vertices, planetBehind4Pose
  );
  await renderer.appendSceneObject(planetBehind4);

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

  // === SPACESHIP 2 ===
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
  let planet1Angle = 0;
  let planet2Angle = 0;
  let planet3Angle = 0;
  let planetBehindAngle = 0; // Angle for the new elliptical orbit
  let planetBehind2Angle = 0; // Angle for the new planet behind planetBehind
  let planetBehind3Angle = 0; // Angle for the new planet behind planetBehind2
  let planetBehind4Angle = 0; // Angle for the new planet behind planetBehind3
  let moonAngle = 0;
  const planet1OrbitRadius = 0.3;
  const planet2OrbitRadius = 0.2; // New planet 2 closer to the Sun
  const planet3OrbitRadius = 0.1; // New planet 3 closer to the Sun
  const planetBehindOrbitRadiusX = 0.4; // Semi-major axis for elliptical orbit
  const planetBehindOrbitRadiusY = 0.25; // Semi-minor axis for elliptical orbit
  const planetBehind2OrbitRadiusX = 0.5; // Semi-major axis for new planet behind planetBehind
  const planetBehind2OrbitRadiusY = 0.35; // Semi-minor axis for new elliptical orbit
  const planetBehind3OrbitRadius = 0.6; // Orbit radius for the new planet behind planetBehind2 (circular orbit)
  const planetBehind4OrbitRadius = 0.55; // Orbit radius for the new planet behind planetBehind3 (circular orbit)
  const moonOrbitRadius = 0.05;
  const planetSpeed = Math.PI / 100;
  const moonSpeed = Math.PI / 50;

  async function applyPointillism(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;

    // Total number of pixels in the image
    const totalPixels = width * height;

    // Calculate 3% of total pixels for the number of dots
    const dotCount = Math.floor(totalPixels * 0.03);

    // Function to generate a random number between a range
    function getRandom(min, max) {
      return Math.random() * (max - min) + min;
    }

    // Function to apply the pointillism effect
    for (let i = 0; i < dotCount; i++) {
      // Randomly select a pixel index
      const randomPixelIndex = Math.floor(Math.random() * totalPixels);
      const x = randomPixelIndex % width;
      const y = Math.floor(randomPixelIndex / width);

      // Get the color of the randomly selected pixel
      const r = pixels[randomPixelIndex * 4];
      const g = pixels[randomPixelIndex * 4 + 1];
      const b = pixels[randomPixelIndex * 4 + 2];

      // Random radius between 1% and 10% of the image dimensions
      const radius = Math.floor(getRandom(0.01, 0.1) * Math.max(width, height));

      // Apply the effect to all pixels within the circle
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const newX = x + dx;
          const newY = y + dy;

          // Check if the new pixel is within the image bounds and inside the circle
          if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= radius) {
              const index = (newY * width + newX) * 4;
              pixels[index] = r; // Red
              pixels[index + 1] = g; // Green
              pixels[index + 2] = b; // Blue
              pixels[index + 3] = 255; // Alpha (fully opaque)
            }
          }
        }
      }
    }

    // Return the modified image data
    return imageData;
  }

  setInterval(async() => {
    renderer.render();

    // Planet 1
    planet1Angle += planetSpeed;
    const px1 = planet1OrbitRadius * Math.cos(planet1Angle);
    const py1 = planet1OrbitRadius * Math.sin(planet1Angle);
    planet1Pose.set(PGA2D.normaliozeMotor([1, 0, px1, py1]));

    // Planet 1 rotation (rotating the planet around its center)
    const planetRotationSpeed = 0.01;
    let planet1RotationAngle = planet1Angle * planetRotationSpeed; // Adjust rotation speed as needed
    const rotationMatrix = new Float32Array([
      Math.cos(planet1RotationAngle), -Math.sin(planet1RotationAngle),
      Math.sin(planet1RotationAngle), Math.cos(planet1RotationAngle),
    ]);
    for (let i = 0; i < planet1Vertices.length; i += 2) {
      let x = planet1Vertices[i];
      let y = planet1Vertices[i + 1];
      planet1Vertices[i] = x * rotationMatrix[0] + y * rotationMatrix[1];
      planet1Vertices[i + 1] = x * rotationMatrix[2] + y * rotationMatrix[3];
    }
    
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

    // New Planet Behind (elliptical orbit)
    planetBehindAngle += planetSpeed;
    const pxBehind = planetBehindOrbitRadiusX * Math.cos(planetBehindAngle);
    const pyBehind = planetBehindOrbitRadiusY * Math.sin(planetBehindAngle);
    planetBehindPose.set(PGA2D.normaliozeMotor([1, 0, pxBehind, pyBehind]));

    // New Planet Behind 2 (even further behind, elliptical orbit)
    planetBehind2Angle += planetSpeed;
    const pxBehind2 = planetBehind2OrbitRadiusX * Math.cos(planetBehind2Angle);
    const pyBehind2 = planetBehind2OrbitRadiusY * Math.sin(planetBehind2Angle);
    planetBehind2Pose.set(PGA2D.normaliozeMotor([1, 0, pxBehind2, pyBehind2]));

    // New Planet Behind 3 (circular orbit)
    planetBehind3Angle += planetSpeed;
    const pxBehind3 = planetBehind3OrbitRadius * Math.cos(planetBehind3Angle);
    const pyBehind3 = planetBehind3OrbitRadius * Math.sin(planetBehind3Angle);
    planetBehind3Pose.set(PGA2D.normaliozeMotor([1, 0, pxBehind3, pyBehind3]));

    // New Planet Behind 4 (circular orbit)
    planetBehind4Angle += planetSpeed;
    const pxBehind4 = planetBehind4OrbitRadius * Math.cos(planetBehind4Angle);
    const pyBehind4 = planetBehind4OrbitRadius * Math.sin(planetBehind4Angle);
    planetBehind4Pose.set(PGA2D.normaliozeMotor([1, 0, pxBehind4, pyBehind4]));

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

    // Get the image data from the canvas
    const ctx = canvasTag.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvasTag.width, canvasTag.height);

    // Apply the Pointillism effect to the image data
    const pointillizedData = await applyPointillism(imageData);

    // Put the modified image data back to the canvas
    ctx.putImageData(pointillizedData, 0, 0);

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
