const terrainCanvas = document.getElementById("terrain");
if (terrainCanvas && window.THREE) {
  try {
    initTerrain(terrainCanvas);
  } catch (err) {
    console.warn("Scène 3D indisponible :", err);
  }
}

function initTerrain(canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.innerWidth < 760;
  const readout = document.getElementById("probe-out");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  // ---------- relief procédural ----------
  const hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  };
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y) => {
    let total = 0, amp = 0.5, freq = 1, max = 0;
    for (let i = 0; i < 5; i++) {
      total += noise(x * freq, y * freq) * amp;
      max += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return total / max;
  };

  const width = 64, depth = 44, amp = 13;
  const heightAt = (x, z) => {
    const u = x / width + 0.5, v = z / depth + 0.5;
    const cu = (u - 0.5) * 2, cv = (v - 0.5) * 2;
    const dist = Math.min(1, Math.hypot(cu, cv));
    const m = Math.min(1, Math.max(0, (fbm(u * 3.2 + 4, v * 3.2 + 9) - 0.3) * 2.4));
    return Math.pow(m, 1.15) * Math.pow(1 - dist * 0.85, 0.9) * amp;
  };

  const cols = isSmall ? 110 : 220;
  const rows = isSmall ? 74 : 150;
  const count = cols * rows;
  const positions = new Float32Array(count * 3);
  const heights = new Float32Array(count);
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c / (cols - 1) - 0.5) * width + (hash(c, r) - 0.5) * 0.18;
      const z = (r / (rows - 1) - 0.5) * depth + (hash(r, c) - 0.5) * 0.18;
      const y = heightAt(x, z);
      positions.set([x, y, z], n * 3);
      heights[n] = Math.min(1, y / (amp * 0.8));
      n++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("h", new THREE.BufferAttribute(heights, 1));

  const uniforms = {
    uRise: { value: reduceMotion ? 1 : 0 },
    uProbe: { value: new THREE.Vector3(999, 0, 999) },
    uTime: { value: 0 },
    uShake: { value: 0 },
    uSize: { value: (isSmall ? 70 : 90) * renderer.getPixelRatio() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float h;
      attribute float k;
      uniform float uRise, uSize, uTime, uShake;
      uniform vec3 uProbe;
      varying vec3 vColor;
      varying float vContour;

      vec3 ramp(float t) {
        vec3 blue = vec3(0.208, 0.208, 1.0);
        vec3 mint = vec3(0.098, 0.765, 0.604);
        vec3 sun  = vec3(1.0, 0.784, 0.239);
        vec3 coral = vec3(1.0, 0.353, 0.235);
        if (t < 0.34) return mix(blue, mint, t / 0.34);
        if (t < 0.67) return mix(mint, sun, (t - 0.34) / 0.33);
        return mix(sun, coral, min(1.0, (t - 0.67) / 0.33));
      }

      void main() {
        // le relief se dresse une fois au chargement, les sommets en dernier
        float rise = smoothstep(0.0, 1.0, clamp(uRise * 1.6 - h * 0.6, 0.0, 1.0));
        vec3 p = position;
        p.y *= rise;

        // tremblement de terre : secousses déphasées selon la position, proportionnelles à la vitesse de scroll
        float q = sin(position.x * 2.3 + uTime * 47.0) * cos(position.z * 1.9 + uTime * 41.0);
        p.y += q * uShake * 0.9;
        p.x += sin(position.z * 3.1 + uTime * 53.0) * uShake * 0.35;
        p.z += cos(position.x * 2.7 + uTime * 59.0) * uShake * 0.35;

        float d = distance(p.xz, uProbe.xz);
        float near = smoothstep(5.0, 0.0, d);
        p.y += near * 0.9;

        // courbes de niveau : les points proches d'un palier de hauteur sont assombris
        float band = fract(position.y * 0.9);
        vContour = smoothstep(0.0, 0.1, band) * (1.0 - smoothstep(0.9, 1.0, band));

        vec3 col = ramp(clamp(h, 0.0, 1.0));
        col = mix(vec3(0.05, 0.06, 0.19), col, 0.35 + 0.65 * vContour);
        col = mix(col, vec3(0.05, 0.06, 0.19), step(1.5, k) * 0.9); // bâtiments
        col = mix(col, vec3(0.05, 0.06, 0.19), near * 0.85);
        vColor = col;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize / -mv.z * (1.0 + near * 1.6) * (0.55 + rise * 0.45);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.35, length(c));
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // ---------- vrai relevé LiDAR (swisstopo swissSURFACE3D, Lavaux, canton de Vaud) ----------
  let altitudeAt = (x, z) => 412 + heightAt(x, z) * 6.5;

  fetch("assets/lavaux.bin")
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then((buf) => {
      const head = new DataView(buf, 0, 28);
      const n = head.getUint32(0, true);
      const sizeX = head.getFloat32(4, true), sizeY = head.getFloat32(8, true);
      const zMin = head.getFloat32(12, true), zMax = head.getFloat32(16, true);
      const rec = new DataView(buf, 28);

      const S = 0.058;                          // unités de scène par mètre
      const VEX = 1.15;                         // légère exagération verticale
      const px = new Float32Array(n * 3), ph = new Float32Array(n), pk = new Float32Array(n);
      const grid = new Float32Array(400 * 400).fill(-1);
      for (let i = 0; i < n; i++) {
        const o = i * 8;
        const fx = rec.getUint16(o, true) / 65535, fy = rec.getUint16(o + 2, true) / 65535;
        const fz = rec.getUint16(o + 4, true) / 65535;
        const x = (fx - 0.5) * sizeX * S;
        const z = (0.5 - fy) * sizeY * S;       // le nord part vers le fond de la scène
        const y = fz * (zMax - zMin) * S * VEX;
        px[i * 3] = x; px[i * 3 + 1] = y; px[i * 3 + 2] = z;
        ph[i] = Math.min(1, fz * 1.05);
        pk[i] = rec.getUint8(o + 6);
        const gx = Math.min(399, Math.floor(fx * 400)), gz = Math.min(399, Math.floor((1 - fy) * 400));
        grid[gz * 400 + gx] = Math.max(grid[gz * 400 + gx], fz);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(px, 3));
      g.setAttribute("h", new THREE.BufferAttribute(ph, 1));
      g.setAttribute("k", new THREE.BufferAttribute(pk, 1));
      points.geometry.dispose();
      points.geometry = g;
      uniforms.uSize.value *= isSmall ? 0.9 : 0.85;

      altitudeAt = (x, z) => {
        const gx = Math.floor((x / (sizeX * S) + 0.5) * 400), gz = Math.floor((z / (sizeY * S) + 0.5) * 400);
        if (gx < 0 || gz < 0 || gx > 399 || gz > 399 || grid[gz * 400 + gx] < 0) return null;
        return zMin + grid[gz * 400 + gx] * (zMax - zMin);
      };
      target.set(0, 8, -8);
      uniforms.uRise.value = 0;                 // la montée se rejoue sur le vrai relief
      clock.start();
      if (reduceMotion) { uniforms.uRise.value = 1; render(); }
    })
    .catch(() => { /* relief procédural conservé */ });

  // ---------- caméra et sonde ----------
  const target = new THREE.Vector3(0, 3, 0);
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -8);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  let hasPointer = false;

  window.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    mouse.tx = ndc.x;
    mouse.ty = ndc.y;
    hasPointer = true;
  });
  document.addEventListener("pointerleave", () => {
    hasPointer = false;
    uniforms.uProbe.value.set(999, 0, 999);
    if (readout) readout.textContent = "—";
  });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, isSmall ? 15 : 11, isSmall ? 62 : 54);
    camera.zoom = isSmall ? 0.95 : 1;
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    if (reduceMotion) render();
  }

  function updateProbe() {
    if (!hasPointer) return;
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    uniforms.uProbe.value.copy(hit);
    if (readout) {
      const alt = altitudeAt(hit.x, hit.z);
      readout.textContent = alt == null ? "—" : Math.round(alt) + " m";
    }
  }

  const clock = new THREE.Clock();
  let visible = true;
  let lastY = window.scrollY, shake = 0;
  function render() {
    renderer.render(scene, camera);
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();
    uniforms.uRise.value = Math.min(1, t / 2.2);

    // vitesse de scroll -> secousse (amortie) ; le terrain s'estompe hors du hero pour garder le texte lisible
    const y = window.scrollY;
    shake = Math.min(1.6, shake * 0.9 + Math.abs(y - lastY) * 0.012);
    lastY = y;
    uniforms.uTime.value = t;
    uniforms.uShake.value = shake;
    canvas.style.opacity = Math.max(0.32, 1 - y / (window.innerHeight * 0.9)).toFixed(3);
    camera.position.z = (isSmall ? 62 : 54) - Math.min(y, 4000) * 0.004;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.x = mouse.x * 5 + Math.sin(t * 0.15) * 2;
    camera.position.y = (isSmall ? 15 : 11) + mouse.y * 2;
    camera.lookAt(target);
    updateProbe();
    render();
  }

  window.addEventListener("resize", resize);
    resize();
  if (!reduceMotion) frame();
}
