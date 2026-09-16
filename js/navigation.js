/* ============================================================
   navigation.js — cabecera elevada, menú móvil, sección activa,
   volver arriba. Clics reales, teclado y aria correctos.
   ============================================================ */
(function () {
  'use strict';

  var cabecera = document.getElementById('cabecera');
  var abre = document.getElementById('navAbre');
  var menu = document.getElementById('menu');
  var arriba = document.getElementById('flotanteArriba');
  var progreso = document.getElementById('progreso');

  /* --- Sombra de cabecera y barra de progreso al hacer scroll ---
     Un solo listener pasivo; el progreso se pinta en rAF. */
  var rafPintar = false;
  function pintarProgreso() {
    rafPintar = false;
    if (!progreso) { return; }
    var total = document.documentElement.scrollHeight - window.innerHeight;
    var p = total > 0 ? Math.min(1, window.scrollY / total) : 0;
    progreso.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }
  function estadoCabecera() {
    if (!cabecera) { return; }
    if (window.scrollY > 8) { cabecera.classList.add('elevada'); }
    else { cabecera.classList.remove('elevada'); }
    if (arriba) {
      if (window.scrollY > 640 && arriba.hidden) {
        arriba.hidden = false;
        arriba.classList.add('visible');
      }
      if (window.scrollY <= 640 && !arriba.hidden) {
        arriba.hidden = true;
        arriba.classList.remove('visible');
      }
    }
    if (!rafPintar) { rafPintar = true; window.requestAnimationFrame(pintarProgreso); }
  }
  window.addEventListener('scroll', estadoCabecera, { passive: true });
  estadoCabecera();
  window.addEventListener('resize', function () {
    if (!rafPintar) { rafPintar = true; window.requestAnimationFrame(pintarProgreso); }
  }, { passive: true });

  /* --- Menú móvil --- */
  function cerrarMenu() {
    if (!menu || !abre) { return; }
    menu.classList.remove('abierto');
    abre.setAttribute('aria-expanded', 'false');
    abre.setAttribute('aria-label', 'Abrir menú');
    document.documentElement.classList.remove('con-menu-abierto');
    if (window.Bloqueo) { window.Bloqueo.sincronizar(false); }
  }
  if (abre && menu) {
    abre.addEventListener('click', function () {
      var abierto = menu.classList.toggle('abierto');
      abre.setAttribute('aria-expanded', String(abierto));
      abre.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
      document.documentElement.classList.toggle('con-menu-abierto', abierto);
      if (window.Bloqueo) { window.Bloqueo.sincronizar(abierto); }
    });
    menu.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) { cerrarMenu(); }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { cerrarMenu(); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) { cerrarMenu(); }
    });
  }

  /* --- Sección activa en el menú --- */
  var enlaces = Array.prototype.slice.call(document.querySelectorAll('.menu a[href^="#"]'));
  var mapaEnlaces = {};
  enlaces.forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    mapaEnlaces[id] = a;
  });
  var secciones = Array.prototype.slice.call(document.querySelectorAll('main section[id], .hero[id]'));
  if ('IntersectionObserver' in window && secciones.length) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        var id = en.target.id;
        enlaces.forEach(function (a) { a.classList.remove('activo'); });
        if (mapaEnlaces[id]) { mapaEnlaces[id].classList.add('activo'); }
      });
    }, { rootMargin: '-42% 0px -52% 0px' });
    secciones.forEach(function (s) { io.observe(s); });
  }

  /* --- Volver arriba --- */
  if (arriba) {
    arriba.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: window.FX && window.FX.activas() ? 'smooth' : 'auto' });
    });
  }

  /* --- Zona de contacto: los flotantes se retiran solos ---
     Al final de la página ya viven los botones de contacto; los
     flotantes en vez de estorbarlos, desaparecen con cortesía. */
  if ('IntersectionObserver' in window) {
    var zonaFinal = document.getElementById('contacto');
    var pie = document.getElementById('pie');
    if (zonaFinal && pie) {
      var ioFin = new IntersectionObserver(function (entradas) {
        var visible = false;
        entradas.forEach(function (en) { if (en.isIntersecting) { visible = true; } });
        document.body.classList.toggle('en-contacto', visible);
      }, { rootMargin: '0px 0px -18% 0px' });
      ioFin.observe(zonaFinal);
      ioFin.observe(pie);
    }
  }
})();
