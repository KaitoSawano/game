import * as THREE from 'three';
import { World } from './world.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 500);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(10, 20, 10);
scene.add(sun);

const world = new World();

// Material bersama (hemat memori)
const blockMat = new THREE.MeshLambertMaterial({ color: 0x44aa44 });

// Tekstur atlas tidak dipakai, pakai warna solid
const blockGeo = new THREE.BoxGeometry(1, 1, 1);

const chunkMeshes = new Map();
const RENDER_DISTANCE = 3;

// ==== FACE CULLING: hanya render sisi yang menghadap udara ====
const FACES = [
  { dir: [ 1, 0, 0], corners: [[1,0,0],[1,0,1],[1,1,0],[1,1,1]], normal: [ 1, 0, 0] },
  { dir: [-1, 0, 0], corners: [[0,0,1],[0,0,0],[0,1,1],[0,1,0]], normal: [-1, 0, 0] },
  { dir: [ 0, 1, 0], corners: [[0,1,0],[1,1,0],[0,1,1],[1,1,1]], normal: [ 0, 1, 0] },
  { dir: [ 0,-1, 0], corners: [[0,0,1],[1,0,1],[0,0,0],[1,0,0]], normal: [ 0,-1, 0] },
  { dir: [ 0, 0, 1], corners: [[1,0,1],[0,0,1],[1,1,1],[0,1,1]], normal: [ 0, 0, 1] },
  { dir: [ 0, 0,-1], corners: [[0,0,0],[1,0,0],[0,1,0],[1,1,0]], normal: [ 0, 0,-1] },
];

function buildChunkMesh(cx, cz) {
  const key = `${cx},${cz}`;
  if (chunkMeshes.has(key)) return;

  const chunk = world.getChunk(cx, cz);
  const positions = [];
  const normals = [];
  const indices = [];
  let idx = 0;

  const bx = cx * 16;
  const bz = cz * 16;

  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      for (let z = 0; z < 16; z++) {
        if (chunk.get(x, y, z) === 0) continue;

        // Cek 6 tetangga
        for (const face of FACES) {
          const nx = bx + x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = bz + z + face.dir[2];
          if (world.getBlockGlobal(nx, ny, nz) !== 0) continue; // tertutup, skip

          // Tambah 4 vertex
          for (const c of face.corners) {
            positions.push(bx + x + c[0], y + c[1], bz + z + c[2]);
            normals.push(...face.normal);
          }

          // 2 segitiga
          indices.push(idx, idx + 1, idx + 2, idx + 2, idx + 1, idx + 3);
          idx += 4;
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);

  const mesh = new THREE.Mesh(geo, blockMat);
  mesh.frustumCulled = true;
  scene.add(mesh);
  chunkMeshes.set(key, mesh);
}

function unloadChunkMesh(cx, cz) {
  const key = `${cx},${cz}`;
  const mesh = chunkMeshes.get(key);
  if (!mesh) return;
  scene.remove(mesh);
  mesh.geometry.dispose();
  chunkMeshes.delete(key);
}

function updateChunks(px, pz) {
  const pcx = Math.floor(px / 16);
  const pcz = Math.floor(pz / 16);

  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
      buildChunkMesh(pcx + dx, pcz + dz);
    }
  }

  for (const key of [...chunkMeshes.keys()]) {
    const [cx, cz] = key.split(',').map(Number);
    if (Math.abs(cx - pcx) > RENDER_DISTANCE + 1 || Math.abs(cz - pcz) > RENDER_DISTANCE + 1) {
      unloadChunkMesh(cx, cz);
    }
  }
}

// ==== KONTROL ====
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

// ==== PLAYER + GRAVITY ====
const player = { x: 8, y: 10, z: 8, vy: 0, onGround: false };
const speed = 0.15;
const GRAVITY = 0.02;

function isSolid(gx, gy, gz) {
  return world.getBlockGlobal(Math.floor(gx), Math.floor(gy), Math.floor(gz)) !== 0;
}

function updatePlayer() {
  // Horizontal
  if (touch.moveId !== null) {
    const dx = touch.moveCur.x - touch.moveStart.x;
    const dy = touch.moveCur.y - touch.moveStart.y;
    const forward = -dy / 80;
    const strafe = dx / 80;

    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    player.x += (-sin * forward + cos * strafe) * speed;
    player.z += (-cos * forward - sin * strafe) * speed;
  }

  // Gravity
  player.vy -= GRAVITY;
  player.y += player.vy;

  // Collision tanah (cek di bawah kaki)
  const feetY = Math.floor(player.y - 1.6);
  if (isSolid(player.x, feetY, player.z)) {
    player.y = feetY + 1.6;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  camera.position.set(player.x, player.y, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  updateChunks(player.x, player.z);
}

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
