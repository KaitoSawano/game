import * as THREE from 'three';
import { World, BLOCK, BIOME, CHUNK_H, SEA_LEVEL } from './world.js';
import { BLOCK_TEXTURES, getMaterial, getTintForBlock, loadAllTextures, getLoadProgress } from './textures.js';
import { createClouds, createSun } from './sky.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 70);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 400);
camera.rotation.order = 'YXZ';

scene.add(new THREE.AmbientLight(0xffffff, 0.85));
const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
sunLight.position.set(10, 30, 10);
scene.add(sunLight);

const world = new World(12345);
const chunkMeshes = new Map();
const RENDER_DISTANCE = 2;

const FACES = [
  { dir: [1, 0, 0], corners: [[1,0,0],[1,0,1],[1,1,1],[1,1,0]], ao: [
    { side1: [1,-1,0], side2: [1,0,-1], corner: [1,-1,-1] },
    { side1: [1,-1,0], side2: [1,0,1],  corner: [1,-1,1]  },
    { side1: [1,1,0],  side2: [1,0,1],  corner: [1,1,1]   },
    { side1: [1,1,0],  side2: [1,0,-1], corner: [1,1,-1]  },
  ]},
  { dir: [-1, 0, 0], corners: [[0,0,1],[0,0,0],[0,1,0],[0,1,1]], ao: [
    { side1: [-1,-1,0], side2: [-1,0,1],  corner: [-1,-1,1]  },
    { side1: [-1,-1,0], side2: [-1,0,-1], corner: [-1,-1,-1] },
    { side1: [-1,1,0],  side2: [-1,0,-1], corner: [-1,1,-1]  },
    { side1: [-1,1,0],  side2: [-1,0,1],  corner: [-1,1,1]   },
  ]},
  { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], ao: [
    { side1: [-1,1,1], side2: [0,1,1], corner: [-1,1,1] },
    { side1: [1,1,1],  side2: [0,1,1], corner: [1,1,1]  },
    { side1: [1,1,-1], side2: [0,1,-1], corner: [1,1,-1] },
    { side1: [-1,1,-1], side2: [0,1,-1], corner: [-1,1,-1] },
  ]},
  { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], ao: [
    { side1: [-1,-1,0], side2: [0,-1,-1], corner: [-1,-1,-1] },
    { side1: [1,-1,0],  side2: [0,-1,-1], corner: [1,-1,-1]  },
    { side1: [1,-1,0],  side2: [0,-1,1],  corner: [1,-1,1]   },
    { side1: [-1,-1,0], side2: [0,-1,1],  corner: [-1,-1,1]  },
  ]},
  { dir: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], ao: [
    { side1: [-1,0,1], side2: [0,-1,1], corner: [-1,-1,1] },
    { side1: [1,0,1],  side2: [0,-1,1], corner: [1,-1,1]  },
    { side1: [1,0,1],  side2: [0,1,1],  corner: [1,1,1]   },
    { side1: [-1,0,1], side2: [0,1,1],  corner: [-1,1,1]  },
  ]},
  { dir: [0, 0, -1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], ao: [
    { side1: [1,0,-1],  side2: [0,-1,-1], corner: [1,-1,-1]  },
    { side1: [-1,0,-1], side2: [0,-1,-1], corner: [-1,-1,-1] },
    { side1: [-1,0,-1], side2: [0,1,-1],  corner: [-1,1,-1]  },
    { side1: [1,0,-1],  side2: [0,1,-1],  corner: [1,1,-1]   },
  ]},
];

function isTransparent(b) {
  return b === BLOCK.AIR || b === BLOCK.WATER;
}
function isSolid(b) {
  return b !== BLOCK.AIR && b !== BLOCK.WATER;
}

function computeAO(gx, gy, gz, face, vi) {
  const a = face.ao[vi];
  const s1 = isSolid(world.getBlockGlobal(gx + a.side1[0], gy + a.side1[1], gz + a.side1[2])) ? 1 : 0;
  const s2 = isSolid(world.getBlockGlobal(gx + a.side2[0], gy + a.side2[1], gz + a.side2[2])) ? 1 : 0;
  const c  = isSolid(world.getBlockGlobal(gx + a.corner[0], gy + a.corner[1], gz + a.corner[2])) ? 1 : 0;
  if (s1 && s2) return 0.5;
  return 1.0 - (s1 + s2 + c) * 0.15;
}

function getTextureFile(blockType, faceDir) {
  const t = BLOCK_TEXTURES[blockType];
  if (!t) return 'rock.png';
  if (faceDir[1] === 1) return t.top;
  if (faceDir[1] === -1) return t.bottom;
  return t.side;
}

function buildChunkMesh(cx, cz) {
  const key = `${cx},${cz}`;
  if (chunkMeshes.has(key)) {
    const old = chunkMeshes.get(key);
    scene.remove(old);
    old.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    chunkMeshes.delete(key);
  }

  const chunk = world.getChunk(cx, cz);
  const bx = cx * 16, bz = cz * 16;

  const buffers = new Map();

  function getBuf(filename, transparent) {
    const bufKey = filename + (transparent ? '_t' : '');
    if (!buffers.has(bufKey)) {
      buffers.set(bufKey, { filename, transparent, pos: [], norm: [], uv: [], color: [], idx: [], count: 0 });
    }
    return buffers.get(bufKey);
  }

  let maxY = 0;
  for (let x = 0; x < 16; x++) {
    for (let z = 0; z < 16; z++) {
      for (let y = CHUNK_H - 1; y >= 0; y--) {
        if (chunk.get(x, y, z) !== 0) {
          if (y > maxY) maxY = y;
          break;
        }
      }
    }
  }
  maxY = Math.min(CHUNK_H, maxY + 2);

  for (let x = 0; x < 16; x++) {
    for (let y = 0; y <= maxY; y++) {
      for (let z = 0; z < 16; z++) {
        const b = chunk.get(x, y, z);
        if (b === BLOCK.AIR) continue;

        const isWater = b === BLOCK.WATER;
        const tint = getTintForBlock(b);

        for (let fi = 0; fi < FACES.length; fi++) {
          const face = FACES[fi];
          const nx = bx + x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = bz + z + face.dir[2];
          const nb = world.getBlockGlobal(nx, ny, nz);

          if (!isTransparent(nb)) continue;
          if (isWater && face.dir[1] === -1) continue;

          const filename = getTextureFile(b, face.dir);
          const buf = getBuf(filename, isWater);

          const cornerUVs = [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ];

          for (let vi = 0; vi < 4; vi++) {
            const c = face.corners[vi];
            buf.pos.push(bx + x + c[0], y + c[1], bz + z + c[2]);
            buf.norm.push(...face.dir);
            const ao = computeAO(bx + x, y, bz + z, face, vi);
            buf.color.push(ao * tint[0], ao * tint[1], ao * tint[2]);
            buf.uv.push(cornerUVs[vi][0], cornerUVs[vi][1]);
          }
          buf.idx.push(buf.count, buf.count + 1, buf.count + 2);
          buf.idx.push(buf.count, buf.count + 2, buf.count + 3);
          buf.count += 4;
        }
      }
    }
  }

  const group = new THREE.Group();

  for (const buf of buffers.values()) {
    if (buf.pos.length === 0) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(buf.norm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(buf.color, 3));
    geo.setIndex(buf.idx);
    const mat = getMaterial(buf.filename, buf.transparent);
    const mesh = new THREE.Mesh(geo, mat);
    if (buf.transparent) mesh.renderOrder = 2;
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

let lastPlayerChunkX = null;
let lastPlayerChunkZ = null;
const buildQueue = [];

function queueChunksAround(px, pz) {
  const pcx = Math.floor(px / 16);
  const pcz = Math.floor(pz / 16);
  if (pcx === lastPlayerChunkX && pcz === lastPlayerChunkZ && buildQueue.length === 0) return;
  lastPlayerChunkX = pcx;
  lastPlayerChunkZ = pcz;

  const needed = [];
  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
      const cx = pcx + dx;
      const cz = pcz + dz;
      if (!chunkMeshes.has(`${cx},${cz}`)) needed.push({ cx, cz, dist: dx*dx + dz*dz });
    }
  }
  needed.sort((a, b) => a.dist - b.dist);
  buildQueue.length = 0;
  for (const n of needed) buildQueue.push(n);

  for (const key of [...chunkMeshes.keys()]) {
    const [cx, cz] = key.split(',').map(Number);
    if (Math.abs(cx - pcx) > RENDER_DISTANCE + 1 || Math.abs(cz - pcz) > RENDER_DISTANCE + 1) {
      unloadChunkMesh(cx, cz);
    }
  }
}

function processBuildQueue(maxPerFrame = 2) {
  for (let i = 0; i < maxPerFrame && buildQueue.length > 0; i++) {
    const { cx, cz } = buildQueue.shift();
    buildChunkMesh(cx, cz);
  }
}

const cloudMesh = createClouds(scene);
const sunSprite = createSun(scene);

function findSpawn() {
  let best = null;
  let bestScore = -Infinity;
  for (let tx = -150; tx <= 150; tx += 8) {
    for (let tz = -150; tz <= 150; tz += 8) {
      const h = world.heightAt(tx, tz);
      if (h < SEA_LEVEL + 4) continue;
      const biome = world.biomeAt(tx, tz);
      if (biome === BIOME.OCEAN || biome === BIOME.BEACH) continue;
      let waterNear = 0;
      for (let dx = -20; dx <= 20; dx += 8) {
        for (let dz = -20; dz <= 20; dz += 8) {
          const nh = world.heightAt(tx + dx, tz + dz);
          if (nh < SEA_LEVEL) waterNear++;
        }
      }
      const score = -waterNear + (h >= 14 && h <= 22 ? 5 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = { x: tx + 0.5, y: h + 3, z: tz + 0.5 };
      }
    }
  }
  if (best) return best;
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

function raycastBlock(maxDist = 6) {
  const origin = new THREE.Vector3(player.x, player.y, player.z);
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
  const step = 0.05;
  let prev = null;
  for (let t = 0; t < maxDist; t += step) {
    const px = Math.floor(origin.x + dir.x * t);
    const py = Math.floor(origin.y + dir.y * t);
    const pz = Math.floor(origin.z + dir.z * t);
    const b = world.getBlockGlobal(px, py, pz);
    if (b !== BLOCK.AIR && b !== BLOCK.WATER) return { x: px, y: py, z: pz, prev };
    prev = { x: px, y: py, z: pz };
  }
  return null;
}

const touch = {
  moveId: null, lookId: null, jumpId: null, tapId: null,
  moveStart: { x: 0, y: 0 }, moveCur: { x: 0, y: 0 },
  lookLast: { x: 0, y: 0 },
  tapStartTime: 0, tapMoved: false,
};
let yaw = 0, pitch = 0;

const joyBase = document.getElementById('joyBase');
const joyKnob = document.getElementById('joyKnob');
const jumpBtn = document.getElementById('jumpBtn');

let selectedBlock = BLOCK.GRASS;
const slotEls = document.querySelectorAll('.slot');
const blockBySlot = {
  1: BLOCK.GRASS, 2: BLOCK.DIRT, 3: BLOCK.STONE, 4: BLOCK.SAND, 5: BLOCK.WOOD,
};
function updateHotbarSelection() {
  slotEls.forEach(el => {
    const slotNum = parseInt(el.dataset.block);
    if (blockBySlot[slotNum] === selectedBlock) el.classList.add('selected');
    else el.classList.remove('selected');
  });
}

function inRect(t, el) {
  const r = el.getBoundingClientRect();
  return t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom;
}

canvas.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    let handled = false;
    slotEls.forEach(el => {
      if (inRect(t, el)) {
        const slotNum = parseInt(el.dataset.block);
        selectedBlock = blockBySlot[slotNum];
        updateHotbarSelection();
        handled = true;
      }
    });
    if (handled) continue;

    if (inRect(t, jumpBtn) && touch.jumpId === null) {
      touch.jumpId = t.identifier;
      jumpBtn.classList.add('active');
      if (player.onGround) player.vy = JUMP_V;
      continue;
    }

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

    if (touch.lookId === null) {
      touch.lookId = t.identifier;
      touch.lookLast = { x: t.clientX, y: t.clientY };
      touch.tapId = t.identifier;
      touch.tapStartTime = performance.now();
      touch.tapMoved = false;
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
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touch.tapMoved = true;
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
    if (t.identifier === touch.lookId) {
      const dur = performance.now() - touch.tapStartTime;
      if (!touch.tapMoved && dur < 400 && t.identifier === touch.tapId) {
        handleTap();
      }
      touch.lookId = null;
      touch.tapId = null;
    }
    if (t.identifier === touch.jumpId) {
      touch.jumpId = null;
      jumpBtn.classList.remove('active');
    }
  }
}, { passive: false });

function handleTap() {
  const hit = raycastBlock(6);
  if (!hit) return;
  world.setBlockGlobal(hit.x, hit.y, hit.z, BLOCK.AIR);
}

const infoX = document.getElementById('infoX');
const infoY = document.getElementById('infoY');
const infoZ = document.getElementById('infoZ');
let infoTimer = 0;

function updateInfo() {
  infoX.textContent = player.x.toFixed(0);
  infoY.textContent = player.y.toFixed(1);
  infoZ.textContent = player.z.toFixed(0);
}

function rebuildDirtyChunks(maxPerFrame = 2) {
  const dirty = world.consumeDirty();
  for (let i = 0; i < Math.min(maxPerFrame, dirty.length); i++) {
    const [cx, cz] = dirty[i].split(',').map(Number);
    buildChunkMesh(cx, cz);
  }
}

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

  if (player.y < -10) { player.y = 30; player.vy = 0; }

  camera.position.set(player.x, player.y, player.z);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  queueChunksAround(player.x, player.z);
  processBuildQueue(2);
  rebuildDirtyChunks(2);

  infoTimer++;
  if (infoTimer % 10 === 0) updateInfo();
}

function initialBuild() {
  const pcx = Math.floor(player.x / 16);
  const pcz = Math.floor(player.z / 16);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      buildChunkMesh(pcx + dx, pcz + dz);
    }
  }
}

function showLoading() {
  const box = document.getElementById('errorBox');
  if (box) {
    box.style.display = 'block';
    box.style.background = 'rgba(0,0,0,0.85)';
    box.textContent = '⏳ Loading textures...';
  }
}

function hideLoading() {
  const box = document.getElementById('errorBox');
  if (box) box.style.display = 'none';
}

// ==== START ====
showLoading();
loadAllTextures().then(() => {
  hideLoading();
  initialBuild();
  queueChunksAround(player.x, player.z);
  updateHotbarSelection();
  animate();
});

function animate() {
  requestAnimationFrame(animate);
  updatePlayer();
  cloudMesh.position.x = player.x;
  cloudMesh.position.z = player.z;
  cloudMesh.material.map.offset.x += 0.0003;
  sunSprite.position.set(player.x + 150, 200, player.z - 150);
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
