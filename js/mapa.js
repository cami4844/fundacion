/* ============================================================
   MAPA V4 — Colombia interactiva con polígonos reales
   Hover/touch por departamento · ficha · escala gráfica ·
   leyenda por regiones · zoom y paneo · pin de la sede (Tunja).
   Datos: window.MAPA_COLOMBIA (GeoJSON oficial simplificado).
   ============================================================ */
(() => {
  "use strict";
  const MC = window.MAPA_COLOMBIA;
  if (!MC || !document.getElementById("mapa")) return;

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("mapa");
  const tooltip = document.getElementById("tooltip-mapa");
  const ficha = document.getElementById("ficha");
  const leyenda = document.getElementById("leyenda");

  const REGION_COLOR = {
    "Caribe": "#4E8E9C", "Andina": "#2E8B92", "Pacífica": "#3A7686",
    "Orinoquía": "#58A3A6", "Amazonía": "#24636D", "Insular": "#84B4B2",
  };
  const CO = { sede: "#C0402A" };
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* proyección (misma del generador) para el pin de Tunja */
  const P = MC.proj;
  const TX = (lon, lat) => (lon * Math.cos(P.lat0 * Math.PI / 180) - P.minx) * P.scale + P.margen;
  const TY = (lat) => (-lat - P.miny) * P.scale + P.margen;
  const PIN_TUNJA = { x: TX(-73.3621101, 5.5325791), y: TY(5.5325791) };

  svg.setAttribute("viewBox", `0 0 ${MC.w} ${MC.h}`);
  svg.style.aspectRatio = `${MC.w} / ${MC.h}`;

  /* ——— construcción del SVG ——— */
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML =
    `<linearGradient id="gradSede" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#3FA5A9"/><stop offset=".55" stop-color="#0E6F7A"/><stop offset="1" stop-color="#0B4B52"/>
     </linearGradient>`;
  svg.appendChild(defs);

  const vista = document.createElementNS(NS, "g");   // grupo con zoom/paneo
  svg.appendChild(vista);

  const porId = {};
  for (const d of MC.departamentos) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d.d);
    path.setAttribute("fill", REGION_COLOR[d.region] || "#2E8B92");
    path.setAttribute("stroke", "#0E1114");
    path.setAttribute("stroke-width", "0.9");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("class", "depto");
    path.setAttribute("tabindex", "-1");
    path.dataset.id = d.id;
    vista.appendChild(path);
    porId[d.id] = { info: d, path };
  }
  // la sede siempre por encima + estilo especial
  const sede = porId[MC.boyacaId];
  sede.path.style.fill = "url(#gradSede)";
  sede.path.classList.add("depto--sede");

  /* ——— pin de Tunja ——— */
  const pin = document.createElementNS(NS, "g");
  pin.setAttribute("class", "pin-sede");
  pin.innerHTML =
    `<circle cx="${PIN_TUNJA.x}" cy="${PIN_TUNJA.y}" r="${RM ? 0 : 10}" fill="none" stroke="#C0402A" stroke-width="2" class="pin-onda"/>
     <path d="M${PIN_TUNJA.x} ${PIN_TUNJA.y} c -13 -16 -16 -22 -16 -30 a 16 16 0 1 1 32 0 c 0 8 -3 14 -16 30 Z"
           fill="#C0402A" stroke="#0E1114" stroke-width="2.4" transform="translate(0,-2)"/>
     <circle cx="${PIN_TUNJA.x}" cy="${PIN_TUNJA.y - 33}" r="6" fill="#0E1114"/>
     <text x="${PIN_TUNJA.x + 24}" y="${PIN_TUNJA.y - 26}" font-family="Sora, sans-serif" font-weight="700"
           font-size="30" fill="#F4F1E8" stroke="#0E1114" stroke-width="5" paint-order="stroke">Tunja · Sede</text>`;
  vista.appendChild(pin);

  /* ——— tooltip (escritorio) ——— */
  let ttVisible = false;
  function mostrarTT(d, x, y) {
    tooltip.innerHTML = `<i>${d.region}</i><b>${d.nombre}</b><small>Capital: ${d.capital}</small>`;
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
    tooltip.classList.add("visible");
    tooltip.setAttribute("aria-hidden", "false");
    ttVisible = true;
  }
  function ocultarTT() {
    if (!ttVisible) return;
    tooltip.classList.remove("visible");
    tooltip.setAttribute("aria-hidden", "true");
    ttVisible = false;
  }
  addEventListener("scroll", ocultarTT, { passive: true });

  /* ——— selección + ficha ——— */
  let seleccion = MC.boyacaId;
  function fichaSede() {
    return `
      <span class="ficha__region"><i style="background:url(#);background:${CO.sede}"></i> Sede principal</span>
      <h3>Boyacá</h3>
      <p class="ficha__capital">Capital: Tunja · Región Andina</p>
      <p style="color:#B9B4A6">Desde Tunja se articulan las líneas de trabajo, programas y alianzas de la Fundación en el departamento de Boyacá.</p>
      <div class="ficha__sede">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <span><b>Sede principal — Tunja</b><span>Carrera 10 # 19-57, Tunja, Boyacá</span></span>
      </div>
      <div class="ficha__stats">
        <div><b>1</b><small>Sede principal</small></div>
        <div><b>33</b><small>Departamentos por explorar</small></div>
      </div>
      <a class="btn btn--oro" href="https://maps.app.goo.gl/2XTHnEWf5hp3y85N8" target="_blank" rel="noopener">Cómo llegar
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`;
  }
  function fichaDepto(d) {
    return `
      <span class="ficha__region"><i style="background:${REGION_COLOR[d.region]}"></i> Región ${d.region}</span>
      <h3>${d.nombre}</h3>
      <p class="ficha__capital">Capital: ${d.capital}</p>
      <p style="color:#B9B4A6">Departamento de Colombia. La sede principal de la Fundación Red Con Ciencia está en Tunja, Boyacá, y desde allí articulamos procesos con todo el país.</p>
      <div class="ficha__sede">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l2.5 2.5"/></svg>
        <span><b>¿Sede en ${d.nombre}?</b><span>Aún no — ¡estamos creciendo! Escríbenos si quieres impulsar presencia en tu territorio.</span></span>
      </div>
      <a class="btn btn--oro" href="https://wa.me/573219359764?text=Hola%2C%20soy%20de%20${encodeURIComponent(d.nombre)}%20y%20me%20gustar%C3%ADa%20conocer%20m%C3%A1s%20sobre%20la%20Fundaci%C3%B3n%20Red%20Con%20Ciencia." target="_blank" rel="noopener">Conectar desde ${d.nombre}
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`;
  }
  function seleccionar(id, anclaZoom) {
    seleccion = id;
    const { info, path } = porId[id];
    for (const k in porId) porId[k].path.classList.remove("depto--sel");
    path.classList.add("depto--sel");
    svg.classList.add("sel-activo");
    ficha.innerHTML = id === MC.boyacaId ? fichaSede() : fichaDepto(info);
    if (anclaZoom && !RM && zoom.s > 1) centrarEn(info);
  }

  /* ——— eventos por departamento ——— */
  for (const id in porId) {
    const { info, path } = porId[id];
    path.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") mostrarTT(info, e.clientX, e.clientY); });
    path.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" && ttVisible) mostrarTT(info, e.clientX, e.clientY); });
    path.addEventListener("pointerleave", ocultarTT);
    path.addEventListener("click", () => seleccionar(id, true));
    path.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); seleccionar(id, true); } });
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.setAttribute("aria-label", `${info.nombre}, capital ${info.capital}, región ${info.region}`);
  }

  /* ——— leyenda / filtro por región ——— */
  const regiones = [...new Set(MC.departamentos.map((d) => d.region))];
  let filtro = null;
  for (const r of regiones) {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<i style="background:${REGION_COLOR[r]}"></i>${r}`;
    b.addEventListener("click", () => {
      filtro = filtro === r ? null : r;
      leyenda.querySelectorAll("button").forEach((x) => x.classList.remove("activo"));
      if (filtro) {
        b.classList.add("activo");
        svg.classList.add("filtro");
        for (const k in porId) porId[k].path.classList.toggle("en-filtro", porId[k].info.region === filtro);
      } else {
        svg.classList.remove("filtro");
        for (const k in porId) porId[k].path.classList.remove("en-filtro");
      }
    });
    leyenda.appendChild(b);
  }

  /* ——— escala gráfica (100 km reales) ——— */
  const barra = document.getElementById("escala-barra");
  function escala() {
    if (!barra) return;
    const pxUnidad = svg.clientWidth / MC.w;
    barra.style.width = Math.round((100 / MC.kmPorUnidad) * pxUnidad) + "px";
  }
  escala();
  addEventListener("resize", escala, { passive: true });

  /* ——— zoom + paneo ——— */
  const zoom = { s: 1, tx: 0, ty: 0 };
  function aplicar() {
    vista.setAttribute("transform", `translate(${zoom.tx} ${zoom.ty}) scale(${zoom.s})`);
  }
  function centrarEn(info) {
    const s2 = Math.min(2.2, Math.max(zoom.s, 1.8));
    const cx = info.cx, cy = info.cy;
    zoom.tx = MC.w / 2 - cx * s2;
    zoom.ty = MC.h / 2 - cy * s2;
    zoom.s = s2;
    aplicar();
  }
  svg.parentElement.querySelectorAll("[data-zoom]").forEach((b) => {
    b.addEventListener("click", () => {
      const k = b.dataset.zoom;
      if (k === "reset") { zoom.s = 1; zoom.tx = 0; zoom.ty = 0; aplicar(); return; }
      const f = k === "in" ? 1.4 : 1 / 1.4;
      const s2 = Math.min(3, Math.max(1, zoom.s * f));
      const cx = MC.w / 2, cy = MC.h / 2;
      zoom.tx = cx - (cx - zoom.tx) * (s2 / zoom.s);
      zoom.ty = cy - (cy - zoom.ty) * (s2 / zoom.s);
      zoom.s = s2;
      if (zoom.s === 1) { zoom.tx = 0; zoom.ty = 0; }
      clampPan(); aplicar();
    });
  });
  function clampPan() {
    if (zoom.s <= 1) { zoom.tx = 0; zoom.ty = 0; return; }
    const minX = MC.w - MC.w * zoom.s, minY = MC.h - MC.h * zoom.s;
    zoom.tx = Math.min(0, Math.max(minX, zoom.tx));
    zoom.ty = Math.min(0, Math.max(minY, zoom.ty));
  }
  let pan = null;
  svg.addEventListener("pointerdown", (e) => {
    if (zoom.s <= 1) return;
    pan = { x: e.clientX, y: e.clientY, tx: zoom.tx, ty: zoom.ty };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!pan) return;
    const r = svg.getBoundingClientRect();
    zoom.tx = pan.tx + ((e.clientX - pan.x) * MC.w) / r.width;
    zoom.ty = pan.ty + ((e.clientY - pan.y) * MC.h) / r.height;
    clampPan(); aplicar();
  });
  addEventListener("pointerup", () => { pan = null; });
  svg.style.touchAction = "pan-y";

  /* ——— inicio ——— */
  seleccionar(MC.boyacaId, false);
})();
