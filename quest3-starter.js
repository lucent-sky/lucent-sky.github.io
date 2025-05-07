// Import required modules
import Renderer from "/lib/Viz/2DRenderer.js";
import Camera from "/lib/Viz/2DCamera.js";
import CameraLineStrip2DAliveDeadObject from "/lib/DSViz/CameraLineStrip2DAliveDeadObject.js";
import StandardTextObject from "/lib/DSViz/StandardTextObject.js";
import PGA2D from "/lib/Math/PGA2D.js";
import Standard2DPGACameraSceneObject from "/lib/DSViz/Standard2DPGACameraSceneObject.js";

// Initialize the scene
async function init() {
  const canvas = document.createElement("canvas");
  canvas.id = "renderCanvas";
  document.body.appendChild(canvas);

  const renderer = new Renderer(canvas);
  await renderer.init();

  const squareLine = new Float32Array([
    -0.5, -0.5,
     0.5, -0.5,
     0.5,  0.5,
    -0.5,  0.5,
    -0.5, -0.5
  ]);

  const camera = new Camera();
  const width = 256;
  const height = 256;

  const aliveDeadGrid = new CameraLineStrip2DAliveDeadObject(
    renderer._device,
    renderer._canvasFormat,
    camera._pose, // shared reference
    squareLine,
    width,
    height,
    2, 2
  );
  await renderer.appendSceneObject(aliveDeadGrid);

  const cameraPose = new Float32Array([1, 0, 0, 0, 0.025, 0.025]);
  const geometryData = new Float32Array([
    -1, -1, 1, 0, 0, 1,
     1, -1, 0, 1, 0, 1,
    -1,  1, 0, 0, 1, 1,
     1,  1, 1, 0, 1, 1,
    -1,  1, 0, 0, 1, 1,
     1, -1, 0, 1, 0, 1
  ]);

  const geometryObject = new Standard2DPGACameraSceneObject(
    renderer._device,
    renderer._canvasFormat,
    camera._pose, // shared reference
    geometryData,
    cameraPose
  );
  await renderer.appendSceneObject(geometryObject);

  let fps = 1;
  let fpsInterval = 1000 / fps;
  let frameCount = 0;
  let isPlaying = false;

  const textOverlay = new StandardTextObject(`fps: ??\nControls\nz/x: inc/dec fps\nr: play/pause\nc: reset\nq/e: zoom:\nwasd: move`);

  const moveSpeed = 0.05;

  window.addEventListener("keydown", (e) => {
    let moved = false;
    switch (e.key.toLowerCase()) {
      case "w": camera.moveUp(moveSpeed); moved = true; break;
      case "s": camera.moveDown(moveSpeed); moved = true; break;
      case "a": camera.moveLeft(moveSpeed); moved = true; break;
      case "d": camera.moveRight(moveSpeed); moved = true; break;
      case "q": camera.zoomIn(); moved = true; break;
      case "e": camera.zoomOut(); moved = true; break;
      case "f": textOverlay.toggleVisibility(); break;
      case "r": isPlaying = !isPlaying; console.log("isPlaying =", isPlaying); break;
      case "z": if (fps > 1) fps--; fpsInterval = 1000 / fps; console.log("target fps =", fps); break;
      case "x": fps++; fpsInterval = 1000 / fps; console.log("target fps =", fps); break;
      case "c": aliveDeadGrid.randomizeCells(); console.log("resetting sim"); break;
    }
    if (moved) {
      aliveDeadGrid.updateCameraPose();
      geometryObject.updateCameraPose();
    }
  });

  let isDragging = false;
  let lastMouseCell = [0, 0];

  canvas.addEventListener("mousedown", (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;

    const tx = x / camera._pose[4];
    const ty = y / camera._pose[5];

    const point = PGA2D.applyMotorToPoint([tx, ty], camera._pose);

    const gridX = Math.floor((point[0] + 1) / 2 * height) - 128;
    const gridY = Math.floor((point[1] + 1) / 2 * height) - 128;

    aliveDeadGrid.updateCellBuffer(gridX, gridY, 1);
    console.log(`(x,y) = ${tx}, ${ty}`);
  });

  canvas.addEventListener("mouseup", () => {
    isDragging = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;

    const tx = x / camera._pose[4];
    const ty = y / camera._pose[5];

    const worldPoint = PGA2D.applyMotorToPoint([tx, ty], camera._pose);

    const cellX = Math.floor((worldPoint[0] + 1) / 2 * height) - 128;
    const cellY = Math.floor((worldPoint[1] + 1) / 2 * height) - 128;

    console.log(`in cell (${cellX}, ${cellY})`);

    if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
      const centerX = cellX / width * 2 - 1 + 1 / width;
      const centerY = cellY / width * 2 - 1 + 1 / width;

      if (
        Math.abs(worldPoint[0] - centerX) <= 0.05 &&
        Math.abs(worldPoint[1] - centerY) <= 0.05
      ) {
        console.log(`boundary cell found, cell (${cellX}, ${cellY})`);
      }
    }

    if (isDragging) {
      const dx = worldPoint[0] - lastMouseCell[0];
      const dy = worldPoint[1] - lastMouseCell[1];

      if (Math.sqrt(dx * dx + dy * dy) > 0.001) {
        const translator = PGA2D.createTranslator(dx / cameraPose[4], dy / cameraPose[5]);
        const newMotor = PGA2D.normaliozeMotor(
          PGA2D.geometricProduct(translator, cameraPose)
        );

        cameraPose.set(newMotor.slice(0, 4));
        geometryObject.updateGeometry();
        lastMouseCell = worldPoint;
      }
    }
  });

  let lastFrameTime = Date.now();

  const renderLoop = () => {
    const elapsed = Date.now() - lastFrameTime;
    if (elapsed > fpsInterval) {
      frameCount++;
      lastFrameTime = Date.now() - (elapsed % fpsInterval);
      renderer.render(isPlaying);
    }
    requestAnimationFrame(renderLoop);
  };

  renderLoop();

  setInterval(() => {
    textOverlay.updateText(`fps: ${frameCount}\nControls\nz/x: inc/dec fps\nr: play/pause\nc: reset\nq/e: zoom:\nwasd: move`);
    frameCount = 0;
  }, 1000);

  return renderer;
}

init()
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    const msg = document.createElement("p");
    msg.innerHTML = navigator.userAgent + "<br>" + err.message;
    document.body.appendChild(msg);
    document.getElementById("renderCanvas")?.remove();
  });
