import { Chunk } from './chunk.js';

export class World {
  constructor() {
    this.chunks = new Map();
  }

  key(cx, cz) {
    return `${cx},${cz}`;
  }

  getChunk(cx, cz) {
    const k = this.key(cx, cz);
    if (!this.chunks.has(k)) {
      const c = new Chunk(cx, cz);
      this.chunks.set(k, c);
      this.generate(cx, cz, c);
    }
    return this.chunks.get(k);
  }

  generate(cx, cz, chunk) {
    // Terrain datar 4 lapis untuk tahap awal
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        for (let y = 0; y < 4; y++) {
          chunk.set(x, y, z, 1);
        }
      }
    }
  }
}
