const agendaCanvas = document.getElementById("agenda");
if (agendaCanvas && agendaCanvas.getContext) {
  initAgenda(agendaCanvas);
}

function initAgenda(canvas) {
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ROW_H = 34;
  const UNIT = 24;
  const DRIFT = 5; // px / s : le temps s'écoule vers la gauche
  const FILL_TARGET = 0.3;
  const ENTER = 0.9, EXIT = 0.9;

  // rgb, hachuré ou non — même palette que le site + un violet pour les congés
  const KINDS = [
    { rgb: [0, 171, 122], weight: 3 },
    { rgb: [157, 157, 164], weight: 3 },
    { rgb: [90, 90, 98], weight: 3 },
    { rgb: [236, 235, 232], weight: 1, hatch: true },
  ];
  const kindPool = KINDS.flatMap((k) => Array(k.weight).fill(k));

  let W = 0, H = 0, rows = 0, dpr = 1;
  let offset = 0; // décalage du monde en px
  let blocks = [];
  let spawnTimer = 0;
  let visible = true;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const smooth = (t) => t * t * (3 - 2 * t);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || 1;
    H = canvas.clientHeight || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rows = Math.ceil(H / ROW_H);
    blocks = blocks.filter((b) => b.row < rows);
  }

  function rowFree(row, x, w) {
    const gap = UNIT;
    return !blocks.some((b) => b.row === row && x < b.x + b.w + gap && b.x < x + w + gap);
  }

  function coverage() {
    const area = blocks.reduce((s, b) => s + b.w * ROW_H, 0);
    return area / ((W + UNIT * 12) * rows * ROW_H);
  }

  function spawn(age) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const row = Math.floor(Math.random() * rows);
      const w = Math.floor(rand(3, 10)) * UNIT;
      const x = offset + Math.floor(rand(-2, W / UNIT + 4)) * UNIT;
      if (!rowFree(row, x, w)) continue;
      const hold = rand(4, 9);
      blocks.push({
        row, x, w,
        kind: pick(kindPool),
        age: age ?? 0,
        life: ENTER + hold + EXIT,
        lines: Math.random() < 0.7,
      });
      return;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const b of blocks) {
      let grow = 1, alpha = 1;
      if (b.age < ENTER) {
        grow = smooth(b.age / ENTER);
        alpha = grow;
      } else if (b.age > b.life - EXIT) {
        const t = smooth((b.age - (b.life - EXIT)) / EXIT);
        grow = 1 - t * 0.35;
        alpha = 1 - t;
      }
      const w = b.w * grow;
      const x = b.x - offset;
      const y = b.row * ROW_H + 2;
      const h = ROW_H - 4;
      if (x + b.w < 0 || x > W) continue;

      // très discret derrière la colonne de texte : les blocs vivent de part et d'autre
      const calm = Math.min(360, W * 0.3); // demi-largeur de la colonne de texte
      const d = Math.abs(x + w / 2 - W / 2);
      const edge = 0.1 + 0.9 * smooth(Math.min(1, Math.max(0, (d - calm) / 220)));
      const a = alpha * edge;
      const [r, g, bl] = b.kind.rgb;

      ctx.fillStyle = `rgba(${r},${g},${bl},${0.2 * a})`;
      ctx.fillRect(x, y, w, h);

      if (b.kind.hatch) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.strokeStyle = `rgba(${r},${g},${bl},${0.22 * a})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let hx = x - h; hx < x + w; hx += 9) {
          ctx.moveTo(hx, y + h);
          ctx.lineTo(hx + h, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = `rgba(${r},${g},${bl},${0.75 * a})`;
      ctx.fillRect(x, y, 3, h);

      if (b.lines && w > UNIT * 4 && edge > 0.5) {
        ctx.fillStyle = `rgba(236,235,232,${0.32 * a})`;
        ctx.fillRect(x + 10, y + 8, w * 0.5, 3);
        ctx.fillStyle = `rgba(236,235,232,${0.18 * a})`;
        ctx.fillRect(x + 10, y + 16, w * 0.3, 3);
      }
    }
  }

  function seed() {
    let guard = 0;
    while (coverage() < FILL_TARGET && guard++ < 200) {
      spawn(rand(ENTER, ENTER + 5));
    }
  }

  const ro = new ResizeObserver(() => { resize(); if (reduceMotion) { seed(); draw(); } });
  ro.observe(canvas);
  resize();
  seed();

  if (reduceMotion) {
    draw();
    return;
  }

  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!visible || document.hidden) return;

    offset += DRIFT * dt;
    for (const b of blocks) b.age += dt;
    blocks = blocks.filter((b) => b.age < b.life && b.x + b.w > offset - UNIT);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      if (coverage() < FILL_TARGET) spawn(0);
      spawnTimer = rand(0.15, 0.45);
    }
    draw();
  }
  requestAnimationFrame(frame);
}
