import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as dat from 'lil-gui';

/**
 * Base Setup
 */
const gui = new dat.GUI();
const debugObject = {};

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

/**
 * Environment Map
 */
const environmentMap = cubeTextureLoader.load([
  '/textures/environmentMaps/1/px.jpg',
  '/textures/environmentMaps/1/nx.jpg',
  '/textures/environmentMaps/1/py.jpg',
  '/textures/environmentMaps/1/ny.jpg',
  '/textures/environmentMaps/1/pz.jpg',
  '/textures/environmentMaps/1/nz.jpg',
]);

scene.background = environmentMap;
scene.environment = environmentMap;

/**
 * Model Load
 */
let mixer; // Variable to hold the animation mixer

gltfLoader.load(
  '/models/Fox/glTF/Fox.gltf',
  (gltf) => {
    const fox = gltf.scene;

     // Compute bounding box of the fox model
    const box = new THREE.Box3().setFromObject(fox);
    const height = box.max.y - box.min.y;
 
     // Position the fox at the ground level based on the model's height
    fox.position.y = -height / 2; // Adjust based on the model's height
 

    // Position the fox model so that it stands on the ground
    fox.scale.set(0.5, 0.5, 0.5);  // Scale the model for better visibility

    scene.add(fox);
    updateAllMaterials(); // Apply environment map to model

    // Animation setup if the model has animations
    mixer = new THREE.AnimationMixer(fox);
    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play(); // Play all animations
    });
  }
);

/**
 * Update all materials
 */
const updateAllMaterials = () => {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.envMap = environmentMap;
      child.material.envMapIntensity = debugObject.envMapIntensity;

      // Enable shadows for the mesh
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
};

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(4, 1, -4);
scene.add(camera);

// Adjust the camera's near and far planes
camera.near = 0.1;
camera.far = 100;

/**
 * Controls
 */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer with Anti-Aliasing
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,  // Enable anti-aliasing
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding; // Set output encoding to sRGB
renderer.physicallyCorrectLights = true; // Use physically accurate lights

// Enable shadows in the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Set shadow type

/**
 * Lighting
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
directionalLight.position.set(0.25, 3, -2.25);
scene.add(directionalLight);

// Enable shadows for the directional light
directionalLight.castShadow = true;

// Adjust shadow camera far value
directionalLight.shadow.camera.far = 15;

// Adjust shadow map size for better quality
directionalLight.shadow.mapSize.set(1024, 1024);

const guiLight = gui.addFolder('Directional Light');
guiLight.add(directionalLight, 'intensity').min(0).max(10).step(0.001).name('Light Intensity');
guiLight.add(directionalLight.position, 'x').min(-5).max(5).step(0.001).name('Light X');
guiLight.add(directionalLight.position, 'y').min(-5).max(5).step(0.001).name('Light Y');
guiLight.add(directionalLight.position, 'z').min(-5).max(5).step(0.001).name('Light Z');

/**
 * Tone Mapping & Exposure
 */
debugObject.toneMapping = THREE.ACESFilmicToneMapping; // Initial tone mapping setting
debugObject.toneMappingExposure = 3; // Initial exposure setting
debugObject.envMapIntensity = 2.5; // Initial environment map intensity

// Tone Mapping dropdown
gui.add(debugObject, 'toneMapping', {
  'No Tone Mapping': THREE.NoToneMapping,
  'Linear Tone Mapping': THREE.LinearToneMapping,
  'Reinhard Tone Mapping': THREE.ReinhardToneMapping,
  'Cineon Tone Mapping': THREE.CineonToneMapping,
  'ACES Filmic Tone Mapping': THREE.ACESFilmicToneMapping,
}).onChange((value) => {
  renderer.toneMapping = value;
  updateAllMaterials(); // Update materials when tone mapping is changed
});

// Tone Mapping Exposure slider
gui.add(debugObject, 'toneMappingExposure').min(0).max(10).step(0.001).name('Exposure').onChange((value) => {
  renderer.toneMappingExposure = value;
  updateAllMaterials(); // Update materials when exposure changes
});

// Environment Map Intensity control
gui.add(debugObject, 'envMapIntensity').min(0).max(10).step(0.001).name('Env Map Intensity').onChange(() => {
  updateAllMaterials(); // Update materials when intensity is changed
});

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const delta = clock.getDelta();

  // Update animations if they exist
  if (mixer) {
    mixer.update(delta);
  }

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};

tick();
