import * as THREE from 'three';

export const BLOCK_TEXTURES = {
  1:  { top: 'dirt_grass.png', side: 'dirt_grass.png', bottom: 'dirt.png' },
  2:  { top: 'dirt.png', side: 'dirt.png', bottom: 'dirt.png' },
  3:  { top: 'rock.png', side: 'rock.png', bottom: 'rock.png' },
  4:  { top: null, side: null, bottom: null },  // WATER: pakai warna solid
  5:  { top: 'sand.png', side: 'sand.png', bottom: 'sand.png' },
  6:  { top: 'trunk_top.png', side: 'trunk_side.png', bottom: 'trunk_bottom.png' },
  7:  { top: 'leaves_oak.png', side: 'leaves_oak.png', bottom: 'leaves_oak.png' },
  8:  { top: 'dirt_snow.png', side: 'dirt_snow.png', bottom: 'dirt.png' },
  9:  { top: 'grass4.png', side: 'grass4.png', bottom: 'grass4.png' },
  10: { top: 'ice.png', side: 'ice.png', bottom: 'ice.png' },
  11: { top: 'dirt_sand.png', side: 'dirt_sand.png', bottom: 'dirt_sand.png' },
  12: { top: 'trunk_top.png', side: 'trunk_side.png', bottom: 'trunk_bottom.png' },
  13: { top: 'leaves_birch.png', side: 'leaves_birch.png', bottom: 'leaves_birch.png' },
};

export const BLOCK_TINT = {
  9: [0.7, 1.0, 0.6],
};

export function getTintForBlock(blockType) {
  return BLOCK_TINT[blockType] || [1, 1, 1];
}

// Warna solid untuk blok yang TIDAK pakai texture
export const BLOCK_SOLID_COLOR = {
  4: 0x3a7ec8,   // WATER: biru
};

const textureCache = new Map();
const materialCache = new Map();
let loadedCount = 0;
let totalCount = 0;

const ALL_FILES = new Set();
for (const k in BLOCK_TEXTURES) {
  const t = BLOCK_TEXTURES[k];
  if (t.top) ALL_FILES.add(t.top);
  if (t.side) ALL_FILES.add(t.side);
  if (t.bottom) ALL_FILES.add(t.bottom);
}
totalCount = ALL_FILES.size;

export function getLoadProgress() {
  return { loaded: loadedCount, total: totalCount };
}

export function loadAllTextures() {
  const loader = new THREE.TextureLoader();
  const promises = [];

  for (const filename of ALL_FILES) {
    const p = new Promise((resolve) => {
      loader.load(
        './textures/' + filename,
        (tex) => {
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.flipY = false;
          textureCache.set(filename, tex);
          loadedCount++;
          resolve();
        },
        undefined,
        (err) => {
          console.error('Gagal load texture:', filename, err);
          loadedCount++;
          resolve();
        }
      );
    });
    promises.push(p);
  }

  return Promise.all(promises);
}

// Cache material biasa (opaque)
export function getMaterial(filename) {
  const key = 'opaque_' + filename;
  if (materialCache.has(key)) return materialCache.get(key);

  const tex = textureCache.get(filename);
  if (!tex) {
    return new THREE.MeshLambertMaterial({
      color: 0xff00ff,
      vertexColors: true,
      side: THREE.FrontSide,
    });
  }

  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    side: THREE.FrontSide,
    vertexColors: true,
    // TIDAK ada alphaTest, TIDAK ada transparent
  });
  materialCache.set(key, mat);
  return mat;
}

// Material untuk air (warna solid + transparan)
export function getWaterMaterial() {
  const key = 'water';
  if (materialCache.has(key)) return materialCache.get(key);
  const mat = new THREE.MeshLambertMaterial({
    color: 0x3a7ec8,
    transparent: true,
    opacity: 0.65,
    side: THREE.FrontSide,
    vertexColors: true,
    depthWrite: false,
  });
  materialCache.set(key, mat);
  return mat;
}
