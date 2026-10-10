export class Chunk {
  constructor(cx, cz, height = 64) {
    this.cx = cx;
    this.cz = cz;
    this.size = 16;
    this.height = height;
    this.data = new Uint8Array(16 * height * 16);
    this.mesh = null;
  }

  idx(x, y, z) {
    return y * 256 + z * 16 + x;
  }

  get(x, y, z) {
    if (x < 0 || x > 15 || z < 0 || z > 15 || y < 0 || y >= this.height) return 0;
    return this.data[this.idx(x, y, z)];
  }

  set(x, y, z, v) {
    if (x < 0 || x > 15 || z < 0 || z > 15 || y < 0 || y >= this.height) return;
    this.data[this.idx(x, y, z)] = v;
  }
}
