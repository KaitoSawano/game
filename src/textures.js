import * as THREE from 'three';

export const TILE_SIZE = 16;
export const ATLAS_COLS = 32;

export const BLOCK_TILES = {
  1:  { top: 0,  side: 1,  bottom: 2  },
  2:  { top: 3,  side: 3,  bottom: 3  },
  3:  { top: 4,  side: 4,  bottom: 4  },
  4:  { top: 5,  side: 5,  bottom: 5  },
  5:  { top: 6,  side: 6,  bottom: 6  },
  6:  { top: 7,  side: 7,  bottom: 7  },
  7:  { top: 8,  side: 8,  bottom: 8  },
  8:  { top: 9,  side: 9,  bottom: 9  },
  9:  { top: 10, side: 10, bottom: 10 },
  10: { top: 11, side: 11, bottom: 11 },
  11: { top: 12, side: 12, bottom: 12 },
  12: { top: 13, side: 13, bottom: 13 },
  13: { top: 14, side: 14, bottom: 14 },
};

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function shade(hex, amount) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const nr = Math.max(0, Math.min(255, r + amount));
  const ng = Math.max(0, Math.min(255, g + amount));
  const nb = Math.max(0, Math.min(255, b + amount));
  return `rgb(${nr|0},${ng|0},${nb|0})`;
}

function drawNoise(ctx, x0, y0, baseColor, variance, seed) {
  const r = rng(seed);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const v = (r() - 0.5) * variance;
      ctx.fillStyle = shade(baseColor, v);
      ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
}

function drawGrassTop(ctx, x0, y0) { drawNoise(ctx, x0, y0, 0x5cb85c, 40, 1); }

function drawGrassSide(ctx, x0, y0) {
  drawNoise(ctx, x0, y0, 0x8b5a2b, 30, 2);
  for (let x = 0; x < TILE_SIZE; x++) {
    const rr = rng(x * 13);
    const h = 3 + Math.floor(rr() * 3);
    for (let y = 0; y < h; y++) {
      ctx.fillStyle = shade(0x5cb85c, (rng(x + y * 7)() - 0.5) * 30);
      ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
}

function drawDirt(ctx, x0, y0) {
  drawNoise(ctx, x0, y0, 0x8b5a2b, 35, 3);
  const r = rng(4);
  for (let i = 0; i < 20; i++) {
    const px = Math.floor(r() * TILE_SIZE);
    const py = Math.floor(r() * TILE_SIZE);
    ctx.fillStyle = shade(0x6b3f1e, 0);
    ctx.fillRect(x0 + px, y0 + py, 1, 1);
  }
}

function drawStone(ctx, x0, y0) {
  drawNoise(ctx, x0, y0, 0x888888, 30, 5);
  const r = rng(6);
  for (let i = 0; i < 15; i++) {
    const px = Math.floor(r() * TILE_SIZE);
    const py = Math.floor(r() * TILE_SIZE);
    ctx.fillStyle = shade(0x666666, 0);
    ctx.fillRect(x0 + px, y0 + py, 1, 1);
  }
}

function drawWater(ctx, x0, y0) { drawNoise(ctx, x0, y0, 0x3399ff, 25, 7); }
function drawSand(ctx, x0, y0) { drawNoise(ctx, x0, y0, 0xe8d68a, 25, 8); }

function drawWood(ctx, x0, y0) {
  drawNoise(ctx, x0, y0, 0x6b4423, 25, 9);
  for (let x = 2; x < TILE_SIZE; x += 4) {
    ctx.fillStyle = shade(0x4a2e15, 0);
    ctx.fillRect(x0 + x, y0, 1, TILE_SIZE);
  }
}

function drawLeaves(ctx, x0, y0) { drawNoise(ctx, x0, y0, 0x2e7d32, 60, 10); }
function drawSnow(ctx, x0, y0) { drawNoise(ctx, x0, y0, 0xf0f8ff, 15, 12); }

function drawCactus(ctx, x0, y0) {
  drawNoise(ctx, x0, y0, 0x2e7d32, 25, 13);
  for (let y = 0; y < TILE_SIZE; y += 4) {
    ctx.fillStyle = shade(0x1a4d1a, 0);
    ctx.fillRect(x0 + 3, y0 + y + 2, 1, 1);
    ctx.fillRect(x0 + 11, y0 + y + 2, 1, 1);
  }
}

function drawIce(ctx, x0, y0) { drawNoise(ctx, x0, y0, 0xaaddff, 20, 14); }

function drawSandstone(ctx, x0, y0) {
  drawNoise(ctx, x0, y0, 0xd4b876, 20, 15);
  for (let y = 0; y < TILE_SIZE; y += 4) {
    ctx.fillStyle = shade(0xb89a5a, 0);
    ctx.fillRect(x0, y0 + y, TILE_SIZE, 1);
  }
}

function drawBirchWood(ctx, x0, y0) {
  drawNoise(ctx, x0, y0, 0xd4c8a8, 20, 16);
  const r = rng(17);
  for (let i = 0; i < 8; i++) {
    const px = Math.floor(r() * (TILE_SIZE - 2));
    const py = Math.floor(r() * TILE_SIZE);
    ctx.fillStyle = shade(0x4a3a20, 0);
    ctx.fillRect(x0 + px, y0 + py, 2, 1);
  }
}

function drawBirchLeaves(ctx, x0, y0) { drawNoise(ctx, x0, y0, 0x6dbf5c, 60, 18); }

const TILE_DRAWERS = {
  0: drawGrassTop,
  1: drawGrassSide,
  2: drawDirt,
  3: drawDirt,
  4: drawStone,
  5: drawWater,
  6: drawSand,
  7: drawWood,
  8: drawLeaves,
  9: drawSnow,
  10: drawCactus,
  11: drawIce,
  12: drawSandstone,
  13: drawBirchWood,
  14: drawBirchLeaves,
};

export function generateAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const tileIdx in TILE_DRAWERS) {
    const x0 = parseInt(tileIdx) * TILE_SIZE;
    TILE_DRAWERS[tileIdx](ctx, x0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
