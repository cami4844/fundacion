/* ============================================================
   PRINCIPAL V15 «Taller de ciencia» — comportamiento compartido
   por TODAS las páginas (cada característica se auto-desactiva
   si su elemento no existe en la página actual).
   ------------------------------------------------------------
   · MENÚ DRAWER: apertura por botón, cierre por asa/velo/Escape,
     GESTO DE ARRASTRE CON LÍMITES [0, ancho]: el panel jamás
     puede salirse del viewport (se limita con clamp y el
     documento queda bloqueado a nivel <html> + body fijo).
   · Bloqueo de scroll en html Y body (position:fixed + top):
     ni rubber-band vertical ni deriva horizontal.
   · Reveals (rise/lateral/clip), tipeo, barra de progreso,
     botón flotante de WhatsApp, mapa que entra por partes,
     programas desplegables, formulario y confeti del logo.
   · IO dispara el cuándo, CSS el cómo. reduced-motion respetado.
   ============================================================ */
(() => {
  "use strict";
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CFG = window.CONFIG || {};
  const WA = CFG.whatsapp || "573219359764";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const waLink = (texto) => `https://wa.me/${WA}?text=${encodeURIComponent(texto)}`;
  const FINO = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ——— utilidades V9.1: toast + respuesta háptica sutil ——— */
  const zumbido = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (err) {} };
  const toastEl = () => document.getElementById("toast"); // perezoso: el div se parsea después de este script
  let toastTimer = 0;
  const toast = (msg) => {
    const el = toastEl();
    if (!el) return;
    el.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' +
      document.createTextNode(msg).textContent;
    el.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("visible"), 2600);
  };

  /* ——— sin servidor, el panel no existe: ocultar el enlace ———
     En GitHub Pages o hosting estático no hay /api: si el enlace del panel
     quedara, la gente intentaría entrar para siempre y nunca podría. */
  fetch("/api/salud", { signal: AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined })
    .then((r) => { if (!r.ok) throw 0; })
    .catch(() => {
      document.documentElement.classList.add("sin-servidor");
      $$('a[href="admin/admin.html"], a[href="/admin/admin.html"], a[href$="/admin/admin.html"]').forEach((a) => a.remove());
    });

  /* ——— copiar número de WhatsApp (con estado y confirmación) ——— */
  $$('button[data-copiar]').forEach((b) => {
    b.addEventListener("click", async () => {
      const texto = b.getAttribute("data-copiar") || "";
      let ok = false;
      try { await navigator.clipboard.writeText(texto); ok = true; }
      catch (err) {
        try {
          const ta = document.createElement("textarea");
          ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          ok = document.execCommand("copy"); ta.remove();
        } catch (err2) {}
      }
      if (ok) {
        b.classList.add("copiado"); toast("Número copiado: " + texto); zumbido(10);
        setTimeout(() => b.classList.remove("copiado"), 2400);
      } else {
        toast("No se pudo copiar; el número es " + texto);
      }
    });
  });

  /* ——— barra de progreso de lectura ——— */
  const barra = document.createElement("div");
  barra.className = "progreso";
  barra.innerHTML = "<i></i>";
  document.body.appendChild(barra);
  const barraI = barra.firstElementChild;
  const indicador = $(".indicador-scroll");
  let progresoPend = false;
  function pintaProgreso() {
    const max = document.documentElement.scrollHeight - innerHeight;
    barraI.style.transform = `scaleX(${max > 0 ? (scrollY / max).toFixed(4) : 0})`;
    /* el indicador de scroll acompaña solo la primera pantalla */
    if (indicador) indicador.classList.toggle("oculto", scrollY > innerHeight * 0.32);
    progresoPend = false;
  }
  addEventListener("scroll", () => {
    if (!progresoPend) { progresoPend = true; requestAnimationFrame(pintaProgreso); }
  }, { passive: true });
  pintaProgreso();

  /* ——— cabecera: estado rodando ——— */
  const cabecera = $("#cabecera");
  const onScroll = () => cabecera && cabecera.classList.toggle("rodando", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ——— intro: el logo abre la página y al bajar se acopla a la esquina ———
     El logo grande está fijo en el centro; con el scroll interpola hasta la
     posición exacta del isotipo de la cabecera y ahí se funde con él (mismo
     sitio, mismo tamaño: el cambio no se ve). El lema aparece de a poquito. */
  const introLogo = $("#intro-logo"), introLema = $("#intro-lema"), lockup = $("#lockup");
  const lockupIso = lockup && lockup.querySelector(".lockup__iso");
  if (introLogo && lockupIso && !RM) {
    let introPend = false;
    function pintaIntro() {
      introPend = false;
      const p = Math.max(0, Math.min(1, scrollY / (innerHeight * 0.55)));
      const ir = lockupIso.getBoundingClientRect();
      /* offsetHeight es el tamaño SIN transform: usar getBoundingClientRect
         aquí se realimenta a sí mismo y el logo encoge en cada frame */
      /* escala por ANCHO (no por alto): el isotipo no es cuadrado y por
         alto el logo acoplado quedaba más chico que el de la cabecera */
      const escala = ir.width / introLogo.offsetWidth;
      const dx = (ir.left + ir.width / 2) - innerWidth / 2;
      const dy = (ir.top + ir.height / 2) - innerHeight / 2;
      introLogo.style.transform = "translate(calc(-50% + " + (dx * p).toFixed(1) + "px), calc(-50% + " + (dy * p).toFixed(1) + "px)) scale(" + (1 + (escala - 1) * p).toFixed(4) + ")";
      introLogo.style.opacity = p >= 1 ? "0" : "1";
      lockup.style.opacity = p.toFixed(3);
      if (introLema) {
        const q = Math.max(0, Math.min(1, (p - 0.12) / 0.5));
        introLema.style.opacity = q.toFixed(3);
        introLema.style.transform = "translateY(" + ((1 - q) * 16).toFixed(1) + "px)";
      }
    }
    addEventListener("scroll", () => { if (!introPend) { introPend = true; requestAnimationFrame(pintaIntro); } }, { passive: true });
    addEventListener("resize", pintaIntro);
    pintaIntro();
  }

  /* ——— botón flotante de WhatsApp (experiencia app en el celu) ——— */
  if (matchMedia("(max-width: 820px)").matches) {
    const waF = document.createElement("a");
    waF.className = "wa-flotante";
    waF.setAttribute("aria-label", "Escríbenos por WhatsApp");
    waF.target = "_blank"; waF.rel = "noopener";
    waF.href = waLink("Hola, quiero conocer más sobre la Fundación Red Con Ciencia.");
    waF.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg> Escríbenos`;
    document.body.appendChild(waF);
    let waPend = false;
    const waEstado = () => {
      waF.classList.toggle("visible", scrollY > innerHeight * 0.75);
      waPend = false;
    };
    addEventListener("scroll", () => { if (!waPend) { waPend = true; requestAnimationFrame(waEstado); } }, { passive: true });
  }

  /* ══════════════ MENÚ MÓVIL — drawer con gesto limitado ══════════════ */
  const menu = $("#menu-movil"), velo = $("#menu-velo"), btnMenu = $("#menu-btn");
  let abierto = false, yBloqueo = 0;

  function bloqueaScroll() {
    yBloqueo = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = `-${yBloqueo}px`;
    document.documentElement.classList.add("sin-scroll");
  }
  function liberaScroll() {
    document.documentElement.classList.remove("sin-scroll");
    document.body.style.top = "";
    window.scrollTo(0, yBloqueo);
  }

  function setMenu(estado) {
    if (estado === abierto) return;
    abierto = estado;
    zumbido(estado ? 8 : 5);
    menu.classList.toggle("abierto", abierto);
    velo.classList.toggle("abierto", abierto);
    menu.setAttribute("aria-hidden", String(!abierto));
    btnMenu && btnMenu.setAttribute("aria-expanded", String(abierto));
    if (abierto) {
      bloqueaScroll();
      const primero = menu.querySelector(".menu-enlace");
      setTimeout(() => { primero && primero.focus({ preventScroll: true }); }, 140);
    } else {
      liberaScroll();
      btnMenu && btnMenu.focus({ preventScroll: true });
    }
  }

  btnMenu && btnMenu.addEventListener("click", () => setMenu(true));
  velo && velo.addEventListener("click", () => setMenu(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && abierto) setMenu(false); });

  /* cierre por enlace + salto suave tras liberar el documento */
  $$(".menu-enlace", menu).forEach((a) => {
    a.addEventListener("click", (e) => {
      const destino = document.querySelector(a.getAttribute("href"));
      if (!destino) { setMenu(false); return; }
      e.preventDefault();
      setMenu(false);
      setTimeout(() => destino.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" }), 60);
    });
  });

  /* ——— GESTO DE ARRASTRE ACOTADO ———
     El panel vive en translate3d(x,0,0) con x ∈ [0, ancho].
     Nada de rubber-band: al terminar el gesto SIEMPRE vuelve
     a una posición válida (0 = abierto, ancho = cerrado). */
  if (menu) {
    let iniX = 0, iniY = 0, dx = 0, arrastrando = false, decidido = false, t0 = 0;
    const ancho = () => menu.getBoundingClientRect().width;

    menu.addEventListener("pointerdown", (e) => {
      if (!abierto || e.pointerType === "mouse") return; /* el mouse no arrastra */
      iniX = e.clientX; iniY = e.clientY; dx = 0;
      decidido = false; arrastrando = false; t0 = performance.now();
    }, { passive: true });

    menu.addEventListener("pointermove", (e) => {
      if (!abierto || iniX === null) return;
      const mvx = e.clientX - iniX, mvy = e.clientY - iniY;
      if (!decidido) {
        if (Math.abs(mvx) > 9 && Math.abs(mvx) > Math.abs(mvy) * 1.15) {
          decidido = true; arrastrando = true;
          menu.classList.add("sin-transicion");
          menu.style.touchAction = "none";
        } else if (Math.abs(mvy) > 12) { iniX = null; return; } /* es scroll vertical */
        else return;
      }
      if (arrastrando) {
        e.preventDefault();
        /* LÍMITE DURO: solo se permite arrastrar hacia la derecha (cerrar),
           nunca más allá del ancho del panel ni hacia la izquierda de 0. */
        dx = Math.min(ancho(), Math.max(0, mvx));
        menu.style.transform = `translate3d(${dx}px,0,0)`;
      }
    });

    function suelta() {
      if (!arrastrando) { iniX = null; return; }
      const w = ancho();
      const rapidez = dx / Math.max(1, performance.now() - t0); /* px/ms */
      menu.classList.remove("sin-transicion");
      menu.style.touchAction = "";
      menu.style.transform = "";
      /* decisión: umbral de distancia o velocidad */
      if (dx > w * 0.32 || rapidez > 0.55) setMenu(false);
      /* si no: el panel vuelve a 0 (abierto) por la transición normal */
      iniX = null; arrastrando = false; decidido = false;
    }
    menu.addEventListener("pointerup", suelta);
    menu.addEventListener("pointercancel", suelta);
    /* cinturón de seguridad táctil: nada de paneo horizontal del documento */
    menu.addEventListener("touchmove", (e) => { if (arrastrando) e.preventDefault(); }, { passive: false });
    iniX = null;
  }

  /* ——— scroll-spy ——— */
  const navLinks = $$(".nav a");
  const porId = Object.fromEntries(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
  const GRUPOS = {
    "inicio": "inicio",
    "nosotros": "nosotros", "enfoque": "nosotros", "equipo": "nosotros",
    "programas": "programas",
    "noticias": "noticias",
    "contacto": "contacto",
  };
  const spy = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      const enlace = porId[GRUPOS[e.target.id]];
      if (!enlace) continue;
      navLinks.forEach((a) => { a.classList.remove("activo"); a.removeAttribute("aria-current"); });
      enlace.classList.add("activo");
      enlace.setAttribute("aria-current", "true");
    }
  }, { rootMargin: "-38% 0px -55% 0px" });
  Object.keys(GRUPOS).forEach((id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  /* ——— revelados al hacer scroll ——— */
  const SEL_RV = ".rv,.rv--izq,.rv--der,.rv--escala,.rv--clip";
  const rvs = $$(SEL_RV);
  if (RM || !("IntersectionObserver" in window)) rvs.forEach((el) => el.classList.add("in"));
  else {
    const movil = matchMedia("(max-width: 700px)").matches;
    function crearIO(threshold, rootMargin) {
      const obs = new IntersectionObserver((entradas) => {
        for (const e of entradas) if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      }, { threshold, rootMargin });
      return obs;
    }
    const io = crearIO(movil ? 0.05 : 0.13, movil ? "0px 0px -1% 0px" : "0px 0px -6% 0px");
    rvs.forEach((el) => io.observe(el));
    /* los .rv--clip empiezan 88% recortados: su intersección útil es
       menor, así que usan su propio umbral (0.02) */
    const clips = $$(".rv--clip");
    if (clips.length) {
      const ioClip = crearIO(0.02, "0px");
      clips.forEach((el) => { io.unobserve(el); ioClip.observe(el); });
    }
    /* failsafe: nada de contenido invisible más de 2,5 s */
    setTimeout(() => {
      const limite = innerHeight * 0.96;
      rvs.forEach((el) => {
        if (el.classList.contains("in")) return;
        const r = el.getBoundingClientRect();
        if (r.top < limite) el.classList.add("in");
      });
    }, 2500);
  }

  /* ——— frases que aparecen palabra a palabra ——— */
  const tipeo = $$(".tipeo");
  if (tipeo.length && !RM && "IntersectionObserver" in window) {
    tipeo.forEach((el) => {
      const texto = el.textContent.trim();
      el.setAttribute("aria-label", texto);
      el.textContent = "";
      texto.split(" ").forEach((palabra, i, arr) => {
        const s = document.createElement("span");
        s.className = "tipeo__p";
        s.setAttribute("aria-hidden", "true");
        s.textContent = palabra;
        s.style.transitionDelay = `${0.1 + i * 0.055}s`;
        el.appendChild(s);
        if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
      });
    });
    const ioT = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add("tipeo--in"); ioT.unobserve(e.target); }
    }, { threshold: 0.5 });
    tipeo.forEach((el) => ioT.observe(el));
  } else {
    tipeo.forEach((el) => el.classList.add("tipeo--in"));
  }

  /* ——— Brújula de páginas ———
     El sitio son 6 páginas separadas, pero sin este aviso parecía una
     sola larga. Se dibuja al final de cada página (antes del pie) con
     la anterior, la siguiente y "página N de 6". El 404 no cuenta:
     se queda solo con el botón de volver al inicio. */
  const PAGINAS = [
    { archivo: "index.html", nombre: "Inicio", pista: "El taller de ciencia" },
    { archivo: "nosotros.html", nombre: "Nosotros", pista: "Quiénes somos" },
    { archivo: "programas.html", nombre: "Programas", pista: "En qué trabajamos" },
    { archivo: "territorio.html", nombre: "Territorio", pista: "Dónde estamos" },
    { archivo: "noticias.html", nombre: "Noticias", pista: "Lo que va pasando" },
    { archivo: "contacto.html", nombre: "Contacto", pista: "Escríbenos" },
  ];
  const actual = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const iActual = PAGINAS.findIndex((p) => p.archivo === actual);
  if (iActual >= 0) {
    const punto = $("main");
    if (punto) {
      const ant = iActual > 0 ? PAGINAS[iActual - 1] : null;
      const sig = iActual < PAGINAS.length - 1 ? PAGINAS[iActual + 1] : null;
      const flecha = (d) => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
      const brújula = document.createElement("nav");
      brújula.className = "brujula";
      brújula.setAttribute("aria-label", "Navegación entre páginas del sitio");
      brújula.innerHTML =
        '<p class="brujula__titulo"><span>Estás en la página</span><b>' + (iActual + 1) + ' de ' + PAGINAS.length + '</b></p>' +
        '<div class="brujula__pasos">' +
        PAGINAS.map((p, i) => '<a class="brujula__paso' + (i === iActual ? " es-actual" : "") + '" href="' + p.archivo + '"' +
          (i === iActual ? ' aria-current="page"' : "") + ' title="' + p.nombre + ' — ' + p.pista + '">' +
          '<i>' + (i + 1) + '</i><b>' + p.nombre + '</b></a>').join("") +
        "</div>" +
        '<div class="brujula__flechas">' +
        (ant
          ? '<a class="brujula__btn brujula__btn--atras" href="' + ant.archivo + '" rel="prev">' + flecha("M15 18l-6-6 6-6") + '<span><small>Anterior</small><b>' + ant.nombre + "</b></span></a>"
          : '<span class="brujula__hueco" aria-hidden="true"></span>') +
        (sig
          ? '<a class="brujula__btn brujula__btn--siguiente" href="' + sig.archivo + '" rel="next">' + flecha("M9 18l6-6-6-6") + '<span><small>Siguiente</small><b>' + sig.nombre + "</b></span></a>"
          : '<a class="brujula__btn brujula__btn--siguiente" href="#contenido">Arriba<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></a>') +
        "</div>";
      /* va justo después de <main>, es decir antes del pie */
      punto.insertAdjacentElement("afterend", brújula);
    }
  }

  /* ——— mapa: entrada de los departamentos ———
     Antes se pedía el 20 % del SVG, pero en celular el mapa es más alto
     que la pantalla: ese 20 % nunca se cumplía y los 33 departamentos
     se quedaban invisibles. Ahora se vigila la caja, con un umbral
     pequeño y un seguro para que siempre se vea. */
  const mapa = $("#mapa");
  if (mapa) {
    const entraMapa = () => {
      if (mapa.dataset.entrando) return;
      mapa.dataset.entrando = "1";
      mapa.classList.add("mapa-entra");
      $$(".depto", mapa).forEach((d, i) => { d.style.transitionDelay = `${Math.min(i * 22, 900)}ms`; });
      setTimeout(() => $$(".depto", mapa).forEach((d) => { d.style.transitionDelay = ""; }), 2400);
    };
    if (RM || !("IntersectionObserver" in window)) {
      entraMapa();
    } else {
      const ioM = new IntersectionObserver((es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        ioM.disconnect();
        entraMapa();
      }, { threshold: 0.05, rootMargin: "0px 0px -4% 0px" });
      ioM.observe(mapa.closest(".mapa-caja") || mapa);
      /* seguro: si el observador no despierta, se muestra igual */
      setTimeout(() => {
        const r = (mapa.closest(".mapa-caja") || mapa).getBoundingClientRect();
        if (r.top < innerHeight) entraMapa();
      }, 2600);
    }
  }

  /* ——— botones magnéticos (desktop, sutiles) ——— */
  if (!RM && FINO) {
    $$(".btn--primario").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * 0.1;
        const dy = (e.clientY - r.top - r.height / 2) * 0.16;
        b.style.translate = `${Math.max(-5, Math.min(5, dx)).toFixed(1)}px ${Math.max(-4, Math.min(4, dy)).toFixed(1)}px`;
      });
      b.addEventListener("pointerleave", () => { b.style.translate = ""; });
    });
  }

  /* ——— formulario: motivo · nombre · correo · mensaje ——— */
  const form = $("#form-wa");
  const estado = $("#form-estado");
  function di(txt, tipo) {
    if (!estado) return;
    estado.textContent = txt;
    estado.className = "form-estado" + (tipo ? " form-estado--" + tipo : "");
  }
  form && form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = $("#f-nombre").value.trim();
    const correo = $("#f-correo").value.trim();
    const motivo = $("#f-motivo") ? $("#f-motivo").value : "Mensaje";
    const mensaje = $("#f-mensaje").value.trim();
    const empresa = $("#f-empresa") ? $("#f-empresa").value : ""; /* trampa anti-bots */
    if (!nombre || !mensaje) { form.reportValidity(); return; }
    const textoWa = `Hola, soy ${nombre}. ${motivo}: ${mensaje}${correo ? ` (Mi correo: ${correo})` : ""} — Enviado desde el sitio web de la Fundación Red Con Ciencia.`;
    const btn = form.querySelector("button[type=submit]");
    const original = btn.innerHTML;
    btn.disabled = true;

    /* 1) ¿hay servidor? el mensaje queda GUARDADO en la bandeja del equipo */
    try {
      const api = await window.API;
      if (api && api.disponible) {
        di("Enviando tu mensaje…");
        const r = await fetch("api/mensajes", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ nombre, correo, motivo, mensaje, empresa }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) {
          di("¡Listo! Tu mensaje ya está en la bandeja del equipo. Si quieres, también puedes avisarnos por WhatsApp:", "ok");
          estado.insertAdjacentHTML("beforeend", ` <a href="${waLink(textoWa)}" target="_blank" rel="noopener">Abrir WhatsApp con este mensaje</a>`);
          btn.innerHTML = "Enviado";
          setTimeout(() => { btn.innerHTML = original; form.reset(); btn.disabled = false; }, 4200);
          return;
        }
        di(j.error || "No pudimos guardarlo; ábrelo por WhatsApp:", "aviso");
        btn.disabled = false;
        btn.innerHTML = original;
        window.open(waLink(textoWa), "_blank", "noopener");
        return;
      }
    } catch (err) {}

    /* 2) sin servidor: correo configurado o WhatsApp */
    if (CFG.correoDestino) {
      di("Enviando tu mensaje…");
      try {
        const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CFG.correoDestino)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            _subject: `${motivo} — sitio web Fundación Red Con Ciencia`,
            _template: "table",
            Nombre: nombre, Correo: correo || "(no dejó correo)", Motivo: motivo, Mensaje: mensaje
          })
        });
        if (!r.ok) throw new Error("resp " + r.status);
        di("¡Listo! Tu mensaje ya llegó a la Fundación.", "ok");
        btn.innerHTML = "Enviado";
        setTimeout(() => { btn.innerHTML = original; form.reset(); btn.disabled = false; }, 2600);
        return;
      } catch (err) {
        di("No pudimos enviarlo al correo; ábrelo por WhatsApp:", "aviso");
      }
    }
    window.open(waLink(textoWa), "_blank", "noopener");
    di("Se abrió WhatsApp con tu mensaje listo para enviar.", "ok");
    btn.innerHTML = "¡Abriendo WhatsApp!";
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 2400);
  });

  /* ——— enlaces WhatsApp desde config ——— */
  $$("[data-wa]").forEach((a) => { a.href = waLink(a.dataset.wa || "Hola, quiero conocer más sobre la Fundación Red Con Ciencia."); });

  /* ——— Google Maps diferido + consentimiento ——— */
  const mapsBtn = $("#maps-cargar");
  const mapsCaja = $("#maps-lazy");
  function cargaMaps() {
    if (!mapsCaja || mapsCaja.querySelector("iframe")) return;
    const iframe = document.createElement("iframe");
    iframe.title = "Mapa de la sede: Cra. 10 # 19-57, Tunja, Boyacá";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.allowFullscreen = true;
    iframe.src = "https://www.google.com/maps?q=Carrera%2010%20%23%2019-57%2C%20Tunja%2C%20Boyac%C3%A1%2C%20Colombia&output=embed&z=17";
    mapsCaja.appendChild(iframe);
    /* el botón cede su lugar al mapa: desaparece al oprimirlo */
    if (mapsBtn) mapsBtn.hidden = true;
  }
  if (mapsBtn && mapsCaja) {
    mapsBtn.addEventListener("click", () => {
      let ok = false;
      try { const c = window.frccConsent && window.frccConsent(); ok = !!(c && c.mapa); } catch (e) {}
      if (ok) cargaMaps();
      else {
        mapsCaja.dataset.pendiente = "1";
        if (!mapsBtn.dataset.avisoPuesta) {
          mapsBtn.insertAdjacentHTML("beforeend", "<small>Activa las cookies del mapa en el aviso (enlace «Cookies» del pie) y vuelve a intentarlo.</small>");
          mapsBtn.dataset.avisoPuesta = "1";
        }
        document.dispatchEvent(new CustomEvent("frcc:abrir-cookies"));
      }
    });
    document.addEventListener("frcc:consent", (e) => {
      if (e.detail && e.detail.mapa && mapsCaja.dataset.pendiente === "1") cargaMaps();
    });
  }

  /* ——— programas expandibles (V12) ——— */
  $$(".prog__mas").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".prog");
      const abierto = card.classList.toggle("abierta");
      btn.setAttribute("aria-expanded", abierto ? "true" : "false");
      if (abierto) $$(".prog.abierta").forEach((otra) => {
        if (otra !== card) {
          otra.classList.remove("abierta");
          const b = otra.querySelector(".prog__mas");
          if (b) b.setAttribute("aria-expanded", "false");
        }
      });
    });
  });

  /* ——— confeti secreto: cinco toques al logo del pie ——— */
  const logoPie = $(".pie img");
  let toquesLogo = 0, toquesLogoT = 0;
  if (logoPie) logoPie.addEventListener("click", () => {
    const t = Date.now();
    if (t - toquesLogoT > 2500) toquesLogo = 0;
    toquesLogoT = t;
    if (++toquesLogo < 5) return;
    toquesLogo = 0;
    if (RM) return;
    const colores = ["#0E6F7A", "#1FA7A9", "#C0402A", "#F0B429", "#111417"];
    for (let i = 0; i < 46; i++) {
      const p = document.createElement("i");
      const tam = 6 + Math.random() * 7;
      p.style.cssText = "position:fixed;z-index:130;left:" + innerWidth / 2 + "px;top:" + innerHeight * 0.3 + "px;width:" + tam + "px;height:" + tam * (i % 3 ? 1 : 0.45) + "px;background:" + colores[i % colores.length] + ";border-radius:" + (i % 2 ? "50%" : "2px") + ";pointer-events:none";
      document.body.appendChild(p);
      const dx = (Math.random() - 0.5) * innerWidth * 0.75;
      const dy = innerHeight * (0.55 + Math.random() * 0.3);
      const rot = (Math.random() - 0.5) * 720;
      p.animate([
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg)", opacity: 0 },
      ], { duration: 1300 + Math.random() * 900, easing: "cubic-bezier(.2,.55,.35,1)" }).onfinish = () => p.remove();
    }
  });

  /* ——— año del pie ——— */
  const anio = $("#anio");
  if (anio) anio.textContent = String(new Date().getFullYear());
})();
