/* ============================================================
   fondo.js — FONDO VIVO (v4.0)
   Cinco capas SVG fijas detrás de todo el contenido:
   topografía, malla, red de nodos, partículas y ondas.

   Jerarquía de animación (la base manda):
     FONDO      → movimiento lento y differential
     CONTENIDO  → estable y legible, siempre por delante

   Reacciones (todas sutiles, todas con transform/opacity):
   - mouse     → desplazamiento diferencial por capa (parallax)
   - scroll    → topografía con parallax ligero + malla que respira
   - secciones → la zona clara/oscura hace crossfade del fondo

   Rendimiento: rAF solo mientras hay datos nuevos, listeners
   pasivos, capas dormidas con la pestaña oculta y con
   prefers-reduced-motion. Nunca captura eventos del usuario.
   ============================================================ */
(function () {
  'use strict';

  var raiz = document.getElementById('fondoVivo');
  if (!raiz) { return; }

  var activas = !!(window.FX && window.FX.activas());
  var fino = false;
  try {
    fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (e) { fino = false; }

  var topo = document.getElementById('fondoTopo');
  var malla = document.getElementById('fondoMalla');
  var heroTopo = document.getElementById('heroTopo');

  /* ---------- Zona de la página: el fondo cambia de tono con suavidad ---------- */
  var ZONAS = {
    inicio: 'oscura', nosotros: 'clara', ejes: 'clara', territorio: 'oscura',
    programas: 'clara', conocimiento: 'clara', galeria: 'oscura', contacto: 'oscura'
  };
  function ponerZona(id) {
    if (ZONAS[id]) { document.body.setAttribute('data-zona', ZONAS[id]); }
  }
  ponerZona('inicio');
  if ('IntersectionObserver' in window) {
    var ioZona = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { ponerZona(en.target.id); }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('main section[id]'), function (s) {
      ioZona.observe(s);
    });
  }

  /* Sin animaciones (preferencia del sistema): fondo estático y limpio */
  if (!activas) { return; }

  /* ---------- Mouse: objetivo con inercia corta, rAF solo si hay novedad ---------- */
  var mx = 0, my = 0, tx = 0, ty = 0, rafPendiente = false;
  function programar() {
    if (rafPendiente) { return; }
    rafPendiente = true;
    window.requestAnimationFrame(function () {
      rafPendiente = false;
      tx += (mx - tx) * 0.055;
      ty += (my - ty) * 0.055;
      raiz.style.setProperty('--mx', tx.toFixed(4));
      raiz.style.setProperty('--my', ty.toFixed(4));
      if (Math.abs(mx - tx) > 0.0015 || Math.abs(my - ty) > 0.0015) { programar(); }
    });
  }
  if (fino) {
    window.addEventListener('pointermove', function (ev) {
      mx = (ev.clientX / window.innerWidth) * 2 - 1;
      my = (ev.clientY / window.innerHeight) * 2 - 1;
      programar();
    }, { passive: true });
  }

  /* ---------- Scroll: parallax de topografía + respiración de malla ---------- */
  var ultimoY = window.scrollY, velocidad = 0, reposo = 0;
  function enScroll() {
    var y = window.scrollY;
    var delta = y - ultimoY;
    ultimoY = y;
    velocidad = velocidad * 0.75 + delta * 0.25;

    /* Topografía del fondo: deriva ligera y acotada (nunca deja bordes) */
    if (topo) {
      var deriva = Math.max(-42, Math.min(42, -y * 0.045));
      topo.style.setProperty('--ty-topo', deriva.toFixed(1) + 'px');
    }
    /* Franja topográfica del héroe: solo mientras el héroe está cerca */
    if (heroTopo) {
      var limite = window.innerHeight * 1.4;
      if (y <= limite) {
        heroTopo.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0)';
      }
    }
    /* Malla: micro-escala con la velocidad, vuelve a reposo sola */
    if (malla) {
      var mz = 1 + Math.min(0.014, Math.abs(velocidad) * 0.0016);
      malla.style.setProperty('--mz-malla', mz.toFixed(4));
    }
    window.clearTimeout(reposo);
    reposo = window.setTimeout(function () {
      velocidad = 0;
      if (malla) { malla.style.setProperty('--mz-malla', '1'); }
    }, 300);
  }
  window.addEventListener('scroll', enScroll, { passive: true });

  /* ---------- Pestaña oculta: el fondo se duerme ---------- */
  document.addEventListener('visibilitychange', function () {
    raiz.classList.toggle('dormida', document.hidden);
  });
})();
