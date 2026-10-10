export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.size = 16;
    this.data = new Uint8Array(16 * 16 * 16);
    this.mesh = null;
  }

  get(x, y, z) {
    return this.data[y * 256 + z * 16 + x] || 0;
  }

  set(x, y, z, v) {
    this.data[y * 256 + z * 16 + x] = v;
  }
}
