import { Chunk } from './chunk.js';

export class World {
  constructor() {
    this.chunks = new Map();
  }

  key(cx, cz) { return `${cx},${cz}`; }

  getChunk(cx, cz) {
    const k = this.key(cx, cz);
    if (!this.chunks.has(k)) {
      const c = new Chunk(cx, cz);
      this.generate(cx, cz, c);
      this.chunks.set(k, c);
    }
    return this.chunks.get(k);
  }

  // Cek blok di koordinat global (lintas chunk)
  getBlockGlobal(gx, gy, gz) {
    if (gy < 0 || gy >= 16) return 0;
    const cx = Math.floor(gx / 16);
    const cz = Math.floor(gz / 16);
    const lx = ((gx % 16) + 16) % 16;
    const lz = ((gz % 16) + 16) % 16;
    return this.getChunk(cx, cz).get(lx, gy, lz);
  }

  generate(cx, cz, chunk) {
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        for (let y = 0; y < 4; y++) {
          chunk.set(x, y, z, 1);
        }
      }
    }
  }
}
