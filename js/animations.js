/* ============================================================
   animations.js — revelados por IntersectionObserver con
   retrasos escalonados (CSS hace el movimiento, IO decide el
   cuándo). Failsafe: nada queda invisible por un error.
   v4: expone window.Revelar para que el contenido creado por
   JS (fichas, repisas, mosaico, ejes) entre en la misma coreografía.
   ============================================================ */
(function () {
  'use strict';

  var objetivo = Array.prototype.slice.call(document.querySelectorAll('[data-rev]'));
  var io = null;

  function avisar(el) {
    if (typeof el.__alRevelar === 'function') { var f = el.__alRevelar; el.__alRevelar = null; f(); }
  }

  /* Failsafe 4 s: si algo no se reveló, se hace visible (7.42) */
  window.setTimeout(function () {
    objetivo.forEach(function (el) { el.classList.add('rev-visible'); avisar(el); });
  }, 4000);

  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('rev-visible');
          avisar(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    objetivo.forEach(function (el) { io.observe(el); });
  } else {
    objetivo.forEach(function (el) { el.classList.add('rev-visible'); avisar(el); });
  }

  /* API para contenido dinámico: entra en la misma coreografía.
     alRevelar (opcional) se ejecuta una vez, cuando el elemento aparece. */
  window.Revelar = {
    observar: function (el, alRevelar) {
      if (!el) { return; }
      objetivo.push(el);
      if (typeof alRevelar === 'function') { el.__alRevelar = alRevelar; }
      if (io) { io.observe(el); } else { el.classList.add('rev-visible'); avisar(el); }
    }
  };
})();
