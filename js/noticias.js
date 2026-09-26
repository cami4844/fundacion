/* ============================================================
   NOTICIAS V6 — render desde la fuente que esté disponible
   · Con servidor (node server.js): lee de la BASE DE DATOS
     por la API (api/noticias) — noticias nuevas al instante.
   · Sin servidor (GitHub Pages / file://): usa js/data/noticias.js.
   · Muestra las 3 más recientes + botón "Ver todas".
   · Si no hay imagen, dibuja una figura SVG propia.
   · Ordena por fecha (más nueva primero) · texto SIEMPRE
     escapado (seguridad).
   ============================================================ */
(() => {
  "use strict";
  const grid = document.getElementById("noticias-grid");
  if (!grid) return;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LIMITE = 3;

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const figuraSVG = (sem) => {
    const tonos = [["#0290AB", "#029C9A"], ["#155288", "#0290AB"], ["#029C9A", "#4A90C9"]];
    const t = tonos[sem % tonos.length];
    const x = 30 + (sem % 3) * 22, y = 26 + (sem % 2) * 18;
    return `<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="ng${sem}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${t[0]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient></defs>
      <rect width="100" height="56" fill="url(#ng${sem})"/>
      <g fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="1.1">
        <circle cx="${x}" cy="${y}" r="3.2" fill="#fff" fill-opacity=".8" stroke="none"/>
        <circle cx="${x + 26}" cy="${y + 12}" r="2.2"/><circle cx="${x - 18}" cy="${y + 16}" r="2.6"/>
        <path d="M${x} ${y} L${x + 26} ${y + 12} M${x} ${y} L${x - 18} ${y + 16}"/>
        <ellipse cx="${x + 4}" cy="${y + 4}" rx="17" ry="6" transform="rotate(-18 ${x + 4} ${y + 4})"/>
      </g>
      <circle cx="${x - 12}" cy="${y - 10}" r="1.4" fill="#fff" fill-opacity=".7"/>
      <circle cx="${x + 30}" cy="${y - 6}" r="1.1" fill="#fff" fill-opacity=".5"/>
    </svg>`;
  };

  const CLASES_TIPO = { Evento: "tag--evento", Convocatoria: "tag--convocatoria", Taller: "tag--taller", Noticia: "tag--noticia" };

  const tarjeta = (n, i) => {
    const f = n.fecha ? new Date(n.fecha + "T12:00:00") : null;
    const cuando = f ? f.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "";
    const media = n.imagen
      ? `<img src="${esc(n.imagen)}" alt="${esc(n.titulo || "Imagen de la noticia")}" loading="lazy" width="1000" height="594">`
      : figuraSVG(i);
    const tipo = n.categoria || "";
    const claseTag = CLASES_TIPO[tipo] || "";
    const rotuloTag = tipo || n.etiqueta || "Novedad";
    const tieneMas = n.cuerpo && String(n.cuerpo).replace(/<[^>]*>/g, "").trim().length > 0;
    return `<article class="noticia rv${RM ? " in" : ""}${tieneMas ? " noticia--leible" : ""}" style="--d:${(0.05 + i * 0.07).toFixed(2)}s"${tieneMas ? ` tabindex="0" role="button" aria-label="Leer: ${esc(n.titulo || "")}" data-idx="${i}"` : ""}>
      <span class="noticia__marco noticia__marco--vuela">${media}</span>
      <div class="noticia__cuerpo">
        <div class="noticia__meta"><span class="tag ${claseTag}">${esc(rotuloTag)}</span><time datetime="${esc(n.fecha || "")}">${cuando}</time></div>
        <h3>${esc(n.titulo || "")}</h3>
        <p>${esc(n.texto || "")}</p>
        ${tieneMas ? '<span class="noticia__leer">Leer la publicación completa →</span>' : ""}
      </div>
    </article>`;
  };

  /* lector en pantalla (lightbox) para las publicaciones con contenido */
  let lector = null;
  function abreLector(n) {
    if (!lector) {
      lector = document.createElement("dialog");
      lector.className = "lector-noticia";
      lector.innerHTML = `<div class="lector-noticia__caja">
        <button class="lector-noticia__cerrar" type="button" aria-label="Cerrar">✕</button>
        <div class="lector-noticia__cuerpo"></div>
      </div>`;
      document.body.appendChild(lector);
      lector.querySelector(".lector-noticia__cerrar").addEventListener("click", () => lector.close());
      lector.addEventListener("click", (e) => { if (e.target === lector) lector.close(); });
    }
    const f = n.fecha ? new Date(n.fecha + "T12:00:00") : null;
    const cuando = f ? f.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "";
    const tipo = n.categoria || n.etiqueta || "Novedad";
    const contenido = lector.querySelector(".lector-noticia__cuerpo");
    contenido.innerHTML = `
      <div class="noticia__meta"><span class="tag ${CLASES_TIPO[tipo] || ""}">${esc(tipo)}</span><time>${esc(cuando)}</time></div>
      <h3>${esc(n.titulo || "")}</h3>
      ${n.imagen ? `<img src="${esc(n.imagen)}" alt="" loading="lazy">` : ""}
      ${n.cuerpo ? n.cuerpo : `<p>${esc(n.texto || "")}</p>`}`;
    lector.showModal();
  }

  function escuchaLectores(raiz, datos) {
    raiz.querySelectorAll(".noticia--leible").forEach((art) => {
      const abrir = () => abreLector(datos[Number(art.dataset.idx)] || datos[0]);
      art.addEventListener("click", abrir);
      art.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } });
    });
  }

  const reservado = (span) => `<article class="noticia noticia--proxima rv${RM ? " in" : ""}" style="--d:.19s;${span > 1 ? `grid-column:span ${span}` : ""}">
    <div class="noticia__reservado" aria-hidden="true">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#0290AB" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h7"/></svg>
      <span>Espacio reservado</span>
    </div>
    <div class="noticia__cuerpo">
      <div class="noticia__meta"><span class="tag tag--proximo">Próximamente</span></div>
      <h3>Noticias de nuestros proyectos</h3>
      <p>Muy pronto publicaremos aquí los avances de cada programa, convocatorias y actividades. ¡Quédate cerca!</p>
    </div>
  </article>`;

  function activaRv() {
    const rvs = grid.querySelectorAll(".rv:not(.in)");
    if (RM || !("IntersectionObserver" in window)) { rvs.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
    rvs.forEach((el) => io.observe(el));
  }

  function pinta(datos, cuantas) {
    if (!datos.length) { grid.innerHTML = reservado(3); return; }
    const visibles = datos.slice(0, cuantas).map(tarjeta).join("");
    const sobran = datos.length - cuantas;
    let extra = "";
    if (sobran > 0) {
      extra = `<div class="noticias-mas rv in"><button type="button" id="noticias-vermas" class="btn btn--suave">Ver las ${sobran} noticias anteriores
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>`;
    } else if (datos.length < cuantas) {
      /* compone la cuadrícula: el espacio reservado llena lo que falta */
      extra = reservado(Math.min(2, cuantas - datos.length));
    }
    grid.innerHTML = visibles + extra;
    const mas = document.getElementById("noticias-vermas");
    if (mas) mas.addEventListener("click", () => {
      grid.innerHTML = datos.map(tarjeta).join("");
      activaRv();
      escuchaLectores(grid, datos);
    });
    activaRv();
    escuchaLectores(grid, datos);
  }

  async function iniciar() {
    let datos = null;
    /* 1) ¿hay servidor con base de datos? */
    try {
      const api = await window.API;
      if (api && api.disponible) {
        const r = await fetch("api/noticias", { headers: { Accept: "application/json" }, cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (j && j.ok && Array.isArray(j.noticias) && j.noticias.length) datos = j.noticias;
        }
      }
    } catch (e) {}
    /* 2) copia publicada editada desde la web (CMS de GitHub):
          data-publica/noticias.json se actualiza con cada publicación */
    if (!datos) {
      try {
        const rj = await fetch("data-publica/noticias.json", { cache: "no-store" });
        if (rj.ok) {
          const jj = await rj.json();
          if (jj && Array.isArray(jj.noticias) && jj.noticias.length) datos = jj.noticias;
        }
      } catch (e) {}
    }
    /* 3) modo archivo: js/data/noticias.js */
    if (!datos) datos = Array.isArray(window.NOTICIAS) ? [...window.NOTICIAS] : [];
    datos.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
    pinta(datos, LIMITE);
  }

  iniciar();
})();
