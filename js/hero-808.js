// ============================================================
//  HERO 808 — PORT 1:1 da referência (React/R3F -> JS vanilla)
//
//  Mesmo grafo TSL, mesmos nós, mesmos valores. Só troquei React por
//  JS puro. NADA foi inventado: sem tilt, sem máscara de objeto, sem
//  preenchimento radial, sem feixe/linha vermelha extra.
//
//  A ÚNICA coisa animada é uProgress -> os LEDs fluem pela PROFUNDIDADE.
// ============================================================
import * as THREE from 'three/webgpu';
import {
  abs,
  screen as blendScreen,   // r170 renomeou blendScreen -> screen
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  pass,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

// const TEXTUREMAP = { src: 'https://i.postimg.cc/XYwvXN8D/img-4.png' };
// const DEPTHMAP   = { src: 'https://i.postimg.cc/2SHKQh2q/raw-4.webp' };
const TEXTUREMAP = 'assets/img/hero/808.webp';
const DEPTHMAP   = 'assets/img/hero/808-depth.webp';

// const WIDTH = 300; const HEIGHT = 300;
// 2752x1536 = proporcao 1.792. Só a RAZAO importa: em applyAspect() o WIDTH se cancela,
// entao SCALE_FACTOR continua significando a mesma coisa. Alem do formato do plano,
// esse par tambem alimenta o `aspect` do grafo TSL, que mantem a celula de LED quadrada.
const WIDTH  = 2752;
const HEIGHT = 1536;

// const scaleFactor = 0.40;
// 1.25 e não 1.0: o useAspect do drei é "cover", então 1.0 já preencheria a hero — mas a
// gangorra gira o plano e a borda de trás entraria ~79px para dentro, abrindo um vazio na
// lateral. O 1.25 é a sobra que cobre o giro. O 808 não cresce junto porque ele foi
// reduzido dentro da própria imagem (o arquivo continua 2752x1536).
const SCALE_FACTOR = 1.25;

// ---- ADIÇÃO (não faz parte do port da referência) ----
// Gangorra em PROFUNDIDADE ao passar o mouse sobre o 808: rotação no eixo Y, ou seja,
// um lado vem para frente enquanto o outro vai para trás. Nada de subir/descer.
const ROCK_ANGLE = 0.14;   // ~8° — máximo que a sobra do SCALE_FACTOR 1.25 aguenta sem expor a borda
const ROCK_SPEED = 1.8;    // ciclos por segundo (rad/s do seno)
const ROCK_EASE  = 0.06;   // suavidade da entrada/saída do hover

// <PostProcessing strength={1} threshold={1} /> + bloom(color, strength, 0.5, threshold)
const BLOOM_STRENGTH  = 1;
const BLOOM_RADIUS    = 0.5;
const BLOOM_THRESHOLD = 1;

// Só performance (não muda o visual): limita resolução e pausa fora da tela
const MAX_PIXEL_RATIO = 1.5;

const container = document.getElementById('hero-808');
if (container) {
  initHeroText(container);
  initHero808(container).catch((err) => {
    console.error('[hero-808]', err);
    container.classList.add('no-webgl');
  });
}

// ================= Html(): revelação do título/subtítulo =================
// const [visibleWords, setVisibleWords] = useState(0);
//   -> +1 palavra a cada 600ms; depois da última, subtítulo em +800ms
// animationDelay = index * 0.13 + Math.random() * 0.07   (glitch aleatório)
// subtitleDelay  = titleWords.length * 0.13 + 0.2 + Math.random() * 0.1
function initHeroText(container) {
  const words = Array.from(container.querySelectorAll('[data-hero-word]'));
  const subtitle = container.querySelector('[data-hero-subtitle]');
  if (!words.length) return;

  words.forEach((el, index) => {
    el.style.opacity = '0';   // opacity: index < visibleWords ? undefined : 0
    el.style.animationDelay = `${index * 0.13 + Math.random() * 0.07}s`;
  });
  if (subtitle) {
    subtitle.style.opacity = '0';
    subtitle.style.animationDelay = `${words.length * 0.13 + 0.2 + Math.random() * 0.1}s`;
  }

  let visibleWords = 0;
  const step = () => {
    if (visibleWords < words.length) {
      const el = words[visibleWords];
      el.style.removeProperty('opacity');
      el.classList.add('fade-in');
      visibleWords += 1;
      setTimeout(step, 600);                    // setTimeout(..., 600)
    } else if (subtitle) {
      setTimeout(() => {                        // setTimeout(..., 800)
        subtitle.style.removeProperty('opacity');
        subtitle.classList.add('fade-in-subtitle');
      }, 800);
    }
  };
  setTimeout(step, 600);
}

async function initHero808(container) {
  // ---- <Canvas flat> ----
  const scene = new THREE.Scene();
  // câmera padrão do R3F: fov 75, near 0.1, far 1000, position [0,0,5]
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGPURenderer({ antialias: true });
  await renderer.init();                       // gl={async (props) => { ... await renderer.init() }}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.toneMapping = THREE.NoToneMapping;  // <Canvas flat>
  container.appendChild(renderer.domElement);

  // ---- useTexture([TEXTUREMAP.src, DEPTHMAP.src]) ----
  const loader = new THREE.TextureLoader();
  const [rawMap, depthMap] = await Promise.all([
    loader.loadAsync(TEXTUREMAP),
    loader.loadAsync(DEPTHMAP),
  ]);
  rawMap.colorSpace = THREE.SRGBColorSpace;

  // ================= Scene: material (grafo TSL idêntico) =================
  const uPointer = uniform(new THREE.Vector2(0));
  const uProgress = uniform(0);

  const strength = 0.01;

  const tDepthMap = texture(depthMap);

  const tMap = texture(
    rawMap,
    uv().add(tDepthMap.r.mul(uPointer).mul(strength))
  );

  const aspect = float(WIDTH).div(HEIGHT);
  const tUv = vec2(uv().x.mul(aspect), uv().y);

  // 120 na referência. A grade é definida em UV, então o plano maior (SCALE_FACTOR 1.25)
  // deixaria a célula 1.9x mais gorda na tela. 231 devolve o mesmo tamanho de ponto.
  const tiling = vec2(231.0);
  const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

  const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));

  const dist = float(tiledUv.length());
  const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness);

  const depth = tDepthMap;

  const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));

  const mask = dot.mul(flow).mul(vec3(10, 0, 0));

  const final = blendScreen(tMap, mask);

  const material = new THREE.MeshBasicNodeMaterial({
    colorNode: final,
    transparent: true,
    opacity: 0,
  });

  // <mesh scale={[w*scaleFactor, h*scaleFactor, 1]}><planeGeometry /></mesh>
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  scene.add(mesh);

  // ================= PostProcessing (idêntico) =================
  const postProcessing = new THREE.PostProcessing(renderer);
  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode('output');
  const bloomPass = bloom(scenePassColor, BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);

  // REMOVIDO: o overlay de "scan line" da referência (e o uniform uScanProgress que o servia).
  // Ele fazia float(uScanProgress.value), que lê o .value (=0) ao MONTAR o grafo e vira
  // uma CONSTANTE — o uniform era atualizado por frame mas o shader nunca o enxergava.
  // Resultado: uma faixa vermelha PARADA em uv.y=0. Como o quad do PostProcessing tem
  // flipY:false, uv.y=0 é o TOPO da tela — era a linha vermelha em cima da top bar.
  // Fora dessa faixa o nó era identidade (o mix devolvia scenePassColor puro), então
  // tirar não muda mais nada na imagem.
  postProcessing.outputNode = scenePassColor.add(bloomPass);

  // ================= useAspect(WIDTH, HEIGHT) + resize =================
  // drei: s = (viewport.aspect > WIDTH/HEIGHT) ? viewport.width/WIDTH : viewport.height/HEIGHT
  function applyAspect() {
    const vFov = (camera.fov * Math.PI) / 180;
    const viewportH = 2 * Math.tan(vFov / 2) * camera.position.z;
    const viewportW = viewportH * camera.aspect;
    const s = (viewportW / viewportH > WIDTH / HEIGHT)
      ? (viewportW / WIDTH)
      : (viewportH / HEIGHT);
    mesh.scale.set(WIDTH * s * SCALE_FACTOR, HEIGHT * s * SCALE_FACTOR, 1);
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyAspect();
  }
  window.addEventListener('resize', resize);
  resize();

  // ================= useFrame(({ pointer })) =================
  // pointer do R3F: coordenadas normalizadas -1..1 (y para cima)
  const pointer = new THREE.Vector2(0, 0);
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  });

  // ================= ADIÇÃO: hover sobre o 808 =================
  // Em vez de raycast contra o mesh (que gira, e aí o hover piscaria nas bordas),
  // cruzo o raio com o plano z=0 fixo e comparo com a meia-extensão da escala.
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  let hovered = false;

  container.addEventListener('pointermove', (e) => {
    const r = container.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    raycaster.setFromCamera(ndc, camera);
    hovered = raycaster.ray.intersectPlane(planeZ0, hit) !== null
      && Math.abs(hit.x) <= mesh.scale.x / 2
      && Math.abs(hit.y) <= mesh.scale.y / 2;
  });
  container.addEventListener('pointerleave', () => { hovered = false; });

  // ================= useFrame (loop) =================
  const clock = new THREE.Clock();
  let inView = true;
  let rockMix = 0;          // ADIÇÃO: 0 = parado, 1 = balançando

  function loop() {
    const t = clock.getElapsedTime();

    // ADIÇÃO: entra/sai do balanço suavemente e nunca corta no meio do movimento
    rockMix = THREE.MathUtils.lerp(rockMix, hovered ? 1 : 0, ROCK_EASE);
    mesh.rotation.y = Math.sin(t * ROCK_SPEED) * ROCK_ANGLE * rockMix;

    // uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    uProgress.value = Math.sin(t * 0.5) * 0.5 + 0.5;
    // uniforms.uPointer.value = pointer;
    uPointer.value.copy(pointer);

    // mat.opacity = THREE.MathUtils.lerp(mat.opacity, visible ? 1 : 0, 0.07)
    material.opacity = THREE.MathUtils.lerp(material.opacity, 1, 0.07);

    postProcessing.renderAsync();
  }

  function start() { renderer.setAnimationLoop(loop); }
  function stop()  { renderer.setAnimationLoop(null); }

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : (inView && start());
  });
  const io = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    inView && !document.hidden ? start() : stop();
  }, { threshold: 0 });
  io.observe(container);

  start();
}
