let canvas, gl, manualInterpolationNeeded;
let camera,
  simCamera,
  scene,
  simScene,
  renderer,
  aspectRatio,
  controls,
  raycaster,
  clampedCoords;
let simTextureA, simTextureB, postTexture, interpolationTexture, simTextureOpts;
let basicMaterial,
  displayMaterial,
  drawMaterial,
  simMaterial,
  clearMaterial,
  copyMaterial,
  postMaterial,
  interpolationMaterial;
let domain, simDomain, simpleDomain;
let options, uniforms, funsObj;
let leftGUI,
  rightGUI,
  root,
  pauseButton,
  resetButton,
  brushRadiusController,
  drawIn3DController,
  fController,
  gController,
  hController,
  algebraicVController,
  algebraicWController,
  crossDiffusionController,
  domainIndicatorFunController,
  DuuController,
  DuvController,
  DuwController,
  DvuController,
  DvvController,
  DvwController,
  DwuController,
  DwvController,
  DwwController,
  dtController,
  whatToDrawController,
  threeDHeightScaleController,
  cameraThetaController,
  cameraPhiController,
  cameraZoomController,
  forceManualInterpolationController,
  smoothingScaleController,
  whatToPlotController,
  minColourValueController,
  maxColourValueController,
  setColourRangeController,
  autoSetColourRangeController,
  clearValueUController,
  clearValueVController,
  clearValueWController,
  uBCsController,
  vBCsController,
  wBCsController,
  dirichletUController,
  dirichletVController,
  dirichletWController,
  neumannUController,
  neumannVController,
  neumannWController,
  robinUController,
  robinVController,
  robinWController,
  fIm,
  fMisc,
  imControllerOne,
  imControllerTwo,
  genericOptionsFolder,
  showAllStandardTools,
  showAll;
let isRunning, isDrawing, hasDrawn, lastBadParam;
let inTex, outTex;
let nXDisc, nYDisc, domainWidth, domainHeight, maxDim;
let parametersFolder,
  kineticParamsStrs = {},
  kineticParamsLabels = [],
  kineticParamsCounter = 0;
const listOfTypes = [
  "1Species", // 0
  "2Species", // 1
  "2SpeciesCrossDiffusion", // 2
  "2SpeciesCrossDiffusionAlgebraicV", // 3
  "3Species", // 4
  "3SpeciesCrossDiffusion", // 5
  "3SpeciesCrossDiffusionAlgebraicW", // 6
];
let equationType, savedHTML;
let takeAScreenshot = false;
let buffer,
  bufferFilled = false;
const numsAsWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

import {
  discShader,
  vLineShader,
  hLineShader,
  drawShaderBot,
  drawShaderTop,
} from "./drawing_shaders.js";
import {
  computeDisplayFunShaderTop,
  computeDisplayFunShaderMid,
  computeMaxSpeciesShaderMid,
  postGenericShaderBot,
  postShaderDomainIndicator,
  interpolationShader,
} from "./post_shaders.js";
import { copyShader } from "../copy_shader.js";
import {
  RDShaderTop,
  RDShaderBot,
  RDShaderDirichletX,
  RDShaderDirichletY,
  RDShaderDirichletIndicatorFun,
  RDShaderRobinX,
  RDShaderRobinY,
  RDShaderUpdateNormal,
  RDShaderUpdateCross,
  RDShaderAlgebraicV,
  RDShaderAlgebraicW,
} from "./simulation_shaders.js";
import { randShader } from "../rand_shader.js";
import { fiveColourDisplay, surfaceVertexShader } from "./display_shaders.js";
import { genericVertexShader } from "../generic_shaders.js";
import { getPreset } from "./presets.js";
import { clearShaderBot, clearShaderTop } from "./clear_shader.js";
import * as THREE from "../three.module.js";
import { OrbitControls } from "../OrbitControls.js";
import { minifyPreset, maxifyPreset } from "./minify_preset.js";
import { LZString } from "../lz-string.min.js";
import { equationTEXFun } from "./TEX.js";
let equationTEX = equationTEXFun();

// Setup some configurable options.
options = {};

funsObj = {
  reset: function () {
    resetSim();
  },
  pause: function () {
    if (isRunning) {
      pauseSim();
    } else {
      playSim();
    }
  },
  copyConfigAsURL: function () {
    let objDiff = diffObjects(options, getPreset("default"));
    objDiff.preset = "Custom";
    objDiff = minifyPreset(objDiff);
    let str = [
      location.href.replace(location.search, ""),
      "?options=",
      LZString.compressToEncodedURIComponent(JSON.stringify(objDiff)),
    ].join("");
    navigator.clipboard.writeText(str);
  },
  copyConfigAsJSON: function () {
    let objDiff = diffObjects(options, getPreset("default"));
    objDiff.preset = "PRESETNAME";
    if (objDiff.hasOwnProperty("kineticParams")) {
      // If kinetic params have been specified, replace any commas with semicolons
      // to allow for pretty formatting of the JSON.
      objDiff.kineticParams = objDiff.kineticParams.replaceAll(",", ";");
    }
    let str = JSON.stringify(objDiff)
      .replaceAll(",", ",\n\t")
      .replaceAll(":", ": ")
      .replace("{", "{\n\t")
      .replace("}", ",\n}");
    str = 'case "PRESETNAME":\n\toptions = ' + str + ";\nbreak;";
    navigator.clipboard.writeText(str);
  },
  setColourRange: function () {
    let valRange = getMinMaxVal();
    if (Math.abs(valRange[0] - valRange[1]) < 0.005) {
      // If the range is just one value, make the range width equal to 0.005 centered on the given value.
      const meanVal = (valRange[0] + valRange[1]) / 2;
      valRange[0] = meanVal - 0.0025;
      valRange[1] = meanVal + 0.0025;
    }
    options.minColourValue = valRange[0];
    options.maxColourValue = valRange[1];
    uniforms.maxColourValue.value = options.maxColourValue;
    uniforms.minColourValue.value = options.minColourValue;
    maxColourValueController.updateDisplay();
    minColourValueController.updateDisplay();
    updateColourbarLims();
  },
  linePlot: function () {
    options.oneDimensional = true;
    options.cameraTheta = 0.5;
    options.cameraPhi = 0;
    options.threeD = true;
    resize();
    setRDEquations();
    configureGUI();
    configureCamera();
  },
  debug: function () {
    // Write lots of data to the clipboard.
    let str = "";
    str += JSON.stringify(options);
    str += JSON.stringify(uniforms);
    str += JSON.stringify({
      nXDisc: nXDisc,
      nYDisc: nYDisc,
      domainHeight: domainHeight,
      domainWidth: domainWidth,
      aspectRatio: aspectRatio,
      canvas: canvas.getBoundingClientRect(),
    });
    navigator.clipboard.writeText(str);
  },
  debugSmallSquare: function () {
    $("#simCanvas").css("width", "200px");
    $("#simCanvas").css("height", "200px");
    resize();
  },
  debugSmallRect: function () {
    $("#simCanvas").css("width", "200px");
    $("#simCanvas").css("height", "400px");
    resize();
  },
  debugTallRect: function () {
    $("#simCanvas").css("width", "200px");
    $("#simCanvas").css("height", "600px");
    resize();
  },
  debugTallerRect: function () {
    $("#simCanvas").css("width", "200px");
    $("#simCanvas").css("height", "800px");
    resize();
  },
  debugWideRect: function () {
    $("#simCanvas").css("width", "400px");
    $("#simCanvas").css("height", "600px");
    resize();
  },
  debugHundredTall: function () {
    $("#simCanvas").css("width", "400px");
    $("#simCanvas").css("height", "100%");
    resize();
  },
  debugHundredVHTall: function () {
    $("#simCanvas").css("width", "400px");
    $("#simCanvas").css("height", "100vh");
    resize();
  },
};

// Get the canvas to draw on, as specified by the html.
canvas = document.getElementById("simCanvas");

// Warn the user is any errors occur.
console.error = function (error) {
  let msg =
    "<p>VisualPDE is throwing an error, most likely as a result of the definitions and parameters. Check for syntax errors, and reload the page if the interface is unresponsive. Click to dismiss.</p><p>" +
    error.toString().match(/ERROR.*/) +
    "</p>";
  $("#error").html(msg);
  fadein("#error");
  $("#error").one("click", () => fadeout("#error"));
  return error;
};

// Remove the back button if we're from an internal link.
if (!fromExternalLink()) {
  $("#back").hide();
  $("#equations").addClass("top");
}

var readFromTextureB = true;

// Warn the user about flashing images and ask for cookie permission to store this.
if (!warningCookieExists()) {
  // Display the warning message.
  $("#warning").css("display", "block");
  const permission = await Promise.race([
    waitListener(document.getElementById("warning_ok"), "click", true),
    waitListener(document.getElementById("warning_no"), "click", false),
  ]);
  if (permission) {
    setWarningCookie();
  }
  $("#warning").css("display", "none");
}

// Load default options.
loadOptions("default");

// Initialise simulation and GUI.
init();

// Check URL for any preset or specified options.
const params = new URLSearchParams(window.location.search);
if (params.has("preset")) {
  // If a preset is specified, load it.
  loadPreset(params.get("preset"));
}
if (params.has("options")) {
  // If options have been provided, apply them on top of loaded options.
  var newParams = JSON.parse(
    LZString.decompressFromEncodedURIComponent(params.get("options"))
  );
  if (newParams.hasOwnProperty("p")) {
    // This has been minified, so maxify before loading.
    newParams = maxifyPreset(newParams);
  }
  loadPreset(newParams);
}

if (
  (fromExternalLink() || options.preset == "default") &&
  !options.suppressTryClickingPopup
) {
  $("#try_clicking").html("<p>" + options.tryClickingText + "</p>");
  fadein("#try_clicking");
  setTimeout(() => fadeout("#try_clicking"), 5000);
}

// Begin the simulation.
animate();

//---------------

function init() {
  // Define uniforms to be sent to the shaders.
  initUniforms();

  isDrawing = false;
  raycaster = new THREE.Raycaster();
  clampedCoords = new THREE.Vector2();

  // Create a renderer.
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
    antialias: false,
  });
  renderer.autoClear = true;
  gl = renderer.getContext();
  // Check if we should be interpolating manual.
  manualInterpolationNeeded = !(
    gl.getExtension("OES_texture_float_linear") &&
    gl.getExtension("EXT_float_blend")
  );

  // Configure textures with placeholder sizes.
  simTextureOpts = {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.NearestFilter,
  };
  // If you're on Android, you must use a NEAREST magnification filter to avoid rounding issues.
  manualInterpolationNeeded |= /android/i.test(navigator.userAgent);
  manualInterpolationNeeded
    ? (simTextureOpts.magFilter = THREE.NearestFilter)
    : (simTextureOpts.magFilter = THREE.LinearFilter);
  simTextureA = new THREE.WebGLRenderTarget(
    options.maxDisc,
    options.maxDisc,
    simTextureOpts
  );
  simTextureB = simTextureA.clone();
  postTexture = simTextureA.clone();
  interpolationTexture = simTextureA.clone();

  // Periodic boundary conditions (for now).
  simTextureA.texture.wrapS = THREE.RepeatWrapping;
  simTextureA.texture.wrapT = THREE.RepeatWrapping;
  simTextureB.texture.wrapS = THREE.RepeatWrapping;
  simTextureB.texture.wrapT = THREE.RepeatWrapping;
  postTexture.texture.wrapS = THREE.RepeatWrapping;
  postTexture.texture.wrapT = THREE.RepeatWrapping;

  // Create cameras for the simulation domain and the final output.
  camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 10);
  controls = new OrbitControls(camera, canvas);
  controls.listenToKeyEvents(document);
  controls.addEventListener("change", function () {
    if (options.threeD) {
      options.cameraTheta =
        90 - (180 * Math.atan2(camera.position.z, camera.position.y)) / Math.PI;
      options.cameraPhi =
        (180 * Math.atan2(camera.position.x, camera.position.z)) / Math.PI;
      options.cameraZoom = camera.zoom;
      refreshGUI(rightGUI);
      render();
    }
  });

  simCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 10);
  simCamera.position.z = 1;

  // Create two scenes: one for simulation, another for drawing.
  scene = new THREE.Scene();
  simScene = new THREE.Scene();

  scene.add(camera);
  scene.background = new THREE.Color(options.backgroundColour);

  basicMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  // This material will display the output of the simulation.
  displayMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: genericVertexShader(),
    transparent: true,
    side: THREE.DoubleSide,
  });
  // This material performs any postprocessing before display.
  postMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: genericVertexShader(),
  });
  // This material performs bilinear interpolation.
  interpolationMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: genericVertexShader(),
    fragmentShader: interpolationShader(),
  });
  // This material allows for drawing via a number of fragment shaders, which will be swapped in before use.
  drawMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: genericVertexShader(),
  });
  // This material performs the timestepping.
  simMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: genericVertexShader(),
  });
  copyMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: genericVertexShader(),
    fragmentShader: copyShader(),
  });
  // A material for clearing the domain.
  clearMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: genericVertexShader(),
  });

  createDisplayDomains();

  const simPlane = new THREE.PlaneGeometry(1.0, 1.0);
  simDomain = new THREE.Mesh(simPlane, simMaterial);
  simDomain.position.z = 0;
  simScene.add(simDomain);

  // Configure the camera.
  configureCamera();

  // Set the size of the domain and related parameters.
  setCanvasShape();
  resize();

  // Create a GUI.
  initGUI();

  // Configure the GUI.
  configureGUI();

  // Set up the problem.
  updateProblem();

  // Set the brush type.
  setBrushType();

  // Add shaders to the textures.
  setDrawAndDisplayShaders();
  setClearShader();

  // Configure interpolation.
  configureManualInterpolation();

  // Set the initial condition.
  resetSim();

  // Listen for pointer events.
  canvas.addEventListener("pointerdown", onDocumentPointerDown);
  canvas.addEventListener("pointerup", onDocumentPointerUp);
  canvas.addEventListener("pointermove", onDocumentPointerMove);

  document.addEventListener("keypress", function onEvent(event) {
    event = event || window.event;
    var target = event.target;
    var targetTagName =
      target.nodeType == 1 ? target.nodeName.toUpperCase() : "";
    if (!/INPUT|SELECT|TEXTAREA/.test(targetTagName)) {
      if (event.key === "r") {
        $("#erase").click();
      }
      if (event.key === " ") {
        if (isRunning) {
          pauseSim();
        } else {
          playSim();
        }
      }
    }
  });

  window.addEventListener("resize", resize, false);
}

function resize() {
  // Set the resolution of the simulation domain and the renderer.
  setSizes();
  // Assign sizes to textures.
  resizeTextures();
  // Update any uniforms.
  updateUniforms();
  // Create new display domains with the correct sizes.
  replaceDisplayDomains();
  // Configure the camera.
  configureCamera();
  render();
}

function replaceDisplayDomains() {
  domain.geometry.dispose();
  scene.remove(domain);
  simpleDomain.geometry.dispose();
  scene.remove(simpleDomain);
  createDisplayDomains();
}

function configureCamera() {
  computeCanvasSizesAndAspect();
  if (options.threeD) {
    controls.enabled = true;
    camera.zoom = options.cameraZoom;
    const pos = new THREE.Vector3().setFromSphericalCoords(
      1,
      Math.PI / 2 - (options.cameraTheta * Math.PI) / 180,
      (options.cameraPhi * Math.PI) / 180
    );
    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(0, 0, 0);
    displayMaterial.vertexShader = surfaceVertexShader();
    displayMaterial.needsUpdate = true;
  } else {
    controls.enabled = false;
    controls.reset();
    displayMaterial.vertexShader = genericVertexShader();
    displayMaterial.needsUpdate = true;
  }
  camera.left = -domainWidth / (2 * maxDim);
  camera.right = domainWidth / (2 * maxDim);
  camera.top = domainHeight / (2 * maxDim);
  camera.bottom = -domainHeight / (2 * maxDim);
  camera.updateProjectionMatrix();
  setDomainOrientation();
}

function roundBrushSizeToPix() {
  options.brushRadius =
    Math.round(uniforms.brushRadius.value / options.spatialStep) *
    options.spatialStep;
  uniforms.brushRadius.value = options.brushRadius;
  brushRadiusController.updateDisplay();
}

function updateUniforms() {
  uniforms.brushRadius.value = options.brushRadius;
  uniforms.domainHeight.value = domainHeight;
  uniforms.domainWidth.value = domainWidth;
  uniforms.dt.value = options.dt;
  uniforms.dx.value = domainWidth / nXDisc;
  uniforms.dy.value = domainHeight / nYDisc;
  uniforms.heightScale.value = options.threeDHeightScale;
  uniforms.L.value = options.domainScale;
  uniforms.maxColourValue.value = options.maxColourValue;
  uniforms.minColourValue.value = options.minColourValue;
  if (!options.fixRandSeed) {
    updateRandomSeed();
  }
}

function computeCanvasSizesAndAspect() {
  aspectRatio =
    canvas.getBoundingClientRect().height /
    canvas.getBoundingClientRect().width;
  // Set the domain size, setting the largest side to be of size options.domainScale.
  if (aspectRatio >= 1) {
    domainHeight = options.domainScale;
    domainWidth = domainHeight / aspectRatio;
  } else {
    domainWidth = options.domainScale;
    domainHeight = domainWidth * aspectRatio;
  }
  uniforms.domainHeight.value = domainHeight;
  uniforms.domainWidth.value = domainWidth;
  maxDim = Math.max(domainWidth, domainHeight);
}

function setSizes() {
  computeCanvasSizesAndAspect();
  // Using the user-specified spatial step size, compute as close a discretisation as possible that
  // doesn't reduce the step size below the user's choice.
  if (options.spatialStep == 0) {
    // Prevent a crash if a 0 spatial step is specified.
    alert(
      "Oops! A spatial step of 0 would almost certainly crash your device. We've reset it to 1% of the maximum domain length to prevent this."
    );
    options.spatialStep = options.domainScale / 100;
  }
  nXDisc = Math.floor(domainWidth / options.spatialStep);
  nYDisc = Math.floor(domainHeight / options.spatialStep);
  // If the user has specified that this is a 1D problem, set nYDisc = 1.
  if (options.oneDimensional) {
    nYDisc = 1;
  }
  // Update these values in the uniforms.
  uniforms.nXDisc.value = nXDisc;
  uniforms.nYDisc.value = nYDisc;
  // Set the size of the renderer, which will interpolate from the textures.
  renderer.setSize(options.renderSize, options.renderSize, false);
  buffer = new Float32Array(nXDisc * nYDisc * 4);
  bufferFilled = false;
}

function createDisplayDomains() {
  computeCanvasSizesAndAspect();
  const plane = new THREE.PlaneGeometry(
    domainWidth / maxDim,
    domainHeight / maxDim,
    options.renderSize,
    options.renderSize
  );
  domain = new THREE.Mesh(plane, displayMaterial);
  domain.position.z = 0;
  scene.add(domain);

  // Create an invisible, low-poly plane used for raycasting.
  const simplePlane = new THREE.PlaneGeometry(
    domainWidth / maxDim,
    domainHeight / maxDim,
    1,
    1
  );
  simpleDomain = new THREE.Mesh(simplePlane, basicMaterial);
  simpleDomain.position.z = 0;
  simpleDomain.visible = false;
  scene.add(simpleDomain);
  setDomainOrientation();
}

function setDomainOrientation() {
  if (options.threeD) {
    domain.rotation.x = -Math.PI / 2;
    simpleDomain.rotation.x = -Math.PI / 2;
  } else {
    domain.rotation.x = 0;
    simpleDomain.rotation.x = 0;
  }
}

function setCanvasShape() {
  if (options.squareCanvas) {
    document.getElementById("simCanvas").className = "squareCanvas";
  } else {
    document.getElementById("simCanvas").className = "fullCanvas";
  }
}

function resizeTextures() {
  // Resize the computational domain by interpolating the existing domain onto the new discretisation.
  simDomain.material = copyMaterial;

  if (!readFromTextureB) {
    uniforms.textureSource.value = simTextureA.texture;
    simTextureB.setSize(nXDisc, nYDisc);
    renderer.setRenderTarget(simTextureB);
    renderer.render(simScene, simCamera);
    simTextureA.dispose();
    simTextureA = simTextureB.clone();
    uniforms.textureSource.value = simTextureB.texture;
  } else {
    uniforms.textureSource.value = simTextureB.texture;
    simTextureA.setSize(nXDisc, nYDisc);
    renderer.setRenderTarget(simTextureA);
    renderer.render(simScene, simCamera);
    simTextureB.dispose();
    simTextureB = simTextureA.clone();
    uniforms.textureSource.value = simTextureA.texture;
  }
  readFromTextureB = !readFromTextureB;
  postTexture.setSize(nXDisc, nYDisc);
  // The interpolationTexture will be larger by a scale factor sf.
  interpolationTexture.setSize(
    (options.smoothingScale + 1) * nXDisc,
    (options.smoothingScale + 1) * nYDisc
  );
}

function initUniforms() {
  uniforms = {
    boundaryValues: {
      type: "v2",
    },
    brushCoords: {
      type: "v2",
      value: new THREE.Vector2(0.5, 0.5),
    },
    brushRadius: {
      type: "f",
      value: options.domainScale / 100,
    },
    colour1: {
      type: "v4",
      value: new THREE.Vector4(0, 0, 0.0, 0),
    },
    colour2: {
      type: "v4",
      value: new THREE.Vector4(0, 1, 0, 0.2),
    },
    colour3: {
      type: "v4",
      value: new THREE.Vector4(1, 1, 0, 0.21),
    },
    colour4: {
      type: "v4",
      value: new THREE.Vector4(1, 0, 0, 0.4),
    },
    colour5: {
      type: "v4",
      value: new THREE.Vector4(1, 1, 1, 0.6),
    },
    domainHeight: {
      type: "f",
    },
    domainWidth: {
      type: "f",
    },
    dt: {
      type: "f",
      value: 0.01,
    },
    // Discrete step sizes in the texture, which will be set later.
    dx: {
      type: "f",
    },
    dy: {
      type: "f",
    },
    heightScale: {
      type: "f",
    },
    imageSourceOne: {
      type: "t",
    },
    imageSourceTwo: {
      type: "t",
    },
    L: {
      type: "f",
    },
    maxColourValue: {
      type: "f",
      value: 1.0,
    },
    minColourValue: {
      type: "f",
      value: 0.0,
    },
    nXDisc: {
      type: "i",
    },
    nYDisc: {
      type: "i",
    },
    seed: {
      type: "f",
      value: 0.0,
    },
    textureSource: {
      type: "t",
    },
    t: {
      type: "f",
      value: 0.0,
    },
  };
}

function initGUI(startOpen) {
  // Initialise the left GUI.
  leftGUI = new dat.GUI({ closeOnTop: true });
  leftGUI.domElement.id = "leftGUI";

  // Initialise the right GUI.
  rightGUI = new dat.GUI({ closeOnTop: true });
  rightGUI.domElement.id = "rightGUI";

  leftGUI.open();
  rightGUI.open();
  if (startOpen != undefined && startOpen) {
    $("#leftGUI").show();
    $("#rightGUI").show();
    $("#equation_display").show();
  } else {
    $("#leftGUI").hide();
    $("#rightGUI").hide();
    $("#equation_display").hide();
  }

  // Create a generic options folder for folderless controllers, which we'll hide later if it's empty.
  genericOptionsFolder = rightGUI.addFolder("Options");

  // Brush folder.
  if (inGUI("brushFolder")) {
    root = rightGUI.addFolder("Brush");
  } else {
    root = genericOptionsFolder;
  }

  if (inGUI("typeOfBrush")) {
    root
      .add(options, "typeOfBrush", {
        Disk: "circle",
        "Horizontal line": "hline",
        "Vertical line": "vline",
      })
      .name("Type")
      .onChange(setBrushType);
  }
  if (inGUI("brushValue")) {
    root.add(options, "brushValue").name("Value").onFinishChange(setBrushType);
  }
  if (inGUI("brushRadius")) {
    brushRadiusController = root
      .add(options, "brushRadius")
      .name("Radius")
      .onChange(updateUniforms);
    brushRadiusController.min(0);
  }
  if (inGUI("whatToDraw")) {
    whatToDrawController = root
      .add(options, "whatToDraw", { u: "u", v: "v", w: "w" })
      .name("Species")
      .onChange(setBrushType);
  }
  if (inGUI("drawIn3D")) {
    drawIn3DController = root.add(options, "drawIn3D").name("3D enabled");
  }

  // Domain folder.
  if (inGUI("domainFolder")) {
    root = rightGUI.addFolder("Domain");
  } else {
    root = genericOptionsFolder;
  }
  if (inGUI("domainScale")) {
    root.add(options, "domainScale").name("Largest side").onChange(resize);
  }
  if (inGUI("spatialStep")) {
    const dxController = root
      .add(options, "spatialStep")
      .name("Space step")
      .onChange(function () {
        resize();
      })
      .onFinishChange(roundBrushSizeToPix);
    dxController.__precision = 12;
    dxController.min(0);
    dxController.updateDisplay();
  }
  if (inGUI("squareCanvas")) {
    root
      .add(options, "squareCanvas")
      .name("Square display")
      .onFinishChange(function () {
        setCanvasShape();
        resize();
        configureCamera();
      });
  }
  if (inGUI("oneDimensional")) {
    const oneDimensionalController = root
      .add(options, "oneDimensional")
      .name("1D")
      .onFinishChange(function () {
        resize();
        setRDEquations();
        configureIntegralDisplay();
      });
  }
  if (inGUI("domainViaIndicatorFun")) {
    root
      .add(options, "domainViaIndicatorFun")
      .name("Implicit")
      .onFinishChange(function () {
        configureOptions();
        configureGUI();
        setRDEquations();
      });
  }
  if (inGUI("domainIndicatorFun")) {
    domainIndicatorFunController = root
      .add(options, "domainIndicatorFun")
      .name("Ind. fun")
      .onFinishChange(function () {
        configureOptions();
        configureGUI();
        setRDEquations();
        updateWhatToPlot();
      });
  }

  // Timestepping folder.
  if (inGUI("timesteppingFolder")) {
    root = rightGUI.addFolder("Timestepping");
  } else {
    root = genericOptionsFolder;
  }
  if (inGUI("numTimestepsPerFrame")) {
    root.add(options, "numTimestepsPerFrame", 1, 400, 1).name("Steps/frame");
  }
  if (inGUI("dt")) {
    dtController = root
      .add(options, "dt")
      .name("Timestep")
      .onChange(function () {
        updateUniforms();
      });
    dtController.__precision = 12;
    dtController.min(0);
    dtController.updateDisplay();
  }
  if (inGUI("timeDisplay")) {
    root
      .add(options, "timeDisplay")
      .name("Show time")
      .onChange(configureTimeDisplay);
  }

  // Equations folder.
  if (inGUI("equationsFolder")) {
    root = rightGUI.addFolder("Equations");
  } else {
    root = genericOptionsFolder;
  }
  // Number of species.
  if (inGUI("numSpecies")) {
    root
      .add(options, "numSpecies", { 1: 1, 2: 2, 3: 3 })
      .name("No. species")
      .onChange(updateProblem);
  }
  // Cross diffusion.
  if (inGUI("crossDiffusion")) {
    crossDiffusionController = root
      .add(options, "crossDiffusion")
      .name("Cross diffusion")
      .onChange(updateProblem);
  }
  if (inGUI("algebraicV")) {
    algebraicVController = root
      .add(options, "algebraicV")
      .name("Algebraic v?")
      .onChange(updateProblem);
  }
  if (inGUI("algebraicW")) {
    algebraicWController = root
      .add(options, "algebraicW")
      .name("Algebraic w?")
      .onChange(updateProblem);
  }
  if (inGUI("typesetCustomEqs")) {
    root
      .add(options, "typesetCustomEqs")
      .name("Typeset")
      .onChange(setEquationDisplayType);
  }

  // Let's put these in the left GUI.
  // Definitions folder.
  if (inGUI("definitionsFolder")) {
    root = leftGUI.addFolder("Definitions");
  } else {
    root = genericOptionsFolder;
  }
  if (inGUI("diffusionStrUU")) {
    DuuController = root
      .add(options, "diffusionStrUU")
      .name("$D_{uu}$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("diffusionStrUV")) {
    DuvController = root
      .add(options, "diffusionStrUV")
      .name("$D_{uv}$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("diffusionStrUW")) {
    DuwController = root
      .add(options, "diffusionStrUW")
      .name("$D_{uw}$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("diffusionStrVU")) {
    DvuController = root
      .add(options, "diffusionStrVU")
      .name("$D_{vu}$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("diffusionStrVV")) {
    DvvController = root
      .add(options, "diffusionStrVV")
      .name("$D_{vv}$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("diffusionStrVW")) {
    DvwController = root
      .add(options, "diffusionStrVW")
      .name("$D_{vw}$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("diffusionStrWU")) {
    DwuController = root
      .add(options, "diffusionStrWU")
      .name("$D_{wu}$")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("diffusionStrWV")) {
    DwvController = root
      .add(options, "diffusionStrWV")
      .name("$D_{wv}$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("diffusionStrWW")) {
    DwwController = root
      .add(options, "diffusionStrWW")
      .name("$D_{ww}$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("reactionStrU")) {
    // Custom f(u,v) and g(u,v).
    fController = root
      .add(options, "reactionStrU")
      .name("$f$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("reactionStrV")) {
    gController = root
      .add(options, "reactionStrV")
      .name("$g$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  if (inGUI("reactionStrW")) {
    hController = root
      .add(options, "reactionStrW")
      .name("$h$")
      .title("function of u, v, w, t")
      .onFinishChange(function () {
        setRDEquations();
        setEquationDisplayType();
      });
  }
  parametersFolder = leftGUI.addFolder("Parameters");
  setParamsFromKineticString();

  // Boundary conditions folder.
  if (inGUI("boundaryConditionsFolder")) {
    root = leftGUI.addFolder("Boundary conditions");
  } else {
    root = genericOptionsFolder;
  }
  if (inGUI("boundaryConditionsU")) {
    uBCsController = root
      .add(options, "boundaryConditionsU", {
        Periodic: "periodic",
        Dirichlet: "dirichlet",
        Neumann: "neumann",
        Robin: "robin",
      })
      .name("$u$")
      .onChange(function () {
        setRDEquations();
        setBCsGUI();
      });
  }
  if (inGUI("dirichletU")) {
    dirichletUController = root
      .add(options, "dirichletStrU")
      .name("$\\left.u\\right\\rvert_{\\boundary}$")
      .onFinishChange(setRDEquations);
  }
  if (inGUI("neumannStrU")) {
    neumannUController = root
      .add(options, "neumannStrU")
      .name("$\\left.\\pd{u}{n}\\right\\rvert_{\\boundary}$")
      .onFinishChange(setRDEquations);
  }
  if (inGUI("robinStrU")) {
    robinUController = root
      .add(options, "robinStrU")
      .name("$\\left.\\pd{u}{n}\\right\\rvert_{\\boundary}$")
      .onFinishChange(setRDEquations);
  }
  if (inGUI("boundaryConditionsV")) {
    vBCsController = root
      .add(options, "boundaryConditionsV", {
        Periodic: "periodic",
        Dirichlet: "dirichlet",
        Neumann: "neumann",
        Robin: "robin",
      })
      .name("$v$")
      .onChange(function () {
        setRDEquations();
        setBCsGUI();
      });
  }
  if (inGUI("dirichletV")) {
    dirichletVController = root
      .add(options, "dirichletStrV")
      .name("$\\left.v\\right\\rvert_{\\boundary}$")
      .onFinishChange(setRDEquations);
  }
  if (inGUI("neumannStrV")) {
    neumannVController = root
      .add(options, "neumannStrV")
      .name("$\\left.\\pd{v}{n}\\right\\rvert_{\\boundary}$")
      .onFinishChange(setRDEquations);
  }
  if (inGUI("robinStrV")) {
    robinVController = root
      .add(options, "robinStrV")
      .name("$\\left.\\pd{v}{n}\\right\\rvert_{\\boundary}$")
      .onFinishChange(setRDEquations);
  }
  if (inGUI("boundaryConditionsW")) {
    wBCsController = root
      .add(options, "boundaryConditionsW", {
        Periodic: "periodic",
        Dirichlet: "dirichlet",
        Neumann: "neumann",
        Robin: "robin",
      })
      .name("$w$")
      .onChange(function () {
        setRDEquations();
        setBCsGUI();
      });
  }
  if (inGUI("dirichletW")) {
    dirichletWController = root
      .add(options, "dirichletStrW")
      .name("$\\left.w\\right\\rvert_{\\boundary}$")
      .onFinishChange(setRDEquations);
  }
  if (inGUI("neumannStrW")) {
    neumannWController = root
      .add(options, "neumannStrW")
      .name("$\\left.\\pd{w}{n}\\right\\rvert_{\\boundary}$")
      .onFinishChange(setRDEquations);
  }
  if (inGUI("robinStrW")) {
    robinWController = root
      .add(options, "robinStrW")
      .name("$\\left.\\pd{w}{n}\\right\\rvert_{\\boundary}$")
      .onFinishChange(setRDEquations);
  }

  // Initial conditions folder.
  if (inGUI("initFolder")) {
    root = leftGUI.addFolder("Initial conditions");
  } else {
    root = genericOptionsFolder;
  }
  if (inGUI("clearValueU")) {
    clearValueUController = root
      .add(options, "clearValueU")
      .name("$\\left.u\\right\\rvert_{t=0}$")
      .onFinishChange(setClearShader);
  }
  if (inGUI("clearValueV")) {
    clearValueVController = root
      .add(options, "clearValueV")
      .name("$\\left.v\\right\\rvert_{t=0}$")
      .onFinishChange(setClearShader);
  }
  if (inGUI("clearValueW")) {
    clearValueWController = root
      .add(options, "clearValueW")
      .name("$\\left.w\\right\\rvert_{t=0}$")
      .onFinishChange(setClearShader);
  }

  // Rendering folder.
  if (inGUI("renderingFolder")) {
    root = rightGUI.addFolder("Rendering");
  } else {
    root = genericOptionsFolder;
  }
  if (inGUI("whatToPlot")) {
    whatToPlotController = root
      .add(options, "whatToPlot")
      .name("Expression: ")
      .onFinishChange(function () {
        updateWhatToPlot();
        render();
      });
  }
  if (inGUI("renderSize")) {
    root
      .add(options, "renderSize", 1, 2048, 1)
      .name("Resolution")
      .onChange(function () {
        domain.geometry.dispose();
        scene.remove(domain);
        createDisplayDomains();
        setSizes();
      });
  }
  if (inGUI("linePlot")) {
    root.add(funsObj, "linePlot").name("Line plot");
  }
  if (inGUI("threeD")) {
    root
      .add(options, "threeD")
      .name("Surface plot")
      .onChange(function () {
        configureGUI();
        configureCamera();
        render();
      });
  }
  if (inGUI("threeDHeightScale")) {
    threeDHeightScaleController = root
      .add(options, "threeDHeightScale")
      .name("Max height")
      .onChange(updateUniforms);
  }
  if (inGUI("cameraTheta")) {
    cameraThetaController = root
      .add(options, "cameraTheta")
      .name("View $\\theta$")
      .onChange(configureCamera);
  }
  if (inGUI("cameraPhi")) {
    cameraPhiController = root
      .add(options, "cameraPhi")
      .name("View $\\phi$")
      .onChange(configureCamera);
  }
  if (inGUI("cameraZoom")) {
    cameraZoomController = root
      .add(options, "cameraZoom")
      .name("Zoom")
      .onChange(configureCamera);
  }
  if (inGUI("Smoothing scale")) {
    smoothingScaleController = root
      .add(options, "smoothingScale", 0, 16, 1)
      .name("Smoothing")
      .onChange(function () {
        resizeTextures();
        render();
      });
  }
  if (inGUI("forceManualInterpolation")) {
    forceManualInterpolationController = root
      .add(options, "forceManualInterpolation")
      .name("Man. smooth")
      .onChange(configureManualInterpolation);
  }

  // Colour folder.
  if (inGUI("colourFolder")) {
    root = rightGUI.addFolder("Colour");
  } else {
    root = genericOptionsFolder;
  }
  if (inGUI("colourmap")) {
    root
      .add(options, "colourmap", {
        Greyscale: "greyscale",
        Viridis: "viridis",
        Turbo: "turbo",
        BlckGrnYllwRdWht: "BlackGreenYellowRedWhite",
      })
      .onChange(function () {
        setDisplayColourAndType();
        configureColourbar();
      })
      .name("Colour map");
  }
  if (inGUI("minColourValue")) {
    minColourValueController = root
      .add(options, "minColourValue")
      .name("Min value")
      .onChange(function () {
        updateUniforms();
        updateColourbarLims();
        render();
      });
    minColourValueController.__precision = 2;
  }
  if (inGUI("maxColourValue")) {
    maxColourValueController = root
      .add(options, "maxColourValue")
      .name("Max value")
      .onChange(function () {
        updateUniforms();
        updateColourbarLims();
        render();
      });
    maxColourValueController.__precision = 2;
  }
  if (inGUI("setColourRange")) {
    setColourRangeController = root
      .add(funsObj, "setColourRange")
      .name("Snap range");
  }
  if (inGUI("autoColourRangeButton")) {
    autoSetColourRangeController = root
      .add(options, "autoSetColourRange")
      .name("Auto snap")
      .onChange(function () {
        if (options.autoSetColourRange) {
          funsObj.setColourRange();
          render();
        }
      });
  }
  if (inGUI("colourbar")) {
    root
      .add(options, "colourbar")
      .name("Colour bar")
      .onChange(configureColourbar);
  }
  if (inGUI("backgroundColour")) {
    root
      .addColor(options, "backgroundColour")
      .name("Background")
      .onChange(function () {
        scene.background = new THREE.Color(options.backgroundColour);
        render();
      });
  }

  // Images folder.
  if (inGUI("imagesFolder")) {
    fIm = rightGUI.addFolder("Images");
    root = fIm;
  } else {
    root = genericOptionsFolder;
  }
  // Always make images controller, but hide them if they're not wanted.
  createImageControllers();

  // Miscellaneous folder.
  if (inGUI("miscFolder")) {
    fMisc = rightGUI.addFolder("Misc.");
    root = fMisc;
  } else {
    root = genericOptionsFolder;
  }
  if (inGUI("integrate")) {
    root
      .add(options, "integrate")
      .name("Integrate")
      .onChange(function () {
        configureIntegralDisplay();
        render();
      });
  }
  if (inGUI("fixRandSeed")) {
    root.add(options, "fixRandSeed").name("Fix random seed");
  }
  if (inGUI("copyConfigAsJSON")) {
    // Copy configuration as raw JSON.
    root.add(funsObj, "copyConfigAsJSON").name("Copy code");
  }
  if (inGUI("preset")) {
    root
      .add(options, "preset", {
        "A harsh environment": "harshEnvironment",
        Alan: "Alan",
        Beginnings: "chemicalBasisOfMorphogenesis",
        "Bistable travelling waves": "bistableTravellingWave",
        Brusellator: "brusselator",
        "Cahn-Hilliard": "CahnHilliard",
        "Complex Ginzburg-Landau": "complexGinzburgLandau",
        "Cyclic competition": "cyclicCompetition",
        "Gierer-Meinhardt": "GiererMeinhardt",
        "Gierer-Meinhardt: stripes": "GiererMeinhardtStripes",
        "Gray-Scott": "subcriticalGS",
        "Heat equation": "heatEquation",
        "Inhomogeneous heat eqn": "inhomogHeatEquation",
        "Inhomogeneous wave eqn": "inhomogWaveEquation",
        "Localised patterns": "localisedPatterns",
        Schnakenberg: "Schnakenberg",
        "Schnakenberg-Hopf": "SchnakenbergHopf",
        "Schrodinger + potential": "stabilizedSchrodingerEquationPotential",
        Schrodinger: "stabilizedSchrodingerEquation",
        "Swift-Hohenberg": "swiftHohenberg",
        Thresholding: "thresholdSimulation",
        "Travelling waves": "travellingWave",
        "Variable diff heat eqn": "inhomogDiffusionHeatEquation",
        "Wave equation w/ ICs": "waveEquationICs",
        "Wave equation": "waveEquation",
      })
      .name("Preset")
      .onChange(loadPreset);
  }
  let debugFolder = root.addFolder("Debug");
  root = debugFolder;
  root.add(funsObj, "debugSmallSquare").name("SmallSquare");
  root.add(funsObj, "debugSmallRect").name("SmallRect");
  root.add(funsObj, "debugTallRect").name("TallRect");
  root.add(funsObj, "debugTallerRect").name("TallerRect");
  root.add(funsObj, "debugWideRect").name("WideRect");
  root.add(funsObj, "debugHundredTall").name("HundredTall");
  root.add(funsObj, "debugHundredVHTall").name("HundredVHTall");
  let test = { height: "100px", width: "100px" };
  root
    .add(test, "height")
    .name("Height: ")
    .onChange(function () {
      $("#simCanvas").css("height", test.height);
      resize();
    });
  root
    .add(test, "width")
    .name("Width: ")
    .onChange(function () {
      $("#simCanvas").css("width", test.width);
      resize();
    });

  if (inGUI("debug")) {
    // Debug.
    root.add(funsObj, "debug").name("Copy debug info");
  }

  if (inGUI("copyConfigAsURL")) {
    // Copy configuration as URL.
    rightGUI.add(funsObj, "copyConfigAsURL").name("Copy URL");
  }

  // Add a toggle for showing all options.
  if (options.onlyExposeOptions.length != 0) {
    rightGUI
      .add(options, "showAllOptionsOverride")
      .name("Show all")
      .onChange(function () {
        setShowAllToolsFlag();
        deleteGUI(rightGUI);
        initGUI(true);
      });
  }

  // If the generic options folder is empty, hide it.
  if (
    genericOptionsFolder.__controllers.length == 0 &&
    Object.keys(genericOptionsFolder.__folders).length == 0
  ) {
    genericOptionsFolder.hide();
  }
}

function animate() {
  requestAnimationFrame(animate);

  hasDrawn = isDrawing;
  // Draw on any input from the user, which can happen even if timestepping is not running.
  if (isDrawing & (!options.threeD | options.drawIn3D)) {
    draw();
  }

  // Only timestep if the simulation is running.
  if (isRunning) {
    // Perform a number of timesteps per frame.
    for (let i = 0; i < options.numTimestepsPerFrame; i++) {
      timestep();
      uniforms.t.value += options.dt;
    }
  }

  // Render if something has happened.
  if (hasDrawn || isRunning) {
    render();
  }
}

function setDrawAndDisplayShaders() {
  // Configure the display material.
  setDisplayColourAndType();

  // Configure the colourbar.
  configureColourbar();

  // Configure the postprocessing material.
  updateWhatToPlot();

  // Configure the drawing material.
  setBrushType();
}

function setBrushType() {
  // Construct a drawing shader based on the selected type and the value string.
  // Insert any user-defined kinetic parameters, given as a string that needs parsing.
  // Extract variable definitions, separated by semicolons or commas, ignoring whitespace.
  let regex = /[;,\s]*(.+?)(?:$|[;,])+/g;
  let kineticStr = parseShaderString(
    options.kineticParams.replace(regex, "float $1;\n")
  );
  let shaderStr = drawShaderTop() + kineticStr;
  if (options.typeOfBrush == "circle") {
    shaderStr += discShader();
  } else if (options.typeOfBrush == "hline") {
    shaderStr += hLineShader();
  } else if (options.typeOfBrush == "vline") {
    shaderStr += vLineShader();
  }
  // If a random number has been requested, insert calculation of a random number.
  if (options.brushValue.includes("RAND")) {
    shaderStr += randShader();
  }
  shaderStr +=
    "float brushValue = " + parseShaderString(options.brushValue) + "\n;";
  shaderStr += drawShaderBot();
  // Substitute in the correct colour code.
  shaderStr = selectColourspecInShaderStr(shaderStr);
  drawMaterial.fragmentShader = shaderStr;
  drawMaterial.needsUpdate = true;
}

function setDisplayColourAndType() {
  if (options.colourmap == "greyscale") {
    uniforms.colour1.value = new THREE.Vector4(0, 0, 0, 0);
    uniforms.colour2.value = new THREE.Vector4(0.25, 0.25, 0.25, 0.25);
    uniforms.colour3.value = new THREE.Vector4(0.5, 0.5, 0.5, 0.5);
    uniforms.colour4.value = new THREE.Vector4(0.75, 0.75, 0.75, 0.75);
    uniforms.colour5.value = new THREE.Vector4(1, 1, 1, 1);
    displayMaterial.fragmentShader = fiveColourDisplay();
  } else if (options.colourmap == "BlackGreenYellowRedWhite") {
    uniforms.colour1.value = new THREE.Vector4(0, 0, 0.0, 0);
    uniforms.colour2.value = new THREE.Vector4(0, 1, 0, 0.25);
    uniforms.colour3.value = new THREE.Vector4(1, 1, 0, 0.5);
    uniforms.colour4.value = new THREE.Vector4(1, 0, 0, 0.75);
    uniforms.colour5.value = new THREE.Vector4(1, 1, 1, 1.0);
    displayMaterial.fragmentShader = fiveColourDisplay();
  } else if (options.colourmap == "viridis") {
    uniforms.colour1.value = new THREE.Vector4(0.267, 0.0049, 0.3294, 0.0);
    uniforms.colour2.value = new THREE.Vector4(0.2302, 0.3213, 0.5455, 0.25);
    uniforms.colour3.value = new THREE.Vector4(0.1282, 0.5651, 0.5509, 0.5);
    uniforms.colour4.value = new THREE.Vector4(0.3629, 0.7867, 0.3866, 0.75);
    uniforms.colour5.value = new THREE.Vector4(0.9932, 0.9062, 0.1439, 1.0);
    displayMaterial.fragmentShader = fiveColourDisplay();
  } else if (options.colourmap == "turbo") {
    uniforms.colour1.value = new THREE.Vector4(0.19, 0.0718, 0.2322, 0.0);
    uniforms.colour2.value = new THREE.Vector4(0.1602, 0.7332, 0.9252, 0.25);
    uniforms.colour3.value = new THREE.Vector4(0.6384, 0.991, 0.2365, 0.5);
    uniforms.colour4.value = new THREE.Vector4(0.9853, 0.5018, 0.1324, 0.75);
    uniforms.colour5.value = new THREE.Vector4(0.4796, 0.01583, 0.01055, 1.0);
    displayMaterial.fragmentShader = fiveColourDisplay();
  }
  displayMaterial.needsUpdate = true;
  postMaterial.needsUpdate = true;
  render();
}

function selectColourspecInShaderStr(shaderStr) {
  let regex = /COLOURSPEC/g;
  shaderStr = shaderStr.replace(
    regex,
    speciesToChannelChar(options.whatToDraw)
  );
  return shaderStr;
}

function setDisplayFunInShader(shaderStr) {
  let regex = /FUN/g;
  shaderStr = shaderStr.replace(regex, parseShaderString(options.whatToPlot));
  return shaderStr;
}

function draw() {
  // Update the random seed if we're drawing using random.
  if (!options.fixRandSeed && options.brushValue.includes("RAND")) {
    updateRandomSeed();
  }
  // Toggle texture input/output.
  if (readFromTextureB) {
    inTex = simTextureB;
    outTex = simTextureA;
  } else {
    inTex = simTextureA;
    outTex = simTextureB;
  }
  readFromTextureB = !readFromTextureB;

  simDomain.material = drawMaterial;
  uniforms.textureSource.value = inTex.texture;
  renderer.setRenderTarget(outTex);
  renderer.render(simScene, simCamera);
  uniforms.textureSource.value = outTex.texture;
}

function timestep() {
  // We timestep by updating a texture that stores the solutions. We can't overwrite
  // the texture in the loop, so we'll use two textures and swap between them. These
  // textures are already defined above, and their resolution defines the resolution
  // of solution.

  if (readFromTextureB) {
    inTex = simTextureB;
    outTex = simTextureA;
  } else {
    inTex = simTextureA;
    outTex = simTextureB;
  }
  readFromTextureB = !readFromTextureB;

  simDomain.material = simMaterial;
  uniforms.textureSource.value = inTex.texture;
  renderer.setRenderTarget(outTex);
  renderer.render(simScene, simCamera);
  uniforms.textureSource.value = outTex.texture;
}

function render() {
  // If selected, set the colour range.
  if (options.autoSetColourRange) {
    funsObj.setColourRange();
  }

  if (options.threeD & options.drawIn3D) {
    let val =
      (getMeanVal() - options.minColourValue) /
        (options.maxColourValue - options.minColourValue) -
      0.5;
    simpleDomain.position.y =
      options.threeDHeightScale * Math.min(Math.max(val, -0.5), 0.5);
    simpleDomain.updateWorldMatrix();
  }

  // Perform any postprocessing.
  if (readFromTextureB) {
    inTex = simTextureB;
  } else {
    inTex = simTextureA;
  }

  simDomain.material = postMaterial;
  uniforms.textureSource.value = inTex.texture;
  renderer.setRenderTarget(postTexture);
  renderer.render(simScene, simCamera);
  uniforms.textureSource.value = postTexture.texture;
  bufferFilled = false;

  // If selected, update the time display.
  if (options.timeDisplay) {
    updateTimeDisplay();
  }

  // If selected, update the integral display.
  if (options.integrate) {
    updateIntegralDisplay();
  }

  // If we want to smooth manually, apply a bilinear filter.
  if (isManuallyInterpolating()) {
    simDomain.material = interpolationMaterial;
    renderer.setRenderTarget(interpolationTexture);
    renderer.render(simScene, simCamera);
    uniforms.textureSource.value = interpolationTexture.texture;
  }

  // Render the output to the screen.
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  if (takeAScreenshot) {
    takeAScreenshot = false;
    var link = document.createElement("a");
    link.download = "VisualPDEScreenshot";
    renderer.setSize(
      options.renderSize,
      Math.round(options.renderSize * aspectRatio),
      false
    );
    renderer.render(scene, camera);
    link.href = renderer.domElement.toDataURL();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSizes();
  }
}

function onDocumentPointerDown(event) {
  isDrawing = setBrushCoords(event, canvas);
  if (options.threeD & isDrawing & options.drawIn3D) {
    controls.enabled = false;
  }
}

function onDocumentPointerUp(event) {
  isDrawing = false;
  if (options.threeD) {
    controls.enabled = true;
  }
}

function onDocumentPointerMove(event) {
  setBrushCoords(event, canvas);
}

function setBrushCoords(event, container) {
  var cRect = container.getBoundingClientRect();
  let x = (event.clientX - cRect.x) / cRect.width;
  let y = 1 - (event.clientY - cRect.y) / cRect.height;
  if (options.threeD & options.drawIn3D) {
    // If we're in 3D, we have to project onto the simulation domain.
    // We need x,y between -1 and 1.
    clampedCoords.x = 2 * x - 1;
    clampedCoords.y = 2 * y - 1;
    raycaster.setFromCamera(clampedCoords, camera);
    var intersects = raycaster.intersectObject(simpleDomain, false);
    if (intersects.length > 0) {
      x = intersects[0].uv.x;
      y = intersects[0].uv.y;
    } else {
      x = -1;
      y = -1;
    }
  }
  // Round to near-pixel coordinates.
  x = Math.round(x * nXDisc) / nXDisc;
  y = Math.round(y * nYDisc) / nYDisc;
  uniforms.brushCoords.value = new THREE.Vector2(x, y);
  return (0 <= x) & (x <= 1) & (0 <= y) & (y <= 1);
}

function clearTextures() {
  if (!options.fixRandSeed) {
    updateRandomSeed();
  }
  simDomain.material = clearMaterial;
  renderer.setRenderTarget(simTextureA);
  renderer.render(simScene, simCamera);
  renderer.setRenderTarget(simTextureB);
  renderer.render(simScene, simCamera);
  render();
}

function pauseSim() {
  $("#pause").hide();
  $("#play").show();
  isRunning = false;
}

function playSim() {
  $("#play").hide();
  $("#pause").show();
  isRunning = true;
}

function resetSim() {
  clearTextures();
  uniforms.t.value = 0.0;
  updateTimeDisplay();
  // Start a timer that checks for NaNs every second.
  checkForNaN();
}

function parseReactionStrings() {
  // Parse the user-defined shader strings into valid GLSL and output their concatenation. We won't worry about code injection.
  let out = "";

  // Prepare the f string.
  out += "float f = " + parseShaderString(options.reactionStrU) + ";\n";
  // Prepare the g string.
  out += "float g = " + parseShaderString(options.reactionStrV) + ";\n";
  // Prepare the w string.
  out += "float h = " + parseShaderString(options.reactionStrW) + ";\n";

  return out;
}

function parseNormalDiffusionStrings() {
  // Parse the user-defined shader strings into valid GLSL and output their concatenation. We won't worry about code injection.
  let out = "";

  // Prepare Duu, evaluating it at five points.
  out += nonConstantDiffusionEvaluateInSpaceStr(
    parseShaderString(options.diffusionStrUU) + ";\n",
    "uu"
  );

  // Prepare Dvv, evaluating it at five points.
  out += nonConstantDiffusionEvaluateInSpaceStr(
    parseShaderString(options.diffusionStrVV) + ";\n",
    "vv"
  );

  // Prepare Dww, evaluating it at five points.
  out += nonConstantDiffusionEvaluateInSpaceStr(
    parseShaderString(options.diffusionStrWW) + ";\n",
    "ww"
  );

  return out;
}

function parseCrossDiffusionStrings() {
  // Parse the user-defined shader strings into valid GLSL and output their concatenation. We won't worry about code injection.
  let out = "";

  // Prepare Duv, evaluating it at five points.
  out += nonConstantDiffusionEvaluateInSpaceStr(
    parseShaderString(options.diffusionStrUV) + ";\n",
    "uv"
  );

  // Prepare Duw, evaluating it at five points.
  out += nonConstantDiffusionEvaluateInSpaceStr(
    parseShaderString(options.diffusionStrUW) + ";\n",
    "uw"
  );

  // Prepare Dvu, evaluating it at five points.
  out += nonConstantDiffusionEvaluateInSpaceStr(
    parseShaderString(options.diffusionStrVU) + ";\n",
    "vu"
  );

  // Prepare Dvw, evaluating it at five points.
  out += nonConstantDiffusionEvaluateInSpaceStr(
    parseShaderString(options.diffusionStrVW) + ";\n",
    "vw"
  );

  // Prepare Dwu, evaluating it at five points.
  out += nonConstantDiffusionEvaluateInSpaceStr(
    parseShaderString(options.diffusionStrWU) + ";\n",
    "wu"
  );

  // Prepare Dwv, evaluating it at five points.
  out += nonConstantDiffusionEvaluateInSpaceStr(
    parseShaderString(options.diffusionStrWV) + ";\n",
    "wv"
  );

  return out;
}

function nonConstantDiffusionEvaluateInSpaceStr(str, label) {
  let out = "";
  let xRegex = /\bx\b/g;
  let yRegex = /\by\b/g;
  let uvwRegex = /\buvw\.\b/g;

  out += "float D" + label + " = " + str;
  out +=
    "float D" +
    label +
    "L = " +
    str.replaceAll(xRegex, "(x-dx)").replaceAll(uvwRegex, "uvwL.");
  out +=
    "float D" +
    label +
    "R = " +
    str.replaceAll(xRegex, "(x+dx)").replaceAll(uvwRegex, "uvwR.");
  out +=
    "float D" +
    label +
    "T = " +
    str.replaceAll(yRegex, "(y+dy)").replaceAll(uvwRegex, "uvwT.");
  out +=
    "float D" +
    label +
    "B = " +
    str.replaceAll(yRegex, "(y-dy)").replaceAll(uvwRegex, "uvwB.");
  return out;
}

function parseShaderString(str) {
  // Parse a string into valid GLSL by replacing u,v,^, and integers.
  // Pad the string.
  str = " " + str + " ";

  // Replace powers with safepow, including nested powers.
  str = replaceBinOperator(str, "^", function (m, p1, p2) {
    switch (p2) {
      case "0":
        return "1";
      case "1":
        return "(" + p1 + ")";
      case "2":
        return "((" + p1 + ")*(" + p1 + "))";
      case "3":
        return "((" + p1 + ")*(" + p1 + ")*(" + p1 + "))";
      default:
        return "safepow(" + p1 + "," + p2 + ")";
    }
  });

  // Replace u, v, and w with uvw.r, uvw.g, and uvw.b via placeholders.
  str = str.replace(/\bu\b/g, "uvw." + speciesToChannelChar("u"));
  str = str.replace(/\bv\b/g, "uvw." + speciesToChannelChar("v"));
  str = str.replace(/\bw\b/g, "uvw." + speciesToChannelChar("w"));

  // If there are any numbers preceded by letters (eg r0), replace the number with the corresponding string.
  let regex;
  for (let num = 0; num < 10; num++) {
    regex = new RegExp("([a-zA-Z]+[0-9]*)(" + num.toString() + ")", "g");
    while (str != (str = str.replace(regex, "$1" + numsAsWords[num])));
  }

  // Replace integers with floats.
  while (str != (str = str.replace(/([^.0-9])(\d+)([^.0-9])/g, "$1$2.$3")));

  return str;
}

function replaceBinOperator(str, op, form) {
  // Take a string and replace all instances of op with form,
  // matching balanced brackets.
  const needsEscaping = "^*".includes(op);
  if (str.indexOf(op) > -1) {
    let tab = [];
    let joker = "___joker___";
    while (str.indexOf("(") > -1) {
      str = str.replace(/(\([^\(\)]*\))/g, function (m, t) {
        tab.push(t);
        return joker + (tab.length - 1);
      });
    }

    tab.push(str);
    str = joker + (tab.length - 1);
    let regex;
    if (needsEscaping) {
      regex = new RegExp("([\\w.]*)\\" + op + "([\\w.]*)", "g");
    } else {
      regex = new RegExp("([\\w.]*)" + op + "([\\w.]*)", "g");
    }
    while (str.indexOf(joker) > -1) {
      str = str.replace(new RegExp(joker + "(\\w+)", "g"), function (m, d) {
        return tab[d].replace(regex, form);
      });
    }
  }
  return str;
}

function setRDEquations() {
  let neumannShader = "";
  let dirichletShader = "";
  let robinShader = "";
  let updateShader = "";

  // Create a Neumann shader block for each species separately, which is just a special case of Robin.
  if (options.boundaryConditionsU == "neumann") {
    neumannShader += parseRobinRHS(options.neumannStrU, "u");
    neumannShader += selectSpeciesInShaderStr(RDShaderRobinX(), "u");
    if (!options.oneDimensional) {
      neumannShader += selectSpeciesInShaderStr(RDShaderRobinY(), "u");
    }
  }
  if (options.boundaryConditionsV == "neumann") {
    neumannShader += parseRobinRHS(options.neumannStrV, "v");
    neumannShader += selectSpeciesInShaderStr(RDShaderRobinX(), "v");
    if (!options.oneDimensional) {
      neumannShader += selectSpeciesInShaderStr(RDShaderRobinY(), "v");
    }
  }
  if (options.boundaryConditionsW == "neumann") {
    neumannShader += parseRobinRHS(options.neumannStrW, "w");
    neumannShader += selectSpeciesInShaderStr(RDShaderRobinX(), "w");
    if (!options.oneDimensional) {
      neumannShader += selectSpeciesInShaderStr(RDShaderRobinY(), "w");
    }
  }

  // Create Dirichlet shaders.
  if (options.domainViaIndicatorFun) {
    // If the domain is being set by an indicator function, Dirichlet is the only allowable BC.
    let str = RDShaderDirichletIndicatorFun().replace(
      /indicatorFun/g,
      parseShaderString(options.domainIndicatorFun)
    );
    dirichletShader +=
      selectSpeciesInShaderStr(str, "u") +
      parseShaderString(options.dirichletStrU) +
      ";\n}\n";
    dirichletShader +=
      selectSpeciesInShaderStr(str, "v") +
      parseShaderString(options.dirichletStrV) +
      ";\n}\n";
    dirichletShader +=
      selectSpeciesInShaderStr(str, "w") +
      parseShaderString(options.dirichletStrW) +
      ";\n}\n";
  } else {
    if (options.boundaryConditionsU == "dirichlet") {
      dirichletShader +=
        selectSpeciesInShaderStr(RDShaderDirichletX(), "u") +
        parseShaderString(options.dirichletStrU) +
        ";\n}\n";
      if (!options.oneDimensional) {
        dirichletShader +=
          selectSpeciesInShaderStr(RDShaderDirichletY(), "u") +
          parseShaderString(options.dirichletStrU) +
          ";\n}\n";
      }
    }
    if (options.boundaryConditionsV == "dirichlet") {
      dirichletShader +=
        selectSpeciesInShaderStr(RDShaderDirichletX(), "v") +
        parseShaderString(options.dirichletStrV) +
        ";\n}\n";
      if (!options.oneDimensional) {
        dirichletShader +=
          selectSpeciesInShaderStr(RDShaderDirichletY(), "v") +
          parseShaderString(options.dirichletStrV) +
          ";\n}\n";
      }
    }
    if (options.boundaryConditionsW == "dirichlet") {
      dirichletShader +=
        selectSpeciesInShaderStr(RDShaderDirichletX(), "w") +
        parseShaderString(options.dirichletStrW) +
        ";\n}\n";
      if (!options.oneDimensional) {
        dirichletShader +=
          selectSpeciesInShaderStr(RDShaderDirichletY(), "w") +
          parseShaderString(options.dirichletStrW) +
          ";\n}\n";
      }
    }
  }

  // Create a Robin shader block for each species separately.
  if (options.boundaryConditionsU == "robin") {
    robinShader += parseRobinRHS(options.robinStrU, "u");
    robinShader += selectSpeciesInShaderStr(RDShaderRobinX(), "u");
    if (!options.oneDimensional) {
      robinShader += selectSpeciesInShaderStr(RDShaderRobinY(), "u");
    }
  }
  if (options.boundaryConditionsV == "robin") {
    robinShader += parseRobinRHS(options.robinStrV, "v");
    robinShader += selectSpeciesInShaderStr(RDShaderRobinX(), "v");
    if (!options.oneDimensional) {
      robinShader += selectSpeciesInShaderStr(RDShaderRobinY(), "v");
    }
  }
  if (options.boundaryConditionsW == "robin") {
    robinShader += parseRobinRHS(options.robinStrW, "w");
    robinShader += selectSpeciesInShaderStr(RDShaderRobinX(), "w");
    if (!options.oneDimensional) {
      robinShader += selectSpeciesInShaderStr(RDShaderRobinY(), "w");
    }
  }

  // Insert any user-defined kinetic parameters, given as a string that needs parsing.
  // Extract variable definitions, separated by semicolons or commas, ignoring whitespace.
  // We'll inject this shader string before any boundary conditions etc, so that these params
  // are also available in BCs.
  let regex = /[;,\s]*(.+?)(?:$|[;,])+/g;
  let kineticStr = parseShaderString(
    options.kineticParams.replace(regex, "float $1;\n")
  );

  // Choose what sort of update we are doing: normal, or cross-diffusion enabled?
  updateShader = parseNormalDiffusionStrings() + "\n";
  if (options.crossDiffusion) {
    updateShader += parseCrossDiffusionStrings() + "\n" + RDShaderUpdateCross();
  } else {
    updateShader += RDShaderUpdateNormal();
  }

  // If v should be algebraic, append this to the normal update shader.
  if (options.algebraicV && options.crossDiffusion) {
    updateShader += selectSpeciesInShaderStr(RDShaderAlgebraicV(), "v");
  }

  // If w should be algebraic, append this to the normal update shader.
  if (options.algebraicW && options.crossDiffusion) {
    updateShader += selectSpeciesInShaderStr(RDShaderAlgebraicW(), "w");
  }

  simMaterial.fragmentShader = [
    RDShaderTop(),
    kineticStr,
    neumannShader,
    robinShader,
    parseReactionStrings(),
    updateShader,
    dirichletShader,
    RDShaderBot(),
  ].join(" ");
  simMaterial.needsUpdate = true;
}

function parseRobinRHS(string, species) {
  return "float robinRHS" + species + " = " + parseShaderString(string) + ";\n";
}

function loadPreset(preset) {
  // First, reload the default preset.
  loadOptions("default");

  // Updates the values stored in options.
  loadOptions(preset);

  // Replace the GUI.
  deleteGUIs();
  initGUI();

  // Update the equations, setup and GUI in line with new options.
  updateProblem();

  // Trigger a resize, which will refresh all uniforms and set sizes.
  setCanvasShape();
  resize();

  // Set the draw, display, and clear shaders.
  setDrawAndDisplayShaders();
  setClearShader();

  // Update any uniforms.
  updateUniforms();

  // Set the background color.
  scene.background = new THREE.Color(options.backgroundColour);

  // Reset the state of the simulation.
  resetSim();

  // Set the camera.
  configureCamera();

  // To get around an annoying bug in dat.GUI.image, in which the
  // controller doesn't update the value of the underlying property,
  // we'll destroy and create a new image controller everytime we load
  // a preset.
  imControllerOne.remove();
  imControllerTwo.remove();
  createImageControllers();

  // Configure interpolation.
  configureManualInterpolation();
}

function loadOptions(preset) {
  let newOptions;
  if (preset == undefined) {
    // If no argument is given, load whatever is set in options.preset.
    newOptions = getPreset(options.preset);
  } else if (typeof preset == "string") {
    // If an argument is given and it's a string, try to load the corresponding preset.
    newOptions = getPreset(preset);
  } else if (typeof preset == "object") {
    // If the argument is an object, then assume it is an options object.
    newOptions = preset;
  } else {
    // Otherwise, fall back to default.
    newOptions = getPreset("default");
  }

  // Reset the kinetic parameters.
  kineticParamsCounter = 0;
  kineticParamsLabels = [];
  kineticParamsStrs = {};

  // Loop through newOptions and overwrite anything already present.
  Object.assign(options, newOptions);

  // Set a flag if we will be showing all tools.
  setShowAllToolsFlag();

  // Check if the simulation should be running on load.
  isRunning = options.runningOnLoad;
}

function refreshGUI(folder) {
  if (folder != undefined) {
    // Traverse through all the subfolders and recurse.
    for (let subfolderName in folder.__folders) {
      refreshGUI(folder.__folders[subfolderName]);
    }
    // Update all the controllers at this level.
    for (let i = 0; i < folder.__controllers.length; i++) {
      folder.__controllers[i].updateDisplay();
    }
  }
  // Run MathJax to texify the parameter names (e.g. D_uu) which appear dynamically.
  // No need to do this on page load (and indeed will throw an error) so check
  // MathJax is defined first.
  if (MathJax.typesetPromise != undefined) {
    MathJax.typesetPromise();
  }
}

function deleteGUIs() {
  deleteGUI(leftGUI);
  deleteGUI(rightGUI);
}

function deleteGUI(folder) {
  if (folder != undefined) {
    // Traverse through all the subfolders and recurse.
    for (let subfolderName in folder.__folders) {
      deleteGUI(folder.__folders[subfolderName]);
      folder.removeFolder(folder.__folders[subfolderName]);
    }
    // Delete all the controllers at this level.
    for (let i = 0; i < folder.__controllers.length; i++) {
      folder.__controllers[i].remove();
    }
    // If this is the top-level GUI, destroy it.
    if (folder == rightGUI) {
      rightGUI.destroy();
    } else if (folder == leftGUI) {
      leftGUI.destroy();
    }
  }
}

function hideGUIController(cont) {
  if (cont != undefined) {
    cont.__li.style.display = "none";
  }
}

function showGUIController(cont) {
  if (cont != undefined) {
    cont.__li.style.display = "";
  }
}

function setGUIControllerName(cont, str, title) {
  if (cont != undefined) {
    cont.name(str);
    if (title != undefined) {
      cont.title(title);
    }
  }
}

function selectSpeciesInShaderStr(shaderStr, species) {
  // If there are no species, then return an empty string.
  if (species.length == 0) {
    return "";
  }
  let regex = /\bSPECIES\b/g;
  let channel = speciesToChannelChar(species);
  shaderStr = shaderStr.replace(regex, channel);
  regex = /\brobinRHSSPECIES\b/g;
  shaderStr = shaderStr.replace(regex, "robinRHS" + species);
  return shaderStr;
}

function speciesToChannelChar(speciesStr) {
  let channel = "";
  let listOfChannels = "rgba";
  for (let i = 0; i < speciesStr.length; i++) {
    channel += listOfChannels[speciesToChannelInd(speciesStr[i])];
  }
  return channel;
}

function speciesToChannelInd(speciesStr) {
  let channel;
  if (speciesStr.includes("u")) {
    channel = 0;
  }
  if (speciesStr.includes("v")) {
    channel = 1;
  }
  if (speciesStr.includes("w")) {
    channel = 2;
  }
  return channel;
}

function setBCsGUI() {
  // Update the GUI.
  if (options.boundaryConditionsU == "dirichlet") {
    showGUIController(dirichletUController);
  } else {
    hideGUIController(dirichletUController);
  }
  if (options.boundaryConditionsV == "dirichlet") {
    showGUIController(dirichletVController);
  } else {
    hideGUIController(dirichletVController);
  }
  if (options.boundaryConditionsW == "dirichlet") {
    showGUIController(dirichletWController);
  } else {
    hideGUIController(dirichletWController);
  }

  if (options.boundaryConditionsU == "neumann") {
    showGUIController(neumannUController);
  } else {
    hideGUIController(neumannUController);
  }
  if (options.boundaryConditionsV == "neumann") {
    showGUIController(neumannVController);
  } else {
    hideGUIController(neumannVController);
  }
  if (options.boundaryConditionsW == "neumann") {
    showGUIController(neumannWController);
  } else {
    hideGUIController(neumannWController);
  }

  if (options.boundaryConditionsU == "robin") {
    showGUIController(robinUController);
  } else {
    hideGUIController(robinUController);
  }
  if (options.boundaryConditionsV == "robin") {
    showGUIController(robinVController);
  } else {
    hideGUIController(robinVController);
  }
  if (options.boundaryConditionsW == "robin") {
    showGUIController(robinWController);
  } else {
    hideGUIController(robinWController);
  }

  if (options.domainViaIndicatorFun) {
    hideGUIController(uBCsController);
    hideGUIController(vBCsController);
    hideGUIController(wBCsController);
  } else {
    showGUIController(uBCsController);
  }
}

function updateRandomSeed() {
  // Update the random seed used in the shaders.
  uniforms.seed.value = performance.now() % 1000;
}

function setClearShader() {
  let shaderStr = clearShaderTop();
  if (
    options.clearValueU.includes("RAND") ||
    options.clearValueV.includes("RAND")
  ) {
    shaderStr += randShader();
  }
  // Insert any user-defined kinetic parameters, given as a string that needs parsing.
  // Extract variable definitions, separated by semicolons or commas, ignoring whitespace.
  // We'll inject this shader string before any boundary conditions etc, so that these params
  // are also available in BCs.
  let regex = /[;,\s]*(.+?)(?:$|[;,])+/g;
  let kineticStr = parseShaderString(
    options.kineticParams.replace(regex, "float $1;\n")
  );
  shaderStr += kineticStr;
  shaderStr += "float u = " + parseShaderString(options.clearValueU) + ";\n";
  shaderStr += "float v = " + parseShaderString(options.clearValueV) + ";\n";
  shaderStr += "float w = " + parseShaderString(options.clearValueW) + ";\n";
  shaderStr += clearShaderBot();
  clearMaterial.fragmentShader = shaderStr;
  clearMaterial.needsUpdate = true;
}

function loadImageSourceOne() {
  let image = new Image();
  image.src = imControllerOne.__image.src;
  let texture = new THREE.Texture();
  texture.image = image;
  image.onload = function () {
    texture.needsUpdate = true;
    uniforms.imageSourceOne.value = texture;
    if (options.resetOnImageLoad) {
      resetSim();
    }
  };
  texture.dispose();
}

function loadImageSourceTwo() {
  let image = new Image();
  image.src = imControllerTwo.__image.src;
  let texture = new THREE.Texture();
  texture.image = image;
  image.onload = function () {
    texture.needsUpdate = true;
    uniforms.imageSourceTwo.value = texture;
    if (options.resetOnImageLoad) {
      resetSim();
    }
  };
  texture.dispose();
}

function createImageControllers() {
  // This is a bad solution to a problem that shouldn't exist.
  // The image controller does not modify the value that you assign to it, and doesn't respond to it being changed.
  // Hence, we create a function used solely to create the controller, which we'll do everytime a preset is loaded.
  if (inGUI("imagesFolder")) {
    root = fIm;
  } else {
    root = genericOptionsFolder;
  }
  imControllerOne = root
    .addImage(options, "imagePathOne")
    .name("$S(x,y)$")
    .onChange(loadImageSourceOne);
  imControllerTwo = root
    .addImage(options, "imagePathTwo")
    .name("$T(x,y)$")
    .onChange(loadImageSourceTwo);
  if (MathJax.typesetPromise != undefined) {
    MathJax.typesetPromise();
  }
  if (inGUI("imageOne")) {
    showGUIController(imControllerOne);
  } else {
    hideGUIController(imControllerOne);
  }
  if (inGUI("imageTwo")) {
    showGUIController(imControllerTwo);
  } else {
    hideGUIController(imControllerTwo);
  }
}

function updateWhatToPlot() {
  if (options.whatToPlot == "MAX") {
    setPostFunMaxFragShader();
    hideGUIController(minColourValueController);
    hideGUIController(maxColourValueController);
    hideGUIController(setColourRangeController);
    hideGUIController(autoSetColourRangeController);
    options.autoSetColourRange = false;
    refreshGUI(rightGUI);
  } else {
    setPostFunFragShader();
    showGUIController(minColourValueController);
    showGUIController(maxColourValueController);
    showGUIController(setColourRangeController);
    showGUIController(autoSetColourRangeController);
  }
  configureColourbar();
  configureIntegralDisplay();
  render();
}

function inGUI(name) {
  return showAllStandardTools || options.onlyExposeOptions.includes(name);
}

function setShowAllToolsFlag() {
  showAllStandardTools =
    options.showAllOptionsOverride || options.onlyExposeOptions.length == 0;
}

function showVGUIPanels() {
  if (options.crossDiffusion) {
    showGUIController(DuvController);
    showGUIController(DvuController);
  } else {
    hideGUIController(DuvController);
    hideGUIController(DvuController);
  }
  showGUIController(DvvController);
  showGUIController(gController);
  showGUIController(clearValueVController);
  showGUIController(vBCsController);
}

function showWGUIPanels() {
  if (options.crossDiffusion) {
    showGUIController(DuwController);
    showGUIController(DvwController);
    showGUIController(DwuController);
    showGUIController(DwvController);
  } else {
    hideGUIController(DuwController);
    hideGUIController(DvwController);
    hideGUIController(DwuController);
    hideGUIController(DwvController);
  }
  showGUIController(DwwController);
  showGUIController(hController);
  showGUIController(clearValueWController);
  showGUIController(wBCsController);
}

function hideVGUIPanels() {
  hideGUIController(DuvController);
  hideGUIController(DvuController);
  hideGUIController(DvvController);
  hideGUIController(gController);
  hideGUIController(clearValueVController);
  hideGUIController(vBCsController);
}

function hideWGUIPanels() {
  hideGUIController(DuwController);
  hideGUIController(DvwController);
  hideGUIController(DwuController);
  hideGUIController(DwvController);
  hideGUIController(DwwController);
  hideGUIController(hController);
  hideGUIController(clearValueWController);
  hideGUIController(wBCsController);
}

function diffObjects(o1, o2) {
  return Object.fromEntries(
    Object.entries(o1).filter(
      ([k, v]) => JSON.stringify(o2[k]) !== JSON.stringify(v)
    )
  );
}

function getMinMaxVal() {
  // Return the min and max values in the simulation textures in channel channelInd.
  fillBuffer();
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < buffer.length; i += 4) {
    minVal = Math.min(minVal, buffer[i]);
    maxVal = Math.max(maxVal, buffer[i]);
  }
  return [minVal, maxVal];
}

function getMeanVal() {
  // Return the mean values in the simulation textures in channel channelInd.
  fillBuffer();
  let total = 0;
  for (let i = 0; i < buffer.length; i += 4) {
    total += buffer[i];
  }
  return total / (nXDisc * nYDisc);
}

function setPostFunFragShader() {
  let shaderStr = computeDisplayFunShaderTop();
  let regex = /[;,\s]*(.+?)(?:$|[;,])+/g;
  let kineticStr = parseShaderString(
    options.kineticParams.replace(regex, "float $1;\n")
  );
  shaderStr += kineticStr;
  shaderStr += computeDisplayFunShaderMid();
  postMaterial.fragmentShader =
    setDisplayFunInShader(shaderStr) +
    postShaderDomainIndicator().replace(
      /indicatorFun/g,
      parseShaderString(options.domainIndicatorFun)
    ) +
    postGenericShaderBot();
  postMaterial.needsUpdate = true;
}

function setPostFunMaxFragShader() {
  postMaterial.fragmentShader =
    computeMaxSpeciesShaderMid() +
    postShaderDomainIndicator().replace(
      /indicatorFun/g,
      parseShaderString(options.domainIndicatorFun)
    ) +
    postGenericShaderBot();
  postMaterial.needsUpdate = true;
  options.minColourValue = 0.0;
  options.maxColourValue = 1.0;
  updateUniforms();
}

function problemTypeFromOptions() {
  // Use the currently selected options to specify an equation type as an index into listOfTypes.
  switch (parseInt(options.numSpecies)) {
    case 1:
      // 1Species
      equationType = 0;
      break;
    case 2:
      if (options.crossDiffusion) {
        if (options.algebraicV) {
          // 2SpeciesCrossDiffusionAlgebraicV
          equationType = 3;
        } else {
          // 2SpeciesCrossDiffusion
          equationType = 2;
        }
      } else {
        // 2Species
        equationType = 1;
      }
      break;
    case 3:
      if (options.crossDiffusion) {
        if (options.algebraicW) {
          // 3SpeciesCrossDiffusionAlgebraicW
          equationType = 6;
        } else {
          // 3SpeciesCrossDiffusion
          equationType = 5;
        }
      } else {
        // 3Species
        equationType = 4;
      }
      break;
  }
}

function configureGUI() {
  // Set up the GUI based on the the current options: numSpecies, crossDiffusion, and algebraicV.
  // We need a separate block for each of the six cases.

  switch (equationType) {
    case 0:
      // 1Species
      // Hide everything to do with v and w.
      hideVGUIPanels();
      hideWGUIPanels();

      // Hide the cross diffusion controller, the algebraicV controller, and the algebraicW controller.
      hideGUIController(crossDiffusionController);
      hideGUIController(algebraicVController);
      hideGUIController(algebraicWController);

      // Configure the controller names.
      setGUIControllerName(DuuController, "$D$", "function of u, t");
      setGUIControllerName(fController, "$f$", "function of u, t");

      break;

    case 1:
      // 2Species
      // Show v panels.
      showVGUIPanels();
      // Hide w panels.
      hideWGUIPanels();

      // Show the cross diffusion controller.
      showGUIController(crossDiffusionController);
      // Hide the algebraicV and algebraicW controllers.
      hideGUIController(algebraicVController);
      hideGUIController(algebraicWController);

      // Configure the controller names.
      setGUIControllerName(DuuController, "$D_u$", "function of u, v, t");
      setGUIControllerName(DvvController, "$D_v$", "function of u, v, t");
      setGUIControllerName(fController, "$f$", "function of u, v, t");
      setGUIControllerName(gController, "$g$", "function of u, v, t");

      break;

    case 2:
      // 2SpeciesCrossDiffusion
      // Show v panels.
      showVGUIPanels();
      // Hide w panels.
      hideWGUIPanels();

      // Show the cross diffusion controller.
      showGUIController(crossDiffusionController);
      // Hide the algebraicV and algebraicW controllers.
      showGUIController(algebraicVController);
      hideGUIController(algebraicWController);

      // Configure the controller names.
      setGUIControllerName(DuuController, "$D_{uu}$", "function of u, v, t");
      setGUIControllerName(DvvController, "$D_{vv}$", "function of u, v, t");
      setGUIControllerName(fController, "$f$", "function of u, v, t");
      setGUIControllerName(gController, "$g$", "function of u, v, t");
      break;

    case 3:
      // 2SpeciesCrossDiffusionAlgebraicV
      // Show v panels.
      showVGUIPanels();
      hideGUIController(DvvController);
      // Hide w panels.
      hideWGUIPanels();

      // Show the cross diffusion controller.
      showGUIController(crossDiffusionController);
      // Show the algebraicV controller.
      showGUIController(algebraicVController);
      // Hide the algebraicW controller.
      hideGUIController(algebraicWController);

      // Configure the controller names.
      setGUIControllerName(DuuController, "$D_{uu}$", "function of u, v, t");
      setGUIControllerName(fController, "$f$", "function of u, v, t");
      setGUIControllerName(gController, "$g$", "function of u, t");
      break;

    case 4:
      // 3Species
      // Show v panels.
      showVGUIPanels();
      // Show w panels.
      showWGUIPanels();

      // Show the cross diffusion controller.
      showGUIController(crossDiffusionController);
      // Hide the algebraicV and algebraicW controllers.
      hideGUIController(algebraicVController);
      hideGUIController(algebraicWController);

      // Configure the controller names.
      setGUIControllerName(DuuController, "$D_u$", "function of u, v, w, t");
      setGUIControllerName(DvvController, "$D_v$", "function of u, v, w, t");
      setGUIControllerName(DwwController, "$D_w$", "function of u, v, w, t");
      setGUIControllerName(fController, "$f$", "function of u, v, w, t");
      setGUIControllerName(gController, "$g$", "function of u, v, w, t");
      setGUIControllerName(hController, "$h$", "function of u, v, w, t");
      break;

    case 5:
      // 3SpeciesCrossDiffusion
      // Show v panels.
      showVGUIPanels();
      // Show w panels.
      showWGUIPanels();

      // Show the cross diffusion controller.
      showGUIController(crossDiffusionController);
      // Hide the algebraicV controller.
      hideGUIController(algebraicVController);
      // Show the algebraicW controller.
      showGUIController(algebraicWController);

      // Configure the controller names.
      setGUIControllerName(DuuController, "$D_{uu}$", "function of u, v, w, t");
      setGUIControllerName(DvvController, "$D_{vv}$", "function of u, v, w, t");
      setGUIControllerName(DwwController, "$D_{ww}$", "function of u, v, w, t");
      setGUIControllerName(fController, "$f$", "function of u, v, w, t");
      setGUIControllerName(gController, "$g$", "function of u, v, w, t");
      setGUIControllerName(hController, "$h$", "function of u, v, w, t");
      break;

    case 6:
      // 3SpeciesCrossDiffusionAlgebraicW
      // Show v panels.
      showVGUIPanels();
      // Show w panels.
      showWGUIPanels();
      hideGUIController(DwwController);

      // Show the cross diffusion controller.
      showGUIController(crossDiffusionController);
      // Hide the algebraicV controller.
      hideGUIController(algebraicVController);
      // Show the algebraicW controller.
      showGUIController(algebraicWController);

      // Configure the controller names.
      setGUIControllerName(DuuController, "$D_{uu}$", "function of u, v, w, t");
      setGUIControllerName(DvvController, "$D_{vv}$", "function of u, v, w, t");
      setGUIControllerName(fController, "$f$", "function of u, v, w, t");
      setGUIControllerName(gController, "$g$", "function of u, v, w, t");
      setGUIControllerName(hController, "$h$", "function of u, v, t");
      break;
  }
  if (options.domainViaIndicatorFun) {
    showGUIController(domainIndicatorFunController);
  } else {
    hideGUIController(domainIndicatorFunController);
  }
  // Hide or show GUI elements that depend on the BCs.
  setBCsGUI();
  // Hide or show GUI elements to do with surface plotting.
  if (options.threeD) {
    showGUIController(threeDHeightScaleController);
    showGUIController(cameraThetaController);
    showGUIController(cameraPhiController);
    showGUIController(cameraZoomController);
    showGUIController(drawIn3DController);
  } else {
    hideGUIController(threeDHeightScaleController);
    hideGUIController(cameraThetaController);
    hideGUIController(cameraPhiController);
    hideGUIController(cameraZoomController);
    hideGUIController(drawIn3DController);
  }
  configureColourbar();
  configureTimeDisplay();
  configureIntegralDisplay();
  // Refresh the GUI displays.
  refreshGUI(leftGUI);
  refreshGUI(rightGUI);
  if (isRunning) {
    $("#play").hide();
    $("#pause").show();
  } else {
    $("#play").show();
    $("#pause").hide();
  }
  manualInterpolationNeeded
    ? hideGUIController(forceManualInterpolationController)
    : showGUIController(forceManualInterpolationController);
  isManuallyInterpolating()
    ? showGUIController(smoothingScaleController)
    : hideGUIController(smoothingScaleController);
}

function configureOptions() {
  // Configure any options that depend on the equation type.

  if (options.domainViaIndicatorFun) {
    // Only allow Dirichlet conditions.
    options.boundaryConditionsU = "dirichlet";
    options.boundaryConditionsV = "dirichlet";
    options.boundaryConditionsW = "dirichlet";
  }

  // Set options that only depend on the number of species.
  switch (parseInt(options.numSpecies)) {
    case 1:
      options.crossDiffusion = false;
      options.algebraicV = false;
      options.algebraicW = false;

      // Ensure that u is being displayed on the screen (and the brush target).
      options.whatToDraw = "u";
      options.whatToPlot = "u";

      // Set the diffusion of v and w to zero to prevent them from causing numerical instability.
      options.diffusionStrUV = "0";
      options.diffusionStrUW = "0";
      options.diffusionStrVU = "0";
      options.diffusionStrVV = "0";
      options.diffusionStrVW = "0";
      options.diffusionStrWU = "0";
      options.diffusionStrWV = "0";
      options.diffusionStrWW = "0";

      // Set v and w to be periodic to reduce computational overhead.
      options.boundaryConditionsV = "periodic";
      options.clearValueV = "0";
      options.reactionStrV = "0";
      options.boundaryConditionsW = "periodic";
      options.clearValueW = "0";
      options.reactionStrW = "0";

      // If the f string contains any v or w references, clear it.
      if (/\b[vw]\b/.test(options.reactionStrU)) {
        options.reactionStrU = "0";
      }
      break;
    case 2:
      // Ensure that u or v is being displayed on the screen (and the brush target).
      if (options.whatToDraw == "w") {
        options.whatToDraw = "u";
      }
      if (options.whatToPlot == "w") {
        options.whatToPlot = "u";
      }
      options.algebraicW = false;

      // Set the diffusion of w to zero to prevent it from causing numerical instability.
      options.diffusionStrUW = "0";
      options.diffusionStrVW = "0";
      options.diffusionStrWU = "0";
      options.diffusionStrWV = "0";
      options.diffusionStrWW = "0";

      // Set w to be periodic to reduce computational overhead.
      options.boundaryConditionsW = "periodic";
      options.clearValueW = "0";
      options.reactionStrW = "0";

      // If the f or g strings contains any w references, clear them.
      if (/\bw\b/.test(options.reactionStrU)) {
        options.reactionStrU = "0";
      }
      if (/\bw\b/.test(options.reactionStrV)) {
        options.reactionStrV = "0";
      }
      break;
    case 3:
      options.algebraicV = false;
      break;
  }

  // Configure any type-specific options.
  switch (equationType) {
    case 3:
      // 2SpeciesCrossDiffusionAlgebraicV
      options.diffusionStrVV = "0";
      break;
    case 6:
      // 3SpeciesCrossDiffusionAlgebraicW
      options.diffusionStrWW = "0";
  }

  // Refresh the GUI displays.
  refreshGUI(leftGUI);
  refreshGUI(rightGUI);
}

function updateProblem() {
  // Update the problem based on the current options.
  problemTypeFromOptions();
  configureOptions();
  configureGUI();
  updateWhatToPlot();
  setBrushType();
  setRDEquations();
  setEquationDisplayType();
  resetSim();
}

function setEquationDisplayType() {
  // Given an equation type (specified as an integer selector), set the type of
  // equation in the UI element that displays the equations.
  let str = equationTEX[equationType];
  if (options.typesetCustomEqs) {
    // Replace any customisable parts of the TEX with the user input.
    if (options.reactionStrU.match(/[a-zA-Z]/))
      str = str.replaceAll(/\bf\b/g, options.reactionStrU);
    if (options.reactionStrV.match(/[a-zA-Z]/))
      str = str.replaceAll(/\bg\b/g, options.reactionStrV);
    if (options.reactionStrW.match(/[a-zA-Z]/))
      str = str.replaceAll(/\bh\b/g, options.reactionStrW);

    if (options.diffusionStrUU.match(/[a-zA-Z]/)) {
      str = str.replaceAll(/\bD\b/g, "[" + options.diffusionStrUU + "]");
      str = str.replaceAll(/\bD_u\b/g, "[" + options.diffusionStrUU + "]");
      str = str.replaceAll(/\bD_{uu}\b/g, "[" + options.diffusionStrUU + "]");
    }
    if (options.diffusionStrVV.match(/[a-zA-Z]/)) {
      str = str.replaceAll(/\bD_v\b/g, "[" + options.diffusionStrVV + "]");
      str = str.replaceAll(/\bD_{vv}\b/g, "[" + options.diffusionStrVV + "]");
    }
    if (options.diffusionStrWW.match(/[a-zA-Z]/)) {
      str = str.replaceAll(/\bD_w\b/g, "[" + options.diffusionStrWW + "]");
      str = str.replaceAll(/\bD_{ww}\b/g, "[" + options.diffusionStrWW + "]");
    }

    if (options.diffusionStrUV.match(/[a-zA-Z]/))
      str = str.replaceAll(/\bD_{uv}\b/g, +"[" + options.diffusionStrUV + "]");
    if (options.diffusionStrUW.match(/[a-zA-Z]/))
      str = str.replaceAll(/\bD_{uw}\b/g, +"[" + options.diffusionStrUW + "]");
    if (options.diffusionStrVU.match(/[a-zA-Z]/))
      str = str.replaceAll(/\bD_{vu}\b/g, +"[" + options.diffusionStrVU + "]");
    if (options.diffusionStrVW.match(/[a-zA-Z]/))
      str = str.replaceAll(/\bD_{vw}\b/g, +"[" + options.diffusionStrVW + "]");
    if (options.diffusionStrWU.match(/[a-zA-Z]/))
      str = str.replaceAll(/\bD_{wu}\b/g, +"[" + options.diffusionStrWU + "]");
    if (options.diffusionStrWV.match(/[a-zA-Z]/))
      str = str.replaceAll(/\bD_{wv}\b/g, +"[" + options.diffusionStrWV + "]");

    str = parseStringToTEX(str);
  }
  $("#typeset_equation").html(str);
  if (MathJax.typesetPromise != undefined) {
    MathJax.typesetPromise();
  }
}

function parseStringToTEX(str) {
  // Parse a string into valid TEX by replacing * and ^.
  // Replace +- and -+ with simply -
  str = str.replaceAll(/\+\s*-/g, "-");
  str = str.replaceAll(/-\s*\+/g, "-");

  // Replace common functions with commands.
  str = str.replaceAll(/\bsin/g, "\\sin");
  str = str.replaceAll(/\bcos/g, "\\cos");
  str = str.replaceAll(/\btan/g, "\\tan");

  // Remove *.
  str = str.replaceAll(/\*/g, " ");

  // Replace powers with well-formatted ^, including nested powers.
  str = replaceBinOperator(str, "^", "{$1}^{$2}");

  // Replace / with well-formatted \frac, including nested fractions.
  // str = replaceBinOperator(str, "/", "\\frac{$1}{$2}");

  return str;
}

function removeWhitespace(str) {
  str = str.replace(/\s+/g, "  ").trim();
  return str;
}

function createParameterController(label, isNextParam) {
  if (isNextParam) {
    kineticParamsLabels.push(label);
    kineticParamsStrs[label] = "";
    let controller = parametersFolder.add(kineticParamsStrs, label).name("");
    controller.onFinishChange(function () {
      const index = kineticParamsLabels.indexOf(label);
      // Remove excess whitespace.
      let str = removeWhitespace(
        kineticParamsStrs[kineticParamsLabels.at(index)]
      );
      if (str == "") {
        // If the string is empty, do nothing.
      } else {
        // A parameter has been added! So, we create a new controller and assign it to this parameter,
        // delete this controller, and make a new blank controller.
        createParameterController(kineticParamsLabels.at(index), false);
        kineticParamsCounter += 1;
        let newLabel = "params" + kineticParamsCounter;
        this.remove();
        createParameterController(newLabel, true);
        // If it's non-empty, update any dependencies.
        setKineticStringFromParams();
      }
    });
  } else {
    let controller = parametersFolder.add(kineticParamsStrs, label).name("");
    controller.onFinishChange(function () {
      // Remove excess whitespace.
      let str = removeWhitespace(kineticParamsStrs[label]);
      if (str == "") {
        // If the string is empty, delete this controller.
        this.remove();
        // Remove the associated label and the (empty) kinetic parameters string.
        const index = kineticParamsLabels.indexOf(label);
        kineticParamsLabels.splice(index, 1);
        delete kineticParamsStrs[label];
      }
      setKineticStringFromParams();
    });
  }
}

function setParamsFromKineticString() {
  // Take the kineticParams string in the options and
  // use it to populate a GUI containing these parameters
  // as individual options.
  let label, str;
  let strs = options.kineticParams.split(";");
  for (var index = 0; index < strs.length; index++) {
    str = removeWhitespace(strs[index]);
    if (str == "") {
      // If the string is empty, do nothing.
    } else {
      label = "param" + kineticParamsCounter;
      kineticParamsCounter += 1;
      kineticParamsLabels.push(label);
      kineticParamsStrs[label] = str;
      createParameterController(label, false);
    }
  }
  // Finally, create an empty controller for adding parameters.
  label = "param" + kineticParamsCounter;
  kineticParamsLabels.push(label);
  kineticParamsStrs[label] = str;
  createParameterController(label, true);
  // Check if any reserved names are being used.
  if (checkForReservedNames()) {
    options.kineticParams = "";
    setRDEquations();
    setClearShader();
    updateWhatToPlot();
  }
}

function setKineticStringFromParams() {
  options.kineticParams = Object.values(kineticParamsStrs).join(";");
  if (!checkForReservedNames()) {
    setRDEquations();
    setClearShader();
    updateWhatToPlot();
  }
}

/* GUI settings and equations buttons */
$("#settings").click(function () {
  $("#rightGUI").toggle();
});
$("#equations").click(function () {
  $("#equation_display").toggle();
  $("#leftGUI").toggle();
});
$("#pause").click(function () {
  pauseSim();
});
$("#play").click(function () {
  playSim();
});
$("#erase").click(function () {
  resetSim();
});
$("#screenshot").click(function () {
  takeAScreenshot = true;
  render();
});

$("#back").click(function () {
  const link = document.createElement("a");
  link.href = document.referrer; // This resolves the URL.
  // If the user arrived by typing in a URL or from an external link, have this button
  // point to the visualPDE homepage.
  if (fromExternalLink()) {
    window.location.href = window.location.origin;
  } else {
    // Otherwise, simply take them back a page.
    history.back();
  }
});

function fromExternalLink() {
  const link = document.createElement("a");
  link.href = document.referrer; // This resolves the URL.
  return (
    link.href == window.location || !link.href.includes(window.location.origin)
  );
}

function fadein(id) {
  $(id).removeClass("fading_out");
  $(id).show();
  $(id).addClass("fading_in");
}

function fadeout(id) {
  $(id).removeClass("fading_in");
  $(id).addClass("fading_out");
  $(id).bind(
    "webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd",
    function () {
      $(this).removeClass("fading_out");
      $(this).hide();
    }
  );
}

function configureColourbar() {
  if (options.colourbar) {
    $("#colourbar").show();
    let cString = "linear-gradient(90deg, ";
    cString +=
      "rgb(" +
      uniforms.colour1.value
        .toArray()
        .slice(0, -1)
        .map((x) => x * 255)
        .toString() +
      ") 0%,";
    cString +=
      "rgb(" +
      uniforms.colour2.value
        .toArray()
        .slice(0, -1)
        .map((x) => x * 255)
        .toString() +
      ") 25%,";
    cString +=
      "rgb(" +
      uniforms.colour3.value
        .toArray()
        .slice(0, -1)
        .map((x) => x * 255)
        .toString() +
      ") 50%,";
    cString +=
      "rgb(" +
      uniforms.colour4.value
        .toArray()
        .slice(0, -1)
        .map((x) => x * 255)
        .toString() +
      ") 75%,";
    cString +=
      "rgb(" +
      uniforms.colour5.value
        .toArray()
        .slice(0, -1)
        .map((x) => x * 255)
        .toString() +
      ") 100%";
    cString += ")";
    $("#colourbar").css("background", cString);
    if (options.whatToPlot == "MAX") {
      $("#minLabel").html("$u$");
      $("#midLabel").html("$v$");
      $("#maxLabel").html("$w$");
    } else {
      $("#midLabel").html("$" + parseStringToTEX(options.whatToPlot) + "$");
    }
    if (MathJax.typesetPromise != undefined) {
      MathJax.typesetPromise($("#midLabel"));
    }
    updateColourbarLims();
  } else {
    $("#colourbar").hide();
  }
}

function updateColourbarLims() {
  if (options.whatToPlot != "MAX") {
    $("#minLabel").html(formatLabelNum(options.minColourValue, 2));
    $("#maxLabel").html(formatLabelNum(options.maxColourValue, 2));
  }
  if (
    uniforms.colour1.value
      .toArray()
      .slice(0, -1)
      .reduce((a, b) => a + b, 0) < 0.7
  ) {
    // If the background colour is closer to black than white, set
    // the label to be white.
    $("#minLabel").css("color", "#fff");
  } else {
    $("#minLabel").css("color", "#000");
  }
  if (
    uniforms.colour3.value
      .toArray()
      .slice(0, -1)
      .reduce((a, b) => a + b, 0) < 0.7
  ) {
    // If the background colour is closer to black than white, set
    // the label to be white.
    $("#midLabel").css("color", "#fff");
  } else {
    $("#midLabel").css("color", "#000");
  }
  if (
    uniforms.colour5.value
      .toArray()
      .slice(0, -1)
      .reduce((a, b) => a + b, 0) < 0.7
  ) {
    // If the background colour is closer to black than white, set
    // the label to be white.
    $("#maxLabel").css("color", "#fff");
  } else {
    $("#maxLabel").css("color", "#000");
  }
}

function formatLabelNum(num, depth) {
  return num.toPrecision(depth);
}

function configureTimeDisplay() {
  if (options.timeDisplay) {
    $("#timeDisplay").show();
  } else {
    $("#timeDisplay").hide();
  }
}

function updateTimeDisplay() {
  if (options.timeDisplay) {
    let str = formatLabelNum(uniforms.t.value, 3);
    str = str.replace(/e(\+)*(\-)*([0-9]*)/, " x 10<sup>$2$3<sup>");
    $("#timeValue").html(str);
    checkColorbarPosition();
  }
}

function configureIntegralDisplay() {
  if (options.integrate) {
    $("#integralDisplay").show();
    let str = "";
    options.oneDimensional ? (str += "$\\int") : (str += "$\\iint");
    str += "_{\\domain}" + parseStringToTEX(options.whatToPlot) + "\\,\\d x";
    options.oneDimensional ? {} : (str += "\\d y");
    $("#integralLabel").html(str + " = $");
    if (MathJax.typesetPromise != undefined) {
      MathJax.typesetPromise($("#integralLabel"));
    }
  } else {
    $("#integralDisplay").hide();
  }
}

function updateIntegralDisplay() {
  if (options.integrate) {
    fillBuffer();
    let dA = uniforms.dx.value;
    if (!options.oneDimensional) {
      dA = dA * uniforms.dy.value;
    }
    let total = 0;
    for (let i = 0; i < buffer.length; i += 4) {
      total += buffer[i];
    }
    total *= dA;
    $("#integralValue").html(formatLabelNum(total, 4));
    checkColorbarPosition();
  }
}

function checkForNaN() {
  // Check to see if a NaN value is in the first entry of the simulation array, which would mean that we've hit overflow or instability.
  let vals = getMinMaxVal();
  if (!isFinite(vals[0]) || !isFinite(vals[1])) {
    fadein("#oops_hit_nan");
    $("#erase").one("click", () => fadeout("#oops_hit_nan"));
  } else {
    setTimeout(checkForNaN, 1000);
  }
}

function fillBuffer() {
  if (!bufferFilled) {
    renderer.readRenderTargetPixels(postTexture, 0, 0, nXDisc, nYDisc, buffer);
    bufferFilled = true;
  }
}

function checkColorbarPosition() {
  if (options.colourbar) {
    let colourbarDims = $("#colourbar")[0].getBoundingClientRect();
    if (options.integrate) {
      let integralDims = $("#integralDisplay")[0].getBoundingClientRect();
      if (colourbarDims.left <= integralDims.left + integralDims.width) {
        $("#colourbar").addClass("secondRowUI");
        return;
      }
    }
    if (options.timeDisplay) {
      let timeDims = $("#timeDisplay")[0].getBoundingClientRect();
      if (colourbarDims.left + colourbarDims.width >= timeDims.left) {
        $("#colourbar").addClass("secondRowUI");
        return;
      }
    }
    $("#colourbar").removeClass("secondRowUI");
  }
}

function configureManualInterpolation() {
  if (isManuallyInterpolating()) {
    simTextureA.texture.magFilter = THREE.NearestFilter;
    simTextureB.texture.magFilter = THREE.NearestFilter;
    postTexture.texture.magFilter = THREE.NearestFilter;
    interpolationTexture.texture.magFilter = THREE.NearestFilter;
  } else {
    simTextureA.texture.magFilter = THREE.LinearFilter;
    simTextureB.texture.magFilter = THREE.LinearFilter;
    postTexture.texture.magFilter = THREE.LinearFilter;
    interpolationTexture.texture.magFilter = THREE.LinearFilter;
  }
  configureGUI();
}

function isManuallyInterpolating() {
  return manualInterpolationNeeded || options.forceManualInterpolation;
}

function warningCookieExists() {
  var cookieArr = document.cookie.split(";");
  for (var i = 0; i < cookieArr.length; i++) {
    var cookiePair = cookieArr[i].split("=");
    if ("warning" == cookiePair[0].trim()) {
      return true;
    }
  }
  return false;
}

function setWarningCookie() {
  const d = new Date();
  d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
  let expires = "expires=" + d.toUTCString();
  document.cookie = "warning" + "=" + "true" + ";" + expires + ";path=/";
}

function waitListener(element, listenerName, val) {
  return new Promise(function (resolve, reject) {
    var listener = (event) => {
      element.removeEventListener(listenerName, listener);
      resolve(val);
    };
    element.addEventListener(listenerName, listener);
  });
}

function getReservedStrs() {
  // Load an RD shader and find floats, vecs, and ivecs.
  let regex = /(?:float|vec\d|ivec\d)\b\s+(\w+)\b/g;
  let str = RDShaderTop() + RDShaderUpdateCross();
  return [...str.matchAll(regex)].map((x) => x[1]);
}

function usingReservedNames() {
  let regex = /(\w+)\s*=/g;
  let names = [...options.kineticParams.matchAll(regex)]
    .map((x) => x[1])
    .join(" ");
  let lastTest = false;
  const flag = getReservedStrs().some(function (name) {
    let regex = new RegExp("\\b" + name + "\\b", "g");
    lastTest = name;
    return regex.test(names);
  });
  return flag ? lastTest : false;
}

function checkForReservedNames() {
  let badName = usingReservedNames();
  // If there's a bad parameter name, and we've not just alerted the user to it, show an alert.
  if (badName && badName != lastBadParam) {
    lastBadParam = badName;
    alert(
      'The name "' +
        badName +
        "\" is used under the hood, so can't be used as a parameter. Please use a different name for " +
        badName +
        "."
    );
  }
  return badName;
}

$("#simCanvas").one("pointerdown touchstart", () => fadeout("#try_clicking"));
