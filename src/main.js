import * as THREE from 'three';
import { World } from './world.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(8, 10, 20);
camera.lookAt(8, 0, 8);

// Cahaya
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(10, 20, 10);
scene.add(sun);

// Dunia
const world = new World();
const geo = new THREE.BoxGeometry(1, 1, 1);
const mat = new THREE.MeshLambertMaterial({ color: 0x44aa44 });

function renderChunk(cx, cz) {
  const chunk = world.getChunk(cx, cz);
  const group = new THREE.Group();

  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 16; z++) {
        if (chunk.get(x, y, z) === 0) continue;
        const block = new THREE.Mesh(geo, mat);
        block.position.set(cx * 16 + x, y, cz * 16 + z);
        group.add(block);
      }
    }
  }

  group.position.set(0, 0, 0);
  scene.add(group);
}

// Render 2x2 chunk = 32x32 blok
renderChunk(0, 0);
renderChunk(1, 0);
renderChunk(0, 1);
renderChunk(1, 1);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
