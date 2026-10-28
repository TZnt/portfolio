// Fond du hero : domain warping de bruit fractal, en un seul fragment shader plein écran.
// Shader d'origine : Patricio Gonzalez Vivo (2015), http://patriciogonzalezvivo.com,
// d'après Morgan McGuire (https://www.shadertoy.com/view/4dS3Wd). Palette et interactions adaptées.
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
      // le motif garde ses proportions quel que soit l'écran
      vec2 st = vec2(uv.x * u_resolution.x / u_resolution.y, uv.y) * ${isSmall ? "2.2" : "2.8"};
      st.y += u_scroll * 0.9;                       // le scroll fait glisser le flux
      vec2 m = (u_mouse - 0.5) * 1.6;               // la souris infléchit la déformation

      vec2 q = vec2(0.0);
      q.x = fbm(st);
      q.y = fbm(st + vec2(1.0));

      vec2 r = vec2(0.0);
      r.x = fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * u_time + m);
      r.y = fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * u_time - m);

      float f = fbm(st + r);

      vec3 bg   = vec3(0.925, 0.933, 0.965);       // lilas pâle du site
      vec3 mist = vec3(0.742, 0.780, 0.875);       // brume bleutée
      vec3 slate = vec3(0.470, 0.525, 0.720);      // ardoise
      vec3 ink  = vec3(0.180, 0.200, 0.400);       // encre du titre, très atténuée
      vec3 sand = vec3(0.880, 0.835, 0.815);       // seul reflet chaud

      vec3 color = mix(mist, sand, clamp(f * f * 3.0, 0.0, 1.0));
      color = mix(color, slate, clamp(length(q) - 0.2, 0.0, 1.0) * 0.8);
      color = mix(color, ink, clamp(r.x - 0.35, 0.0, 1.0) * 0.7);

      float k = clamp(f * f * f + 0.6 * f * f + 0.5 * f, 0.0, 1.0);
            gl_FragColor = vec4(mix(bg, color, k * 0.75), 1.0);
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

  // le shader est doux : on le calcule à basse résolution, le navigateur adoucit l'agrandissement
  const scale = isSmall ? 0.35 : 0.5;
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
