import { Chunk } from './chunk.js';

// ==== HASH YANG BENAR (bekerja untuk koordinat negatif) ====
function hash(x, z) {
  // Integer hash yang stabil untuk negatif
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
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

function fbm(x, z, octaves = 4) {
  let v = 0, amp = 1, freq = 1, total = 0;
  for (let i = 0; i < octaves; i++) {
    v += noise2D(x * freq, z * freq) * amp;
    total += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return v / total;
}

export const BLOCK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WATER: 4, SAND: 5,
  WOOD: 6, LEAVES: 7, SNOW: 8, CACTUS: 9, ICE: 10,
  SANDSTONE: 11, BIRCH_WOOD: 12, BIRCH_LEAVES: 13,
};

export const BIOME = {
  PLAINS: 0, DESERT: 1, FOREST: 2, SNOW: 3,
  OCEAN: 4, BEACH: 5, MOUNTAIN: 6,
};

export const CHUNK_H = 64;
export const SEA_LEVEL = 10;

export class World {
  constructor(seed = 12345) {
    this.seed = seed;
    this.chunks = new Map();
    this.dirtyChunks = new Set();
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

  setBlockGlobal(gx, gy, gz, v) {
    if (gy < 0 || gy >= CHUNK_H) return false;
    const cx = Math.floor(gx / 16);
    const cz = Math.floor(gz / 16);
    const lx = ((gx % 16) + 16) % 16;
    const lz = ((gz % 16) + 16) % 16;
    const chunk = this.getChunk(cx, cz);
    if (chunk.get(lx, gy, lz) === v) return false;
    chunk.set(lx, gy, lz, v);

    this.markDirty(cx, cz);
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === 15) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === 15) this.markDirty(cx, cz + 1);
    return true;
  }

  markDirty(cx, cz) {
    this.dirtyChunks.add(this.key(cx, cz));
  }

  consumeDirty() {
    const dirty = [...this.dirtyChunks];
    this.dirtyChunks.clear();
    return dirty;
  }

  // ==== HEIGHT: sekarang pakai BENAR-BENAR noise ====
  heightAt(gx, gz) {
    const s = this.seed;
    // Benua: skala besar, menentukan daratan vs laut
    const continent = fbm((gx + s) * 0.003, (gz + s) * 0.003, 3);
    // Bukit: skala sedang
    const hills = fbm((gx + s) * 0.015, (gz + s) * 0.015, 3);
    // Gunung: skala kecil, jarang
    const mountain = fbm((gx + s * 3) * 0.008, (gz + s * 3) * 0.008, 4);

    // Base dari kontinen: 4..14 (bisa di bawah sea level)
    let h = 4 + continent * 10;
    // Tambah bukit: -2..+2
    h += (hills - 0.5) * 4;
    // Gunung: kalau mountain tinggi, tambah besar
    if (mountain > 0.6) {
      h += (mountain - 0.6) * 80;
    }
    return Math.floor(h);
  }

  biomeAt(gx, gz) {
    const s = this.seed;
    const temp = fbm((gx + s) * 0.002, (gz + s) * 0.002, 2);
    const humid = fbm((gx + s * 2) * 0.002, (gz + s * 2) * 0.002, 2);
    const h = this.heightAt(gx, gz);

    if (h < SEA_LEVEL - 1) return BIOME.OCEAN;
    if (h < SEA_LEVEL + 1) return BIOME.BEACH;
    if (h > 30) return BIOME.MOUNTAIN;

    if (temp < 0.3) return BIOME.SNOW;
    if (temp > 0.7 && humid < 0.4) return BIOME.DESERT;
    if (humid > 0.6) return BIOME.FOREST;
    return BIOME.PLAINS;
  }

  generate(cx, cz, chunk) {
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const gx = cx * 16 + x;
        const gz = cz * 16 + z;
        const h = this.heightAt(gx, gz);
        const biome = this.biomeAt(gx, gz);

        let surface, subsurface, deep;
        switch (biome) {
          case BIOME.DESERT:
            surface = BLOCK.SAND; subsurface = BLOCK.SANDSTONE; deep = BLOCK.STONE;
            break;
          case BIOME.SNOW:
            surface = BLOCK.SNOW; subsurface = BLOCK.DIRT; deep = BLOCK.STONE;
            break;
          case BIOME.BEACH:
            surface = BLOCK.SAND; subsurface = BLOCK.SAND; deep = BLOCK.STONE;
            break;
          case BIOME.MOUNTAIN:
            surface = h > 35 ? BLOCK.SNOW : BLOCK.STONE;
            subsurface = BLOCK.STONE; deep = BLOCK.STONE;
            break;
          case BIOME.OCEAN:
            surface = BLOCK.SAND; subsurface = BLOCK.DIRT; deep = BLOCK.STONE;
            break;
          default:
            surface = BLOCK.GRASS; subsurface = BLOCK.DIRT; deep = BLOCK.STONE;
        }

        // Isi tanah sampai h
        for (let y = 0; y <= h; y++) {
          let block;
          if (y === h) block = surface;
          else if (y > h - 4) block = subsurface;
          else block = deep;
          chunk.set(x, y, z, block);
        }

        // Isi air dari h+1 sampai SEA_LEVEL kalau h < SEA_LEVEL
        if (h < SEA_LEVEL) {
          for (let y = h + 1; y <= SEA_LEVEL; y++) {
            if (y === SEA_LEVEL && biome === BIOME.SNOW) chunk.set(x, y, z, BLOCK.ICE);
            else chunk.set(x, y, z, BLOCK.WATER);
          }
        }
      }
    }

    // ==== VEGETASI ====
    // Loop seluruh chunk (bukan cuma tengah) supaya pohon lebih banyak
    for (let x = 2; x <= 13; x++) {
      for (let z = 2; z <= 13; z++) {
        const gx = cx * 16 + x;
        const gz = cz * 16 + z;
        const h = this.heightAt(gx, gz);
        const biome = this.biomeAt(gx, gz);
        // Jangan tanam di air
        if (h <= SEA_LEVEL) continue;
        // Jangan tanam di gunung tinggi
        if (h > 30) continue;

        const r = hash(gx * 7, gz * 13);

        if (biome === BIOME.FOREST) {
          if (r > 0.75) this.placeTree(chunk, x, h + 1, z, BLOCK.WOOD, BLOCK.LEAVES);
        } else if (biome === BIOME.PLAINS) {
          if (r > 0.90) this.placeTree(chunk, x, h + 1, z, BLOCK.WOOD, BLOCK.LEAVES);
        } else if (biome === BIOME.DESERT) {
          if (r > 0.90) this.placeCactus(chunk, x, h + 1, z);
        } else if (biome === BIOME.SNOW) {
          if (r > 0.85) this.placeTree(chunk, x, h + 1, z, BLOCK.BIRCH_WOOD, BLOCK.BIRCH_LEAVES);
        }
      }
    }
  }

  placeTree(chunk, x, y, z, woodBlock, leafBlock) {
    const trunkH = 4 + Math.floor(hash(x * 3, z * 5) * 3);
    for (let i = 0; i < trunkH; i++) {
      if (y + i < CHUNK_H) chunk.set(x, y + i, z, woodBlock);
    }
    const topY = y + trunkH;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy !== 0) continue;
          const lx = x + dx, lz = z + dz, ly = topY + dy;
          if (lx < 0 || lx > 15 || lz < 0 || lz > 15) continue;
          if (ly < 0 || ly >= CHUNK_H) continue;
          if (chunk.get(lx, ly, lz) === 0) chunk.set(lx, ly, lz, leafBlock);
        }
      }
    }
  }

  placeCactus(chunk, x, y, z) {
    const h = 2 + Math.floor(hash(x * 5, z * 7) * 3);
    for (let i = 0; i < h; i++) {
      if (y + i < CHUNK_H) chunk.set(x, y + i, z, BLOCK.CACTUS);
    }
  }
}
