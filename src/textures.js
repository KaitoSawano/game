import * as THREE from 'three';

// Setiap blok punya material sendiri (top, side, bottom)
// Di-load dari file PNG di ./textures/

export const BLOCK_TEXTURES = {
  // GRASS
  1: { top: 'dirt_grass.png', side: 'dirt_grass.png', bottom: 'dirt.png' },
  // DIRT
  2: { top: 'dirt.png', side: 'dirt.png', bottom: 'dirt.png' },
  // STONE
  3: { top: 'rock.png', side: 'rock.png', bottom: 'rock.png' },
  // WATER
  4: { top: 'water.png', side: 'water.png', bottom: 'water.png' },
  // SAND
  5: { top: 'sand.png', side: 'sand.png', bottom: 'sand.png' },
  // WOOD (oak)
  6: { top: 'trunk_top.png', side: 'trunk_side.png', bottom: 'trunk_bottom.png' },
  // LEAVES (oak)
  7: { top: 'leaves_oak.png', side: 'leaves_oak.png', bottom: 'leaves_oak.png' },
  // SNOW
  8: { top: 'dirt_snow.png', side: 'dirt_snow.png', bottom: 'dirt.png' },
  // CACTUS (pakai grass4 sebagai semak)
  9: { top: 'grass4.png', side: 'grass4.png', bottom: 'grass4.png' },
  // ICE
  10: { top: 'ice.png', side: 'ice.png', bottom: 'ice.png' },
  // SANDSTONE
  11: { top: 'dirt_sand.png', side: 'dirt_sand.png', bottom: 'dirt_sand.png' },
  // BIRCH_WOOD
  12: { top: 'trunk_top.png', side: 'trunk_side.png', bottom: 'trunk_bottom.png' },
  // BIRCH_LEAVES
  13: { top: 'leaves_birch.png', side: 'leaves_birch.png', bottom: 'leaves_birch.png' },
};

// Cache: filename → THREE.Texture
const textureCache = new Map();

export function loadTexture(filename) {
  if (textureCache.has(filename)) return textureCache.get(filename);
  const loader = new THREE.TextureLoader();
  const tex = loader.load('./textures/' + filename);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(filename, tex);
  return tex;
}

// Material cache: filename → THREE.Material
const materialCache = new Map();

export function getMaterial(filename, transparent) {
  const key = filename + (transparent ? '_t' : '');
  if (materialCache.has(key)) return materialCache.get(key);
  const tex = loadTexture(filename);
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    side: THREE.FrontSide,
    transparent: !!transparent,
    alphaTest: transparent ? 0 : 0.5,
  });
  if (transparent) mat.opacity = 0.7;
  materialCache.set(key, mat);
  return mat;
}

// Warna untuk blok yang perlu di-tint (di-multiply dengan tekstur)
// Format: [r, g, b] range 0..1
export const BLOCK_TINT = {
  9: [0.7, 1.0, 0.6],   // CACTUS/semak — hijau
};

export function getTintForBlock(blockType) {
  return BLOCK_TINT[blockType] || [1, 1, 1];
}
