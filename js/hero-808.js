// ============================================================
//  HERO 808 — efeito objeto 3D interativo (Three.js / WebGL)
//  Site estático (vanilla). Sem build, sem npm.
//  Parallax + tilt + luz do cursor + varredura vermelha + BLOOM.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---- CONFIG (ajuste fino aqui) --------------------------------
const TEXTURE_SRC = 'assets/img/hero/808.webp';       // imagem visível
const DEPTH_SRC   = 'assets/img/hero/808-depth.webp'; // mapa de profundidade
const IMG_ASPECT  = 2752 / 1536;                      // proporção da imagem (1.7917)

const TILT_STRENGTH   = 0.22;  // inclinação seguindo o mouse (rad)
const LIGHT_STRENGTH  = 0.6;   // luz que acende o relevo perto do cursor
const DESKTOP_WIDTH   = 0.62;  // quanto da largura o 808 ocupa no desktop (0-1)
const MOBILE_WIDTH    = 0.9;   // idem no mobile

const DOT_DENSITY     = 260;   // densidade dos pontinhos vermelhos
const FLOW_WIDTH      = 0.20;  // largura da faixa que acende (região inteira vs coluna)
const DEPTH_LEVELS    = 0;     // 0 = varredura suave/fluida. >0 = pula entre faixas

// --- Ciclo: UMA animação de cada vez (fila) ---
// Fase 1 = varredura dos pontos por profundidade;  Fase 2 = feixe horizontal.
// Elas NUNCA tocam juntas: uma roda, pausa, a outra roda, pausa, repete.
const FLOW_DUR   = 3.0;   // segundos da varredura por profundidade
const SCAN_DUR   = 2.2;   // segundos do feixe horizontal
const PHASE_GAP  = 0.6;   // pausa (escuro) entre as fases
const EDGE_FADE  = 0.15;  // suaviza o início/fim de cada fase (0..0.5)

// --- Feixe horizontal vermelho (PONTILHADO, varre de cima a baixo) ---
const SCAN_LINE       = 0.9;   // intensidade do feixe. 0 = desligado
const SCAN_WIDTH      = 0.05;  // espessura do feixe (0.02 fino, 0.1 grosso)

// Brilho do vermelho: deixa o vermelho acima de 1 p/ "emergir" no bloom,
// sem virar branco. Maior = glow mais forte. Menor = mais discreto.
const RED_GLOW        = 3.0;

// --- Bloom: SÓ o vermelho brilha; o objeto branco/luz do mouse NÃO estoura ---
const BLOOM_STRENGTH  = 0.7;   // força do glow (vermelho)
const BLOOM_RADIUS    = 0.4;   // espalhamento do glow
const BLOOM_THRESHOLD = 1.0;   // objeto (<=1) não brilha; só o vermelho (>1)
// ---------------------------------------------------------------

// fade suave no começo/fim de uma fase (p em 0..1) -> 0..1
function edgeFade(p, e) {
  const a = Math.min(p / e, 1);
  const b = Math.min((1 - p) / e, 1);
  return Math.max(0, Math.min(a, b));
}

const container = document.getElementById('hero-808');
if (container) initHero808(container);

function initHero808(container) {
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

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 1); // fundo preto opaco (o bloom precisa disso)
  container.appendChild(renderer.domElement);

  // ---- Texturas ----
  const loader = new THREE.TextureLoader();
  const texMap = loader.load(TEXTURE_SRC);
  const depthMap = loader.load(DEPTH_SRC);
  texMap.colorSpace = THREE.SRGBColorSpace;
  if ('colorSpace' in depthMap) depthMap.colorSpace = THREE.NoColorSpace;

  // ---- Uniforms ----
  const uniforms = {
    uTexture:   { value: texMap },
    uDepth:     { value: depthMap },
    uPointer:   { value: new THREE.Vector2(0, 0) },
    uProgress:  { value: 0 },
    uScan:      { value: 0 },
    uAspect:    { value: IMG_ASPECT },
    uLight:     { value: LIGHT_STRENGTH },
    uTiling:    { value: DOT_DENSITY },
    uLevels:    { value: DEPTH_LEVELS },
    uFlowWidth: { value: FLOW_WIDTH },
    uScanLine:  { value: SCAN_LINE },
    uScanWidth: { value: SCAN_WIDTH },
    uRedGlow:   { value: RED_GLOW },
    uFlowActive:{ value: 0 },   // liga/desliga a fase dos pontos (profundidade)
    uScanActive:{ value: 0 },   // liga/desliga a fase do feixe horizontal
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
    uniform float uLight;
    uniform float uTiling;
    uniform float uLevels;
    uniform float uFlowWidth;
    uniform float uScanLine;
    uniform float uScanWidth;
    uniform float uRedGlow;
    uniform float uFlowActive;
    uniform float uScanActive;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float cellNoise(vec2 p){ return hash(floor(p)); }

    void main() {
      // parallax da textura seguindo o mouse
      float strength = 0.01;
      float depthR = texture2D(uDepth, vUv).r;
      vec2 pUv = vUv + depthR * uPointer * strength;
      vec3 tMap = texture2D(uTexture, pUv).rgb;

      // máscara do objeto
      float lum = max(tMap.r, max(tMap.g, tMap.b));
      float objectMask = smoothstep(0.03, 0.20, lum);

      // grade de pontos vermelhos fluindo pela profundidade
      vec2 tUv = vec2(vUv.x * uAspect, vUv.y);
      vec2 tiling = vec2(uTiling);
      vec2 tiledUv = mod(tUv * tiling, 2.0) - 1.0;
      float brightness = cellNoise(tUv * tiling / 2.0);
      float dist = length(tiledUv);
      float dots = smoothstep(0.5, 0.49, dist) * brightness;

      float dFlow = depthR;
      if (uLevels > 0.5) { dFlow = floor(depthR * uLevels + 0.5) / uLevels; }
      float flow = 1.0 - smoothstep(0.0, uFlowWidth, abs(dFlow - uProgress));

      // --- objeto branco + luz do cursor — LDR (clampado): NÃO dispara o bloom ---
      vec2 pointerUv = uPointer * 0.5 + 0.5;
      float distToPointer = length(vUv - pointerUv);
      float lightGlow = (1.0 - smoothstep(0.0, 0.5, distToPointer)) * objectMask;
      vec3 objectLit = clamp(tMap + tMap * lightGlow * uLight, 0.0, 1.0);

      // --- vermelho PIXELADO (só ele é HDR -> só ele brilha no bloom) ---
      // aparece mais nas partes escuras/relevo e no fundo, some no branco puro
      float darkFactor = 1.0 - smoothstep(0.25, 0.85, lum);

      // pontos vermelhos varrendo a profundidade (só na FASE 1)
      float redDots = dots * flow * darkFactor * uFlowActive;
      // feixe horizontal pontilhado (dots dentro da faixa) — só na FASE 2
      float scanBand = smoothstep(uScanWidth, 0.0, abs(vUv.y - uScan));
      float redScan = dots * scanBand * uScanLine * uScanActive;

      float redAmt = clamp(redDots + redScan, 0.0, 1.0);
      vec3 redHDR = vec3(1.0, 0.0, 0.0) * redAmt * uRedGlow;  // > 1 -> emerge/brilha vermelho

      vec3 finalColor = objectLit + redHDR;
      float alpha = clamp(max(objectMask, redAmt), 0.0, 1.0);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: true,
  });

  const geometry = new THREE.PlaneGeometry(IMG_ASPECT, 1);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // ---- Post-processing: BLOOM ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // ---- Responsividade ----
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitPlane();
  }
  function fitPlane() {
    const vFov = (camera.fov * Math.PI) / 180;
    const visibleH = 2 * Math.tan(vFov / 2) * camera.position.z;
    const visibleW = visibleH * camera.aspect;
    const frac = window.innerWidth < 768 ? MOBILE_WIDTH : DESKTOP_WIDTH;
    const s = (visibleW * frac) / IMG_ASPECT;
    mesh.scale.set(s, s, 1);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- Ponteiro ----
  const pointer = new THREE.Vector2(0, 0);
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  });

  // ---- Loop ----
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

    // --- CICLO: uma fase de cada vez ---
    //   [ Fase 1: pontos por profundidade ] pausa [ Fase 2: feixe horizontal ] pausa
    const t2Start = FLOW_DUR + PHASE_GAP;
    const t2End   = t2Start + SCAN_DUR;
    const cycle   = t2End + PHASE_GAP;
    const ct = t % cycle;

    let flowActive = 0.0, scanActive = 0.0;
    if (ct < FLOW_DUR) {
      // Fase 1 — varredura dos pontos por profundidade (0 -> 1)
      const p = ct / FLOW_DUR;
      uniforms.uProgress.value = p;
      flowActive = edgeFade(p, EDGE_FADE);
    } else if (ct >= t2Start && ct < t2End) {
      // Fase 2 — feixe horizontal, de cima p/ baixo (1 -> 0)
      const p = (ct - t2Start) / SCAN_DUR;
      uniforms.uScan.value = 1.0 - p;
      scanActive = edgeFade(p, EDGE_FADE);
    }
    // fora dessas faixas = pausa (tudo apagado)

    uniforms.uFlowActive.value = flowActive;
    uniforms.uScanActive.value = scanActive;
    uniforms.uPointer.value.set(pointer.x, pointer.y);

    mesh.rotation.x += (-pointer.y * TILT_STRENGTH - mesh.rotation.x) * 0.06;
    mesh.rotation.y += (pointer.x * TILT_STRENGTH - mesh.rotation.y) * 0.06;

    composer.render();
  }
  animate();
}
