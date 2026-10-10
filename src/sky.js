import * as THREE from 'three';

export function createClouds(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  let s = 42;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rng() * 15) * 16;
    const y = Math.floor(rng() * 15) * 16;
    const w = (1 + Math.floor(rng() * 3)) * 16;
    const h = (1 + Math.floor(rng() * 2)) * 16;
    ctx.fillRect(x, y, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.PlaneGeometry(600, 600);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    fog: false,
  });
  const cloud = new THREE.Mesh(geo, mat);
  cloud.rotation.x = -Math.PI / 2;
  cloud.position.y = 60;
  scene.add(cloud);
  return cloud;
}

export function createSun(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,200,1)');
  grad.addColorStop(0.5, 'rgba(255,230,120,0.8)');
  grad.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false });
  const sun = new THREE.Sprite(mat);
  sun.scale.set(40, 40, 1);
  sun.position.set(150, 200, -150);
  scene.add(sun);
  return sun;
}
