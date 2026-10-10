import * as THREE from 'three';

export const BLOCK_TEXTURES = {
  1:  { top: 'dirt_grass.png', side: 'dirt_grass.png', bottom: 'dirt.png' },
  2:  { top: 'dirt.png', side: 'dirt.png', bottom: 'dirt.png' },
  3:  { top: 'rock.png', side: 'rock.png', bottom: 'rock.png' },
  4:  { top: 'water.png', side: 'water.png', bottom: 'water.png' },
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

// ==== TEXTURE LOADER ====
const textureCache = new Map();
const materialCache = new Map();
let loadedCount = 0;
let totalCount = 0;

const ALL_FILES = new Set();
for (const k in BLOCK_TEXTURES) {
  const t = BLOCK_TEXTURES[k];
  ALL_FILES.add(t.top);
  ALL_FILES.add(t.side);
  ALL_FILES.add(t.bottom);
}
totalCount = ALL_FILES.size;

export function getLoadProgress() {
  return { loaded: loadedCount, total: totalCount };
}

// Load semua texture dulu, return Promise yang resolve kalau semua selesai
export function loadAllTextures() {
  const loader = new THREE.TextureLoader();
  const promises = [];

  for (const filename of ALL_FILES) {
    const p = new Promise((resolve, reject) => {
      loader.load(
        './textures/' + filename,
        (tex) => {
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          textureCache.set(filename, tex);
          loadedCount++;
          resolve();
        },
        undefined,
        (err) => {
          console.error('Gagal load texture:', filename, err);
          loadedCount++;
          resolve(); // tetap resolve biar tidak hang
        }
      );
    });
    promises.push(p);
  }

  return Promise.all(promises);
}

// Material: HARUS ada vertexColors: true
export function getMaterial(filename, transparent) {
  const key = filename + (transparent ? '_t' : '');
  if (materialCache.has(key)) return materialCache.get(key);

  const tex = textureCache.get(filename);
  if (!tex) {
    // Fallback kalau tekstur belum siap — warna pink debug
    const mat = new THREE.MeshLambertMaterial({
      color: 0xff00ff,
      vertexColors: true,
    });
    return mat;
  }

  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    side: THREE.FrontSide,
    transparent: !!transparent,
    alphaTest: transparent ? 0 : 0.5,
    vertexColors: true,   // ← KUNCI
  });
  if (transparent) mat.opacity = 0.7;
  materialCache.set(key, mat);
  return mat;
}
