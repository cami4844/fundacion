/* ============================================================
   REDITO 2.0 — el robot de la Fundación (V12, desde cero)
   ------------------------------------------------------------
   · Acabado plastilina (V11): ojos grandes con iris, expresiones
     (feliz / sorpresa / dormido) y electrones-satélite.
   · Física propia ACOTADA: al tocarlo se divide en 15 piezas que
     rebotan DENTRO de su caja y vuelven con muelle al reposo.
   · El reposo vive en los márgenes CSS de cada pieza: la física
     mide esas poses y deriva de ahí hogares y paredes.
   · Mirada al cursor (o mirada propia en pantallas táctiles).
   · Tras el primer saludo, la pista "¡tócame!" se retira para
     siempre. prefers-reduced-motion: sin física, solo frases.
   ============================================================ */
(() => {
  "use strict";
  const robot = document.getElementById("robot");
  if (!robot) return;
  const escena = document.getElementById("rb-escena");
  const burbuja = document.getElementById("rb-burbuja");
  const bocaTrazo = document.querySelector("#rb-boca .rb-boca-trazo");
  if (!escena) return;

  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TACTIL = matchMedia("(hover: none)").matches;
  const TOP_PCT = 0.47;               /* el ancla de la escena dentro de su caja */
  const ANCLA_MIRADA_Y = -53;         /* centro de la cabeza en coords de escena */
  const VIDA_PISTA = 2600;            /* ms visibles las frases */

  const FRASES = [
    "¡Hola! Soy Redito",
    "¡Ciencia para todos!",
    "Hecho con ciencia en Tunja",
    "¡Me encanta aprender!",
    "Cada pieza enseña algo",
    "¡Qué bien me armo!",
    "Soy tu compañero de ciencia",
    "La conciencia nos transforma",
    "¿Vemos el mapa juntos?",
    "¡Tócame otra vez!",
  ];

  const BOCAS = {
    neutra: "M9 7 q17 16 34 0",
    feliz: "M7 6 q19 19 38 0",
    sorpresa: "M26 13 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0",
    dormida: "M16 14 q10 6 20 0",
  };

  /* ---------- estado ---------- */
  const S = { modo: "inicial", viendo: true, conocido: false, dormido: false };
  let piezas = [];
  let ROOM = { x: 160, top: -180, bottom: 180 };
  let ultimoTocazo = 0;
  let proximaAuto = 0;
  let temporizadorDormir = 0;
  let boomInicio = 0;
  let ultimoPuntero = 0;          /* última vez que se movió el cursor */

  /* ---------- utilidades ---------- */
  const azar = (a, b) => a + Math.random() * (b - a);

  function expresar(nombre) {
    if (bocaTrazo && BOCAS[nombre]) bocaTrazo.setAttribute("d", BOCAS[nombre]);
    escena.classList.toggle("rb-sorpresa", nombre === "sorpresa");
    escena.classList.toggle("rb-feliz", nombre === "feliz");
    escena.classList.toggle("rb-dormido", nombre === "dormida");
  }

  let fraseHasta = 0, fraseUltima = 0;
  function frase(texto, fuerce) {
    if (!burbuja) return;
    const ahora = Date.now();
    if (!fuerce && ahora < fraseUltima + 4000) return;
    fraseUltima = ahora;
    burbuja.textContent = texto;
    burbuja.classList.add("visible");
    fraseHasta = ahora + VIDA_PISTA;
  }
  function fraseAzul() { /* apaga la burbuja cuando cumple su tiempo */
    if (burbuja && Date.now() >= fraseHasta) burbuja.classList.remove("visible");
  }

  function conocer() {
    if (S.conocido) return;
    S.conocido = true;
    robot.classList.add("conocido"); /* la pista "¡tócame!" se retira para siempre */
  }

  /* ---------- medición: márgenes CSS = poses de reposo ---------- */
  function medir() {
    const ids = ["rb-antena", "rb-cabeza", "rb-oreja-i", "rb-oreja-d", "rb-ojo-i", "rb-ojo-d",
      "rb-boca", "rb-cuerpo", "rb-pecho", "rb-brazo-i", "rb-brazo-d", "rb-base", "rb-e1", "rb-e2", "rb-e3"];
    const escala = parseFloat(getComputedStyle(escena).getPropertyValue("--rb-s")) || 1;
    const caja = robot.getBoundingClientRect();
    ROOM.x = Math.max(90, caja.width / escala / 2 - 8);
    ROOM.top = -(caja.height / escala) * TOP_PCT + 8;
    ROOM.bottom = (caja.height / escala) * (1 - TOP_PCT) - 8;
    piezas = ids.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const w = r.width / escala || parseFloat(cs.width) || 10;
      const h = r.height / escala || parseFloat(cs.height) || 10;
      const mx = parseFloat(cs.marginLeft) || 0;
      const my = parseFloat(cs.marginTop) || 0;
      const hd = Math.hypot(w, h) / 2; /* media diagonal: ninguna esquina sale de la caja */
      return {
        el, w, h, hd,
        minX: -ROOM.x - (mx + w / 2) + hd,
        maxX: ROOM.x - (mx + w / 2) - hd,
        minY: ROOM.top - (my + h / 2) + hd,
        maxY: ROOM.bottom - (my + h / 2) - hd,
        x: 0, y: 0, vx: 0, vy: 0, rot: 0, va: 0,
        electron: id.startsWith("rb-e"),
      };
    }).filter(Boolean);
  }

  const clampPieza = (p) => {
    p.x = Math.min(p.maxX, Math.max(p.minX, p.x));
    p.y = Math.min(p.maxY, Math.max(p.minY, p.y));
  };

  /* ---------- explosión y reensamblaje ---------- */
  function explotar() {
    if (S.modo !== "reposo" || RM || !piezas.length) return;
    if (document.hidden || !S.viendo) return;
    despertar();
    S.modo = "boom";
    boomInicio = performance.now();
    robot.classList.add("ocupado");
    escena.classList.remove("en-casa", "feliz");
    const fuerza = Math.min(1, Math.max(0.55, ROOM.x / 300));
    expresar("sorpresa");
    frase("¡Me dividí en piezas!", true);
    for (const p of piezas) {
      const ang = azar(0, Math.PI * 2);
      const vel = azar(240, 520) * fuerza;
      p.vx = Math.cos(ang) * vel;
      p.vy = Math.sin(ang) * vel - azar(190, 410) * fuerza; /* sesgo hacia arriba */
      p.va = azar(-390, 390);
      clampPieza(p);
      pinta(p);
    }
  }

  function ensamblado() {
    for (const p of piezas) { p.el.style.transform = ""; p.x = p.y = p.vx = p.vy = p.rot = p.va = 0; }
    robot.classList.remove("ocupado");
    escena.classList.add("en-casa");
    S.modo = "reposo";
    expresar("feliz");
    escena.classList.add("feliz");
    frase(FRASES[Math.floor(Math.random() * FRASES.length)], true);
    setTimeout(() => escena.classList.remove("feliz"), 650);
    setTimeout(() => { if (S.modo === "reposo") expresar("neutra"); }, 1800);
    programarAuto();
  }

  function programarAuto() {
    clearTimeout(proximaAuto);
    /* Antes saltaba cada 6,5-9,5 s: el robot estaba desarmado más tiempo
       que en casa y casi nunca se le veía la cara. Ahora la primera vez
       espera 22 s y luego entre 15 y 26 s, salvo que lo toquen. */
    const espera = ultimoTocazo
      ? azar(9000, 16000)
      : azar(15000, 26000);
    proximaAuto = setTimeout(() => {
      if (S.modo === "reposo" && !document.hidden && S.viendo && !S.dormido) explotar();
      else programarAuto();
    }, espera);
  }

  /* ---------- física ---------- */
  let ultimoPaso = 0;
  function pasoFisica(ahora) {
    const dt = Math.min(0.032, (ahora - ultimoPaso) / 1000 || 0.016);
    ultimoPaso = ahora;
    if (S.modo === "boom") {
      const t = (ahora - boomInicio) / 1000;
      for (const p of piezas) {
        const g = p.electron ? 380 : 1450;
        p.vy += g * dt;
        if (p.electron) { p.vx *= 0.99; p.vy *= 0.99; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.va * dt;
        /* paredes propias de esta pieza */
        if (p.x < p.minX) { p.x = p.minX; p.vx = -p.vx * 0.68; p.va *= 0.85; }
        if (p.x > p.maxX) { p.x = p.maxX; p.vx = -p.vx * 0.68; p.va *= 0.85; }
        if (p.y < p.minY) { p.y = p.minY; p.vy = -p.vy * 0.66; }
        if (p.y > p.maxY) { p.y = p.maxY; p.vy = -p.vy * 0.7; p.vx *= 0.85; p.va *= 0.85; }
        pinta(p);
      }
      if (t > 1.05) S.modo = "reunion";
    } else if (S.modo === "reunion") {
      let listas = 0;
      for (const p of piezas) {
        const ax = (0 - p.x) * 62 - p.vx * 8.5;
        const ay = (0 - p.y) * 62 - p.vy * 8.5;
        p.vx += ax * dt; p.vy += ay * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.va *= 0.86; p.rot += p.va * dt;
        clampPieza(p);
        pinta(p);
        if (Math.hypot(p.x, p.y) < 1.5 && Math.hypot(p.vx, p.vy) < 15) listas++;
      }
      if (listas === piezas.length) ensamblado();
    }
    fraseAzul();
  }

  function pinta(p) {
    p.el.style.transform = "translate(" + p.x.toFixed(2) + "px," + p.y.toFixed(2) + "px) rotate(" + p.rot.toFixed(1) + "deg)";
  }

  /* ---------- entrada: las piezas llegan y se arman ---------- */
  function entrada() {
    escena.classList.add("antena-dibuja");
    if (RM) {
      S.modo = "reposo";
      expresar("neutra");
      setTimeout(() => frase("¡Hola! Soy Redito", true), 900);
      return;
    }
    medir();
    S.modo = "reunion";
    robot.classList.add("ocupado");
    escena.classList.remove("en-casa");
    for (const p of piezas) {
      const ang = azar(0, Math.PI * 2);
      const dis = azar(0.5, 1) * Math.min(ROOM.x, -ROOM.top + ROOM.bottom) * 0.6;
      p.x = Math.cos(ang) * dis;
      p.y = Math.sin(ang) * dis * 0.7;
      p.rot = azar(-70, 70);
      p.va = azar(-120, 120);
      p.vx = -p.x * 4; p.vy = -p.y * 4;
      clampPieza(p);
      pinta(p);
    }
  }

  /* ---------- mirada ----------
     Antes solo respondía en modo "reposo" y con un recorrido de 3,6 px:
     el robot pasaba casi todo el tiempo desarmado y el movimiento era
     imperceptible. Ahora:
       · la mirada sigue en cualquier estado salvo dormido/reducido,
         y durante la reunión solo mueve las pupilas (la cabeza la
         lleva la física, no se pelean);
       · el objetivo se alcanza con suavizado (lerp) en el bucle, no de
         un salto, para que el ojo se deslice como un ojo de verdad;
       · el recorrido llega hasta el borde del iris y se agranda un
         poco cuando el cursor está cerca. */
  const pupilas = [document.querySelectorAll("#rb-ojo-i .rb-pupila"), document.querySelectorAll("#rb-ojo-d .rb-pupila")];
  const brillos = document.querySelectorAll(".rb-pupila--brillo");
  const cabeza = document.getElementById("rb-cabeza");
  const VUELO = 5.4;            /* px de recorrido máximo dentro del iris */
  const ALCANCE = 260;          /* distancia a la que la mirada llega al tope */
  const mira = { ax: 0, ay: 0, x: 0, y: 0, cerca: 0 };

  function anclaOjos() {
    const caja = robot.getBoundingClientRect();
    const escala = parseFloat(getComputedStyle(escena).getPropertyValue("--rb-s")) || 1;
    return {
      cx: caja.left + caja.width / 2,
      cy: caja.top + caja.height * TOP_PCT + ANCLA_MIRADA_Y * escala,
    };
  }

  /* fija el objetivo de la mirada (en píxeles de pantalla) */
  function mirar(mx, my) {
    if (RM || document.hidden) return;
    mira.cerca = 0;
    if (S.modo === "boom") return; /* las piezas van por su cuenta */
    const { cx, cy } = anclaOjos();
    const dx = mx - cx, dy = my - cy;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / ALCANCE);
    mira.ax = (dx / d) * VUELO * k;
    mira.ay = (dy / d) * VUELO * k;
    if (d < 220) mira.cerca = 1 - d / 220; /* de cerca, la pupila se dilata */
    /* la cabeza solo gira cuando está en casa: si la está
       empujando la física, no hay que pelearse con su transform */
    if (cabeza && S.modo === "reposo") {
      cabeza.style.transform = "translate(" + ((dx / d) * 4.5 * k).toFixed(2) + "px," +
        ((dy / d) * 3.2 * k).toFixed(2) + "px) rotate(" + ((dx / d) * 5.5 * k).toFixed(2) + "deg)";
    }
  }

  /* el seguimiento suave: se corre en el bucle, no en cada evento */
  function miraSuave() {
    if (RM) return;
    if (S.modo === "boom") return;
    mira.x += (mira.ax - mira.x) * 0.18;
    mira.y += (mira.ay - mira.y) * 0.18;
    const px = mira.x.toFixed(2) + "px", py = mira.y.toFixed(2) + "px";
    for (const grupo of pupilas) grupo.forEach((el) => {
      el.style.setProperty("--px", px);
      el.style.setProperty("--py", py);
    });
    /* los brillos se desplazan un poco en contra: da profundidad al ojo */
    const bx = (-mira.x * 0.32).toFixed(2) + "px", by = (-mira.y * 0.32).toFixed(2) + "px";
    brillos.forEach((el) => {
      el.style.setProperty("--px", bx);
      el.style.setProperty("--py", by);
    });
    /* dilata apenas la pupila cuando el cursor está cerca */
    const esc = 1 + mira.cerca * 0.16;
    for (const grupo of pupilas) grupo.forEach((el) => {
      if (el.classList.contains("rb-pupila--brillo")) return;
      el.style.setProperty("--pe", esc.toFixed(3));
    });
  }

  /* donde no hay cursor (celular/tableta), el robot va mirando cosas
     por su cuenta; en pantallas con cursor, responde al dedo también */
  if (!RM) {
    setInterval(() => {
      if (document.hidden || !S.viendo) return;
      if (S.modo === "boom") return;
      if (TACTIL || Date.now() - ultimoPuntero > 2600) {
        const caja = robot.getBoundingClientRect();
        mirar(caja.left + caja.width * azar(0.18, 0.82), caja.top + caja.height * azar(0.08, 0.52));
      }
    }, 1500);
    addEventListener("pointermove", (e) => {
      ultimoPuntero = Date.now();
      mirar(e.clientX, e.clientY);
    }, { passive: true });
  }

  /* ---------- dormido tras un rato sin cariño ---------- */
  function despertar() {
    if (S.dormido) {
      S.dormido = false;
      escena.classList.remove("rb-dormido");
      if (S.modo === "reposo") expresar("neutra");
    }
    clearTimeout(temporizadorDormir);
    if (!RM) temporizadorDormir = setTimeout(() => {
      if (S.modo === "reposo" && !document.hidden) { S.dormido = true; expresar("dormida"); }
    }, 30000);
  }
  ["pointerdown", "pointermove", "keydown", "touchstart"].forEach((ev) =>
    robot.addEventListener(ev, despertar, { passive: true })
  );

  /* ---------- tocar ---------- */
  function tocar() {
    conocer();
    despertar();
    const ahora = Date.now();
    if (ahora - ultimoTocazo < 500) return;
    ultimoTocazo = ahora;
    if (RM) { frase("¡Eso fue divertido!", true); return; }
    if (S.modo === "reposo") explotar();
  }
  robot.addEventListener("click", tocar);
  robot.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocar(); }
  });
  if (!TACTIL && !RM) {
    robot.addEventListener("pointerenter", () => {
      if (S.modo === "reposo" && !S.dormido) frase(FRASES[Math.floor(Math.random() * FRASES.length)]);
    });
  }

  /* ---------- bucle único + pausas ---------- */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { S.viendo = es[0].isIntersecting; }, { threshold: 0.05 }).observe(robot);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { ultimoPaso = performance.now(); despertar(); } });

  function bucle(t) {
    requestAnimationFrame(bucle);
    if (!S.viendo || document.hidden) { ultimoPaso = t; return; }
    if (S.modo === "boom" || S.modo === "reunion") { pasoFisica(t); return; }
    miraSuave();
    fraseAzul();
  }

  /* ---------- arranque ---------- */
  entrada();
  requestAnimationFrame((t) => { ultimoPaso = t; requestAnimationFrame(bucle); });
  setTimeout(programarAuto, 22000); /* primera auto-explosión de presentación */
})();
