const canvas = document.getElementById("scene");
if (canvas && window.THREE) {
  try {
    initScene(canvas);
  } catch (err) {
    console.warn("Scène 3D indisponible :", err);
  }
}

function initScene(canvas) {
  const BG = 0x0c2340;
  const LOW = new THREE.Color(0x123056);
  const MID = new THREE.Color(0x4d76a3);
  const HIGH = new THREE.Color(0xeaf2fa);
  const PEAK = new THREE.Color(0xff5a2e);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = canvas.clientWidth < 720;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(BG, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 16, 40);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

  // ---------- terrain: procedural point-cloud (LiDAR / photogrammetry look) ----------
  function hash(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }
  function noise2D(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) {
    let total = 0, amp = 0.5, freq = 1, max = 0;
    for (let i = 0; i < 4; i++) {
      total += noise2D(x * freq, y * freq) * amp;
      max += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return total / max;
  }

  const cols = isSmall ? 80 : 140;
  const rows = isSmall ? 52 : 92;
  const width = 46, depth = 30, amp = 6;

  const count = cols * rows;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tmpColor = new THREE.Color();
  let i = 0;
  for (let yi = 0; yi < rows; yi++) {
    for (let xi = 0; xi < cols; xi++) {
      const u = xi / (cols - 1), v = yi / (rows - 1);
      const x = (u - 0.5) * width;
      const z = (v - 0.5) * depth;
      const t = fbm(u * 3.4, v * 3.4);

      const cu = (u - 0.5) * 2, cv = (v - 0.5) * 2;
      const dist = Math.min(1, Math.sqrt(cu * cu + cv * cv));
      const fall = Math.pow(1 - dist, 1.6);

      const y = t * fall * amp;

      if (t < 0.5) tmpColor.copy(LOW).lerp(MID, t / 0.5);
      else tmpColor.copy(MID).lerp(HIGH, (t - 0.5) / 0.5);
      if (t > 0.7) tmpColor.lerp(PEAK, ((t - 0.7) / 0.3) * 0.5);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
      i++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: isSmall ? 0.1 : 0.085,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // ---------- flight path: the drone's survey grid, flown live above the terrain ----------
  const hoverY = amp * 1.35;
  const xL = -width * 0.33, xR = width * 0.33;
  const zTop = -depth * 0.32, zBot = depth * 0.32;
  const legs = 5;
  const dz = (zBot - zTop) / (legs - 1);
  const wp = [];
  for (let r = 0; r < legs; r++) {
    const z = zTop + r * dz;
    if (r % 2 === 0) wp.push([xL, z], [xR, z]);
    else wp.push([xR, z], [xL, z]);
  }

  const curvePath = new THREE.CurvePath();
  const linePts = [];
  for (let k = 0; k < wp.length - 1; k++) {
    const a = new THREE.Vector3(wp[k][0], hoverY, wp[k][1]);
    const b = new THREE.Vector3(wp[k + 1][0], hoverY, wp[k + 1][1]);
    curvePath.add(new THREE.LineCurve3(a, b));
    linePts.push(a);
  }
  linePts.push(new THREE.Vector3(wp[wp.length - 1][0], hoverY, wp[wp.length - 1][1]));

  const pathGeometry = new THREE.BufferGeometry().setFromPoints(linePts);
  const pathMaterial = new THREE.LineBasicMaterial({ color: 0x4d76a3, transparent: true, opacity: 0.45 });
  scene.add(new THREE.Line(pathGeometry, pathMaterial));

  const markerGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0x8fb0cc, transparent: true, opacity: 0.5 });
  wp.forEach(([x, z]) => {
    const m = new THREE.Mesh(markerGeo, markerMat);
    m.position.set(x, hoverY, z);
    scene.add(m);
  });

  const drone = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff5a2e })
  );
  const droneGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff5a2e, transparent: true, opacity: 0.25 })
  );
  scene.add(drone, droneGlow);

  // ---------- camera + render loop ----------
  const target = new THREE.Vector3(0, 1, 0);
  let angle = Math.PI * 0.15;
  const radius = 17;

  function frameCamera() {
    camera.position.set(Math.sin(angle) * radius, 8, Math.cos(angle) * radius);
    camera.lookAt(target);
  }
  frameCamera();

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", resize);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);

  if (reduceMotion) {
    renderer.render(scene, camera);
    return;
  }

  const clock = new THREE.Clock();
  const flightDuration = 20;

  function animate() {
    requestAnimationFrame(animate);
    if (!visible || document.hidden) return;

    const dt = clock.getDelta();
    angle += dt * 0.045;
    frameCamera();

    const t = (clock.elapsedTime % flightDuration) / flightDuration;
    const p = curvePath.getPointAt(t);
    drone.position.copy(p);
    droneGlow.position.copy(p);

    renderer.render(scene, camera);
  }
  animate();
}
