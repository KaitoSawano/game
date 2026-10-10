import * as THREE from 'three';
import { World, BLOCK, CHUNK_H } from './world.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 90);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 500);
camera.rotation.order = 'YXZ';

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.7);
sun.position.set(10, 30, 10);
scene.add(sun);

const world = new World(12345);

const COLORS = {
  [BLOCK.GRASS]: 0x4caf50,
  [BLOCK.DIRT]:  0x8b5a2b,
  [BLOCK.STONE]: 0x888888,
  [BLOCK.WATER]: 0x3399ff,
  [BLOCK.SAND]:  0xe8d68a,
  [BLOCK.WOOD]:  0x6b4423,
  [BLOCK.LEAVES]:0x2e7d32,
};

const materials = {};
for (const k in COLORS) {
  materials[k] = new THREE.MeshLambertMaterial({ color: COLORS[k] });
}
materials[BLOCK.WATER].transparent = true;
materials[BLOCK.WATER].opacity = 0.7;

const chunkMeshes = new Map();
const RENDER_DISTANCE = 3;

const FACES = [
  { dir: [ 1,0,0], corners: [[1,0,0],[1,0,1],[1,1,0],[1,1,1]] },
  { dir: [-1,0,0], corners: [[0,0,1],[0,0,0],[0,1,1],[0,1,0]] },
  { dir: [0, 1,0], corners: [[0,1,0],[1,1,0],[0,1,1],[1,1,1]] },
  { dir: [0,-1,0], corners: [[0,0,1],[1,0,1],[0,0,0],[1,0,0]] },
  { dir: [0,0, 1], corners: [[1,0,1],[0,0,1],[1,1,1],[0,1,1]] },
  { dir: [0,0,-1], corners: [[0,0,0],[1,0,0],[0,1,0],[1,1,0]] },
];

function isTransparent(b) {
  return b === BLOCK.AIR || b === BLOCK.WATER;
}

function buildChunkMesh(cx, cz) {
  const key = `${cx},${cz}`;
  if (chunkMeshes.has(key)) return;

  const chunk = world.getChunk(cx, cz);
  const bx = cx * 16, bz = cz * 16;
  const buffers = {};

  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < CHUNK_H; y++) {
      for (let z = 0; z < 16; z++) {
        const b = chunk.get(x, y, z);
        if (b === BLOCK.AIR) continue;

        if (!buffers[b]) buffers[b] = { pos: [], norm: [], idx: [], count: 0 };
        const buf = buffers[b];

        for (const face of FACES) {
          const nx = bx + x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = bz + z + face.dir[2];
          const nb = world.getBlockGlobal(nx, ny, nz);
          if (!isTransparent(nb)) continue;

          for (const c of face.corners) {
            buf.pos.push(bx + x + c[0], y + c[1], bz + z + c[2]);
            buf.norm.push(...face.dir);
          }
          buf.idx.push(buf.count, buf.count+1, buf.count+2, buf.count+2, buf.count+1, buf.count+3);
          buf.count += 4;
        }
      }
    }
  }

  const group = new THREE.Group();
  for (const type in buffers) {
    const buf = buffers[type];
    if (buf.pos.length === 0) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(buf.norm, 3));
    geo.setIndex(buf.idx);
    const mesh = new THREE.Mesh(geo, materials[type]);
    group.add(mesh);
  }

  scene.add(group);
  chunkMeshes.set(key, group);
}

function unloadChunkMesh(cx, cz) {
  const key = `${cx},${cz}`;
  const group = chunkMeshes.get(key);
  if (!group) return;
  scene.remove(group);
  group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
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

// ==== PLAYER ====
function findSpawn() {
  for (let r = 0; r < 400; r++) {
    const tx = 8 + (r % 40) - 20;
    const tz = 8 + Math.floor(r / 40) - 5;
    const h = world.heightAt(tx, tz);
    if (h >= 9 && h <= 15) {
      return { x: tx + 0.5, y: h + 3, z: tz + 0.5 };
    }
  }
  return { x: 8, y: 30, z: 8 };
}

const spawn = findSpawn();
const player = { x: spawn.x, y: spawn.y, z: spawn.z, vy: 0, onGround: false };

const SPEED = 0.15;
const GRAVITY = 0.018;
const JUMP_V = 0.35;
const EYE = 1.6;
const PLAYER_RADIUS = 0.3;

function isSolidAt(gx, gy, gz) {
  const b = world.getBlockGlobal(Math.floor(gx), Math.floor(gy), Math.floor(gz));
  return b !== BLOCK.AIR && b !== BLOCK.WATER;
}

function collidesAt(x, z) {
  const feetY = Math.floor(player.y - EYE);
  const headY = Math.floor(player.y - 0.1);
  for (let y = feetY; y <= headY; y++) {
    if (isSolidAt(x - PLAYER_RADIUS, y, z - PLAYER_RADIUS)) return true;
    if (isSolidAt(x + PLAYER_RADIUS, y, z - PLAYER_RADIUS)) return true;
    if (isSolidAt(x - PLAYER_RADIUS, y, z + PLAYER_RADIUS)) return true;
    if (isSolidAt(x + PLAYER_RADIUS, y, z + PLAYER_RADIUS)) return true;
  }
  return false;
}

// ==== INPUT ====
const touch = {
  moveId: null, lookId: null, jumpId: null,
  moveStart: { x: 0, y: 0 }, moveCur: { x: 0, y: 0 },
  lookLast: { x: 0, y: 0 },
};
let yaw = 0, pitch = 0;

const joyBase = document.getElementById('joyBase');
const joyKnob = document.getElementById('joyKnob');
const jumpBtn = document.getElementById('jumpBtn');

function inRect(t, el) {
  const r = el.getBoundingClientRect();
  return t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom;
}

canvas.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    // Tombol lompat?
    if (inRect(t, jumpBtn) && touch.jumpId === null) {
      touch.jumpId = t.identifier;
      jumpBtn.classList.add('active');
      if (player.onGround) player.vy = JUMP_V;
      continue;
    }

    // Joystick area (kiri bawah, di sekitar joyBase)?
    const jr = joyBase.getBoundingClientRect();
    const jcx = jr.left + jr.width / 2;
    const jcy = jr.top + jr.height / 2;
    const dist = Math.hypot(t.clientX - jcx, t.clientY - jcy);
    if (dist < 120 && touch.moveId === null) {
      touch.moveId = t.identifier;
      touch.moveStart = { x: jcx, y: jcy };
      touch.moveCur = { x: t.clientX, y: t.clientY };
      continue;
    }

    // Sisanya = area look (swipe kanan / area kosong)
    if (touch.lookId === null) {
      touch.lookId = t.identifier;
      touch.lookLast = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === touch.moveId) {
      touch.moveCur = { x: t.clientX, y: t.clientY };

      const dx = touch.moveCur.x - touch.moveStart.x;
      const dy = touch.moveCur.y - touch.moveStart.y;
      const max = 50;
      const len = Math.min(Math.hypot(dx, dy), max);
      const ang = Math.atan2(dy, dx);
      joyKnob.style.left = (50 + Math.cos(ang) * (len / 130) * 100) + '%';
      joyKnob.style.top = (50 + Math.sin(ang) * (len / 130) * 100) + '%';
    } else if (t.identifier === touch.lookId) {
      const dx = t.clientX - touch.lookLast.x;
      const dy = t.clientY - touch.lookLast.y;
      yaw -= dx * 0.005;
      pitch -= dy * 0.005;
      pitch = Math.max(-1.5, Math.min(1.5, pitch));
      touch.lookLast = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === touch.moveId) {
      touch.moveId = null;
      joyKnob.style.left = '50%';
      joyKnob.style.top = '50%';
    }
    if (t.identifier === touch.lookId) touch.lookId = null;
    if (t.identifier === touch.jumpId) {
      touch.jumpId = null;
      jumpBtn.classList.remove('active');
    }
  }
}, { passive: false });

// ==== INFO PANEL ====
const infoX = document.getElementById('infoX');
const infoY = document.getElementById('infoY');
const infoZ = document.getElementById('infoZ');
let infoTimer = 0;

function updateInfo() {
  infoX.textContent = player.x.toFixed(0);
  infoY.textContent = player.y.toFixed(1);
  infoZ.textContent = player.z.toFixed(0);
}

// ==== UPDATE ====
function updatePlayer() {
  if (touch.moveId !== null) {
    const dx = touch.moveCur.x - touch.moveStart.x;
    const dy = touch.moveCur.y - touch.moveStart.y;
    const forward = -dy / 80;
    const strafe = dx / 80;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);

    const nx = player.x + (-sin * forward + cos * strafe) * SPEED;
    const nz = player.z + (-cos * forward - sin * strafe) * SPEED;

    if (!collidesAt(nx, player.z)) player.x = nx;
    if (!collidesAt(player.x, nz)) player.z = nz;
  }

  player.vy -= GRAVITY;
  player.vy = Math.max(player.vy, -0.6);
  player.y += player.vy;

  const feetY = Math.floor(player.y - EYE);
  if (isSolidAt(player.x, feetY, player.z)) {
    player.y = feetY + 1 + EYE;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  if (player.y < -10) {
    player.y = 30;
    player.vy = 0;
  }

  camera.position.set(player.x, player.y, player.z);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  updateChunks(player.x, player.z);

  infoTimer++;
  if (infoTimer % 10 === 0) updateInfo();
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
