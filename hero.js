// Fond du hero : domain warping de bruit fractal, en un seul fragment shader plein écran.
// Bruit et fbm : Patricio Gonzalez Vivo (2015), http://patriciogonzalezvivo.com,
// d'après Morgan McGuire (https://www.shadertoy.com/view/4dS3Wd). Fonds, palette et interactions adaptés.
const flowCanvas = document.getElementById("flow");
if (flowCanvas) {
  try {
    initFlow(flowCanvas);
  } catch (err) {
    console.warn("Fond animé indisponible :", err);
  }
}

function initFlow(canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.innerWidth < 760;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return;

  const vertex = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  // plusieurs fonds au choix : ?fond=lignes | points | cellules | grille | pavage | brume
  const FONDS = {
    // courbes de niveau d'un bruit fractal, qui dérive lentement
    lignes: `
      vec2 st = vec2(uv.x * aspect, uv.y) * 1.5;
      st.y += u_scroll * 0.6;
      float n = fbm(st + vec2(0.0, u_time * 0.03) + m * 0.4);
      float v = n * 16.0;
      float d = min(fract(v), 1.0 - fract(v));
      float line = 1.0 - smoothstep(0.03, 0.09, d);
      float major = step(mod(floor(v + 0.5), 5.0), 0.5);       // une courbe maîtresse sur cinq
      float near = smoothstep(0.35, 0.0, distance(vec2(uv.x * aspect, uv.y), vec2(u_mouse.x * aspect, u_mouse.y)));
      vec3 c = mix(ink, accent, near);
      float a = line * mix(0.22, 0.55, major);
      gl_FragColor = vec4(mix(bg, c, a), 1.0);
    `,
    // trame de points dont la taille suit un bruit, façon demi-teinte
    points: `
      float N = ${isSmall ? "34.0" : "64.0"};
      vec2 p = vec2(uv.x * aspect, uv.y) * N;
      vec2 id = floor(p);
      vec2 f = fract(p) - 0.5;
      vec2 c0 = (id + 0.5) / N;
      float n = fbm(c0 * 2.2 + vec2(u_time * 0.04, u_scroll * 0.5));
      float near = smoothstep(0.3, 0.0, distance(c0, vec2(u_mouse.x * aspect, u_mouse.y)));
      float r = clamp((n - 0.25) * 1.25 + near * 0.35, 0.0, 0.5);
      float dot = 1.0 - smoothstep(r - 0.07, r, length(f));
      vec3 c = mix(ink, accent, near);
      gl_FragColor = vec4(mix(bg, c, dot * 0.55), 1.0);
    `,
    // diagramme de Voronoï : cellules aux germes mobiles, arêtes fines
    cellules: `
      vec2 p = vec2(uv.x * aspect, uv.y) * ${isSmall ? "4.0" : "6.0"};
      p.y += u_scroll * 1.5;
      vec2 mp = vec2(u_mouse.x * aspect, u_mouse.y) * ${isSmall ? "4.0" : "6.0"};
      vec2 ip = floor(p), fp = fract(p);
      float d1 = 8.0, d2 = 8.0; vec2 best = vec2(0.0);
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = vec2(random(ip + g), random(ip + g + 17.0));
          o = 0.5 + 0.42 * sin(u_time * 0.5 + 6.2831 * o);
          vec2 pos = ip + g + o;
          pos += normalize(pos - mp + 0.001) * 0.45 * exp(-distance(pos, mp) * 1.4);   // les germes fuient la souris
          float d = distance(p, pos);
          if (d < d1) { d2 = d1; d1 = d; best = ip + g; } else if (d < d2) { d2 = d; }
        }
      }
      float edge = 1.0 - smoothstep(0.0, 0.06, d2 - d1);
      float shade = random(best) * 0.07;
      vec3 base = bg - shade;
      gl_FragColor = vec4(mix(base, ink, edge * 0.45), 1.0);
    `,
    // grille fine qui se déforme autour de la souris, comme sous une lentille
    grille: `
      vec2 a = vec2(uv.x * aspect, uv.y);
      vec2 mp = vec2(u_mouse.x * aspect, u_mouse.y);
      vec2 dv = a - mp;
      float lens = exp(-dot(dv, dv) * 9.0);
      vec2 p = a - dv * lens * 0.55;
      p.y += sin(a.x * 2.4 + u_time * 0.35) * 0.035 + u_scroll * 0.4;
      p.x += cos(a.y * 2.0 + u_time * 0.3) * 0.03;
      p *= ${isSmall ? "9.0" : "16.0"};
      vec2 g = abs(fract(p) - 0.5);
      float line = 1.0 - smoothstep(0.0, 0.035, min(0.5 - g.x, 0.5 - g.y));
      float node = 1.0 - smoothstep(0.05, 0.11, length(0.5 - g));
      vec3 c = mix(ink, accent, lens);
      gl_FragColor = vec4(mix(bg, c, max(line * 0.28, node * 0.7)), 1.0);
    `,
    // pavage de Truchet : quarts de cercle qui se retournent près de la souris
    pavage: `
      vec2 p = vec2(uv.x * aspect, uv.y) * ${isSmall ? "6.0" : "10.0"};
      p.y += u_scroll * 3.0;
      vec2 mp = vec2(u_mouse.x * aspect, u_mouse.y) * ${isSmall ? "6.0" : "10.0"};
      vec2 id = floor(p), f = fract(p);
      float near = smoothstep(2.2, 0.0, distance(id + 0.5, mp + vec2(0.0, u_scroll * 3.0)));
      float flip = step(0.5, fract(random(id) + near * 0.5 + floor(u_time * 0.12 + random(id + 3.0))));
      if (flip > 0.5) f.x = 1.0 - f.x;
      float r1 = abs(length(f) - 0.5);
      float r2 = abs(length(f - 1.0) - 0.5);
      float line = 1.0 - smoothstep(0.012, 0.05, min(r1, r2));
      vec3 c = mix(ink, accent, near);
      gl_FragColor = vec4(mix(bg, c, line * 0.4), 1.0);
    `,
    // l'ancien fond : domain warping de bruit fractal (Patricio Gonzalez Vivo)
    brume: `
      vec2 st = vec2(uv.x * aspect, uv.y) * ${isSmall ? "2.2" : "2.8"};
      st.y += u_scroll * 0.9;
      vec2 q = vec2(fbm(st), fbm(st + vec2(1.0)));
      vec2 r = vec2(fbm(st + q + vec2(1.7, 9.2) + 0.15 * u_time + m), fbm(st + q + vec2(8.3, 2.8) + 0.126 * u_time - m));
      float f = fbm(st + r);
      vec3 mist = vec3(0.742, 0.780, 0.875), slate = vec3(0.470, 0.525, 0.720), sand = vec3(0.880, 0.835, 0.815);
      vec3 color = mix(mist, sand, clamp(f * f * 3.0, 0.0, 1.0));
      color = mix(color, slate, clamp(length(q) - 0.2, 0.0, 1.0) * 0.8);
      color = mix(color, vec3(0.18, 0.2, 0.4), clamp(r.x - 0.35, 0.0, 1.0) * 0.7);
      float k = clamp(f * f * f + 0.6 * f * f + 0.5 * f, 0.0, 1.0);
      gl_FragColor = vec4(mix(bg, color, k * 0.75), 1.0);
    `,
  };
  // les fonds à traits fins sont calculés en pleine résolution, les fonds flous à demi-résolution
  const SHARP = { lignes: 1, points: 1, cellules: 1, grille: 1, pavage: 1, brume: 0 };
  const fond = new URLSearchParams(location.search).get("fond");
  const kind = FONDS[fond] ? fond : "lignes";

  const fragment = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    #define NUM_OCTAVES ${isSmall ? 4 : 5}

    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_scroll;

    // bruit et fbm : Patricio Gonzalez Vivo (2015), d'après Morgan McGuire
    float random(in vec2 _st) {
      return fract(sin(dot(_st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise(in vec2 _st) {
      vec2 i = floor(_st);
      vec2 f = fract(_st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(in vec2 _st) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100.0);
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
      for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;
      vec2 m = (u_mouse - 0.5) * 1.6;
      vec3 bg     = vec3(0.925, 0.933, 0.965);   // lilas pâle du site
      vec3 ink    = vec3(0.051, 0.063, 0.188);   // encre du titre
      vec3 accent = vec3(0.208, 0.208, 1.000);   // bleu du site, en touche
      ${FONDS[kind]}
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  // un seul grand triangle qui couvre l'écran
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "u_resolution");
  const uMouse = gl.getUniformLocation(prog, "u_mouse");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uScroll = gl.getUniformLocation(prog, "u_scroll");

  // fonds flous : calcul à basse résolution, le navigateur adoucit l'agrandissement
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const scale = SHARP[kind] ? (isSmall ? Math.min(dpr, 1.25) : dpr) : isSmall ? 0.35 : 0.5;
  function resize() {
    const w = Math.max(2, Math.round(window.innerWidth * scale));
    const h = Math.max(2, Math.round(window.innerHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = 1 - e.clientY / window.innerHeight;
  });

  let lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener("resize", () => {
    // sur mobile, la barre d'adresse qui se masque change la hauteur : on ignore ces petits écarts
    if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 140) return;
    lastW = window.innerWidth; lastH = window.innerHeight;
    resize();
    if (reduceMotion) draw(0);
  });

  let spin = 0;
  function draw(t) {
    const y = window.scrollY;
    canvas.style.opacity = Math.max(0.4, 1 - y / (window.innerHeight * 1.1)).toFixed(3);
    spin += (y * 0.0016 - spin) * 0.08;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uScroll, spin);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  if (reduceMotion) { draw(6); return; }

  let visible = !document.hidden;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
  const start = performance.now();
  (function frame() {
    requestAnimationFrame(frame);
    if (visible) draw(6 + (performance.now() - start) / 1000);
  })();
}
