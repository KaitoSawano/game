import { Chunk } from './chunk.js';

// Simple hash & value noise — cukup untuk terrain
function hash(x, z) {
  let h = x * 374761393 + z * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function smooth(t) { return t * t * (3 - 2 * t); }

function noise2D(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  const u = smooth(xf), v = smooth(zf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x, z) {
  let v = 0, amp = 1, freq = 1, total = 0;
  for (let i = 0; i < 4; i++) {
    v += noise2D(x * freq, z * freq) * amp;
    total += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return v / total;
}

export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WATER: 4,
  SAND: 5,
  WOOD: 6,
  LEAVES: 7,
};

export const CHUNK_H = 64;

export class World {
  constructor(seed = 12345) {
    this.seed = seed;
    this.chunks = new Map();
  }

  key(cx, cz) { return `${cx},${cz}`; }

  getChunk(cx, cz) {
    const k = this.key(cx, cz);
    if (!this.chunks.has(k)) {
      const c = new Chunk(cx, cz, CHUNK_H);
      this.generate(cx, cz, c);
      this.chunks.set(k, c);
    }
    return this.chunks.get(k);
  }

  getBlockGlobal(gx, gy, gz) {
    if (gy < 0 || gy >= CHUNK_H) return 0;
    const cx = Math.floor(gx / 16);
    const cz = Math.floor(gz / 16);
    const lx = ((gx % 16) + 16) % 16;
    const lz = ((gz % 16) + 16) % 16;
    return this.getChunk(cx, cz).get(lx, gy, lz);
  }

  heightAt(gx, gz) {
    const sx = (gx + this.seed) * 0.01;
    const sz = (gz + this.seed) * 0.01;
    const base = fbm(sx, sz);
    const mountain = fbm(sx * 0.3 + 100, sz * 0.3 + 100);
    let h = 6 + base * 10;
    if (mountain > 0.65) {
      h += (mountain - 0.65) * 60;
    }
    return Math.floor(h);
  }

  generate(cx, cz, chunk) {
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const gx = cx * 16 + x;
        const gz = cz * 16 + z;
        const h = this.heightAt(gx, gz);

        for (let y = 0; y <= h; y++) {
          let block;
          if (y === h) {
            if (h < 8) block = BLOCK.SAND;
            else if (h > 20) block = BLOCK.STONE;
            else block = BLOCK.GRASS;
          } else if (y > h - 4) {
            block = BLOCK.DIRT;
          } else {
            block = BLOCK.STONE;
          }
          chunk.set(x, y, z, block);
        }

        if (h < 7) {
          for (let y = h + 1; y <= 7; y++) {
            chunk.set(x, y, z, BLOCK.WATER);
          }
        }
      }
    }

    // Pohon hanya di area dalam chunk, dan hanya di rumput
    for (let x = 3; x < 13; x++) {
      for (let z = 3; z < 13; z++) {
        const gx = cx * 16 + x;
        const gz = cz * 16 + z;
        const h = this.heightAt(gx, gz);
        if (h < 9 || h > 20) continue;
        if (hash(gx * 7, gz * 13) < 0.985) continue;
        this.placeTree(chunk, x, h + 1, z);
      }
    }
  }

  placeTree(chunk, x, y, z) {
    const trunkH = 4;
    for (let i = 0; i < trunkH; i++) {
      if (y + i < CHUNK_H) chunk.set(x, y + i, z, BLOCK.WOOD);
    }
    const topY = y + trunkH;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          if (dy === 1 && (Math.abs(dx) === 2 || Math.abs(dz) === 2)) continue;
          const lx = x + dx, lz = z + dz, ly = topY + dy;
          if (lx < 0 || lx > 15 || lz < 0 || lz > 15) continue;
          if (ly < 0 || ly >= CHUNK_H) continue;
          if (chunk.get(lx, ly, lz) === 0) chunk.set(lx, ly, lz, BLOCK.LEAVES);
        }
      }
    }
  }
}
