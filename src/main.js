import * as THREE from 'three';
import { World } from './world.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 100);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(10, 20, 10);
scene.add(sun);

const world = new World();
const geo = new THREE.BoxGeometry(1, 1, 1);
const mat = new THREE.MeshLambertMaterial({ color: 0x44aa44 });

const chunkMeshes = new Map(); // key: "cx,cz" → THREE.Group
const RENDER_DISTANCE = 4; // chunk radius

function buildChunkMesh(cx, cz) {
  const key = `${cx},${cz}`;
  if (chunkMeshes.has(key)) return;

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

  scene.add(group);
  chunkMeshes.set(key, group);
}

function unloadChunkMesh(cx, cz) {
  const key = `${cx},${cz}`;
  const group = chunkMeshes.get(key);
  if (!group) return;
  scene.remove(group);
  group.traverse(obj => { if (obj.geometry) obj.geometry.dispose?.(); });
  chunkMeshes.delete(key);
}

function updateChunks(playerX, playerZ) {
  const pcx = Math.floor(playerX / 16);
  const pcz = Math.floor(playerZ / 16);

  // Load chunk di sekitar
  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
      buildChunkMesh(pcx + dx, pcz + dz);
    }
  }

  // Unload chunk yang jauh
  for (const key of chunkMeshes.keys()) {
    const [cx, cz] = key.split(',').map(Number);
    if (Math.abs(cx - pcx) > RENDER_DISTANCE + 1 || Math.abs(cz - pcz) > RENDER_DISTANCE + 1) {
      unloadChunkMesh(cx, cz);
    }
  }
}

// ==== KONTROL SENTUH ====
const touch = { moveId: null, lookId: null, moveStart: { x: 0, y: 0 }, moveCur: { x: 0, y: 0 }, lookLast: { x: 0, y: 0 } };
let yaw = 0, pitch = 0;

canvas.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth / 2 && touch.moveId === null) {
      touch.moveId = t.identifier;
      touch.moveStart = { x: t.clientX, y: t.clientY };
      touch.moveCur = { x: t.clientX, y: t.clientY };
    } else if (t.clientX >= innerWidth / 2 && touch.lookId === null) {
      touch.lookId = t.identifier;
      touch.lookLast = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === touch.moveId) {
      touch.moveCur = { x: t.clientX, y: t.clientY };
    } else if (t.identifier === touch.lookId) {
      const dx = t.clientX - touch.lookLast.x;
      const dy = t.clientY - touch.lookLast.y;
      yaw -= dx * 0.005;
      pitch -= dy * 0.005;
      pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
      touch.lookLast = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === touch.moveId) touch.moveId = null;
    if (t.identifier === touch.lookId) touch.lookId = null;
  }
}, { passive: false });

// ==== PLAYER ====
const player = { x: 8, y: 6, z: 8 };
const speed = 0.15;

function updatePlayer() {
  if (touch.moveId !== null) {
    const dx = touch.moveCur.x - touch.moveStart.x;
    const dy = touch.moveCur.y - touch.moveStart.y;
    const forward = -dy / 80;
    const strafe = dx / 80;

    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    player.x += (-sin * forward + cos * strafe) * speed;
    player.z += (-cos * forward - sin * strafe) * speed;
  }

  camera.position.set(player.x, player.y, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  updateChunks(player.x, player.z);
}

// Init
updateChunks(player.x, player.z);

function animate() {
  requestAnimationFrame(animate);
  updatePlayer();
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
