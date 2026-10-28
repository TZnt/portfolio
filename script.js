document.getElementById("year").textContent = new Date().getFullYear();

// Visionneuse : agrandit les captures des projets
(function () {
  const shots = Array.from(document.querySelectorAll(".plate-shots img"));
  if (!shots.length || !window.HTMLDialogElement) return;

  const dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.setAttribute("aria-label", "Capture agrandie");
  dialog.innerHTML =
    '<button type="button" class="lb-close" aria-label="Fermer">×</button>' +
    '<button type="button" class="lb-nav lb-prev" aria-label="Précédente">‹</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button type="button" class="lb-nav lb-next" aria-label="Suivante">›</button>';
  document.body.appendChild(dialog);

  const img = dialog.querySelector("img");
  const caption = dialog.querySelector("figcaption");
  let group = [];
  let index = 0;

  function show(i) {
    index = (i + group.length) % group.length;
    img.src = group[index].currentSrc || group[index].src;
    img.alt = group[index].alt;
    caption.textContent = group[index].alt;
    dialog.classList.toggle("single", group.length < 2);
  }

  shots.forEach((shot) => {
    shot.tabIndex = 0;
    shot.setAttribute("role", "button");
    shot.addEventListener("click", () => open(shot));
    shot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(shot); }
    });
  });

  function open(shot) {
    group = Array.from(shot.closest(".plate-shots").querySelectorAll("img"));
    show(group.indexOf(shot));
    dialog.showModal();
  }

  dialog.querySelector(".lb-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".lb-prev").addEventListener("click", () => show(index - 1));
  dialog.querySelector(".lb-next").addEventListener("click", () => show(index + 1));
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });
})();

// Menu : met en évidence la section visible
(function () {
  const links = Array.from(document.querySelectorAll(".nav a"));
  const targets = links.map((a) => document.querySelector(a.getAttribute("href")));
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.removeAttribute("aria-current"));
      links[targets.indexOf(e.target)].setAttribute("aria-current", "true");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  targets.forEach((t) => t && io.observe(t));
})();

// Visites 3D : la scène se charge dans la page, au clic seulement (16 à 29 Mo)
document.querySelectorAll(".stage").forEach((stage) => {
  const start = stage.querySelector(".stage-start");
  start.addEventListener("click", () => {
    const frame = document.createElement("iframe");
    frame.src = stage.dataset.src;
    frame.title = stage.dataset.title;
    frame.allow = "fullscreen; xr-spatial-tracking";
    frame.allowFullscreen = true;
    const full = document.createElement("button");
    full.type = "button";
    full.className = "stage-full";
    full.textContent = "Plein écran";
    full.addEventListener("click", () => (frame.requestFullscreen || frame.webkitRequestFullscreen).call(frame));
    start.remove();
    stage.append(frame, full);
  });
});
