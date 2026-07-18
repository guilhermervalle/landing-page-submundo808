// ============================================================
//  HERO 808 — efeito objeto 3D interativo (Three.js / WebGL)
//  Site estático (vanilla). Sem build, sem npm.
//  Parallax + tilt + luz seguindo o mouse + scan vermelho.
// ============================================================
import * as THREE from 'three';

// ---- CONFIG (ajuste fino aqui) --------------------------------
const TEXTURE_SRC = 'assets/img/hero/808.webp';       // imagem visível
const DEPTH_SRC   = 'assets/img/hero/808-depth.webp'; // mapa de profundidade
const IMG_ASPECT  = 2752 / 1536;                      // proporção da imagem (1.7917)

const TILT_STRENGTH   = 0.22;  // inclinação seguindo o mouse (rad). Maior = mais gira
const LIGHT_STRENGTH  = 0.6;   // força da luz que acende o relevo perto do cursor
const DESKTOP_WIDTH   = 0.62;  // quanto da largura o 808 ocupa no desktop (0-1)
const MOBILE_WIDTH    = 0.9;   // idem no mobile
// ---------------------------------------------------------------

const container = document.getElementById('hero-808');
if (container) initHero808(container);

function initHero808(container) {
  // aborta com elegância se não houver WebGL
  try {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) {
      container.classList.add('no-webgl');
      return;
    }
  } catch (e) {
    container.classList.add('no-webgl');
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // transparente (fundo vem do CSS)
  container.appendChild(renderer.domElement);

  // ---- Texturas -------------------------------------------------
  const loader = new THREE.TextureLoader();
  const texMap = loader.load(TEXTURE_SRC);
  const depthMap = loader.load(DEPTH_SRC);
  texMap.colorSpace = THREE.SRGBColorSpace;
  // depth NÃO deve passar por correção sRGB
  if ('colorSpace' in depthMap) depthMap.colorSpace = THREE.NoColorSpace;

  // ---- Shader ---------------------------------------------------
  const uniforms = {
    uTexture:  { value: texMap },
    uDepth:    { value: depthMap },
    uPointer:  { value: new THREE.Vector2(0, 0) },
    uProgress: { value: 0 },   // scan que "flui" pela profundidade
    uScan:     { value: 0 },   // linha de scan horizontal
    uAspect:   { value: IMG_ASPECT },
    uTilt:     { value: LIGHT_STRENGTH },
  };

  const vertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragment = `
    precision highp float;
    varying vec2 vUv;

    uniform sampler2D uTexture;
    uniform sampler2D uDepth;
    uniform vec2  uPointer;
    uniform float uProgress;
    uniform float uScan;
    uniform float uAspect;
    uniform float uTilt; // reaproveitado como intensidade de luz

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    // cell noise ~ valor aleatório por célula (aprox. do mx_cell_noise_float)
    float cellNoise(vec2 p){ return hash(floor(p)); }

    void main() {
      // --- parallax da textura seguindo o mouse ---
      float strength = 0.01;
      float depthR = texture2D(uDepth, vUv).r;
      vec2 pUv = vUv + depthR * uPointer * strength;
      vec3 tMap = texture2D(uTexture, pUv).rgb;

      // máscara do objeto (recorta o 808 do fundo)
      float lum = max(tMap.r, max(tMap.g, tMap.b));
      float objectMask = smoothstep(0.03, 0.20, lum);

      // --- grade de pontos vermelhos fluindo pela profundidade ---
      vec2 tUv = vec2(vUv.x * uAspect, vUv.y);
      vec2 tiling = vec2(120.0);
      vec2 tiledUv = mod(tUv * tiling, 2.0) - 1.0;
      float brightness = cellNoise(tUv * tiling / 2.0);
      float dist = length(tiledUv);
      float dots = smoothstep(0.5, 0.49, dist) * brightness;
      float flow = 1.0 - smoothstep(0.0, 0.02, abs(depthR - uProgress));
      vec3 mask = dots * flow * vec3(10.0, 0.0, 0.0) * objectMask;

      // --- blend screen (base + pontos vermelhos) ---
      vec3 blended = 1.0 - (1.0 - tMap) * (1.0 - mask);

      // --- luz dinâmica: highlight seguindo o cursor ---
      vec2 pointerUv = uPointer * 0.5 + 0.5;
      float distToPointer = length(vUv - pointerUv);
      float lightGlow = (1.0 - smoothstep(0.0, 0.5, distToPointer)) * objectMask;
      vec3 lit = blended + blended * lightGlow * uTilt;

      // --- scan horizontal vermelho ---
      float scanWidth = 0.05;
      float scanLine = smoothstep(0.0, scanWidth, abs(vUv.y - uScan));
      vec3 redOverlay = vec3(1.0, 0.0, 0.0) * (1.0 - scanLine) * 0.4;
      float scanMix = smoothstep(0.9, 1.0, 1.0 - scanLine) * objectMask;
      vec3 finalColor = mix(lit, lit + redOverlay, scanMix);

      gl_FragColor = vec4(finalColor, objectMask);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
  });

  const geometry = new THREE.PlaneGeometry(IMG_ASPECT, 1);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // ---- Responsividade / fit ------------------------------------
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitPlane();
  }

  function fitPlane() {
    const vFov = (camera.fov * Math.PI) / 180;
    const visibleH = 2 * Math.tan(vFov / 2) * camera.position.z;
    const visibleW = visibleH * camera.aspect;
    const frac = window.innerWidth < 768 ? MOBILE_WIDTH : DESKTOP_WIDTH;
    const targetW = visibleW * frac;
    const s = targetW / IMG_ASPECT;
    mesh.scale.set(s, s, 1);
  }

  window.addEventListener('resize', resize);
  resize();

  // ---- Ponteiro ------------------------------------------------
  const pointer = new THREE.Vector2(0, 0);
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  });

  // ---- Loop ----------------------------------------------------
  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) animate();
  });

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // scan animado (igual ao original)
    const wave = Math.sin(t * 0.5) * 0.5 + 0.5;
    uniforms.uProgress.value = wave;
    uniforms.uScan.value = wave;
    uniforms.uPointer.value.set(pointer.x, pointer.y);

    // tilt: objeto inclina seguindo o mouse
    mesh.rotation.x += (-pointer.y * TILT_STRENGTH - mesh.rotation.x) * 0.06;
    mesh.rotation.y += (pointer.x * TILT_STRENGTH - mesh.rotation.y) * 0.06;

    renderer.render(scene, camera);
  }
  animate();
}
