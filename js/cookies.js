/* ============================================================
   cookies.js — aviso funcional y honesto. Guarda ÚNICAMENTE:
   la decisión sobre este aviso y la preferencia de animaciones.
   Sin rastreo, sin terceros, sin inventar políticas.
   ============================================================ */
(function () {
  'use strict';

  var LLAVE = 'rcc-cookies';
  var caja = document.getElementById('cookies');
  var btnPie = document.getElementById('btnCookies');

  function guardado() {
    try { return JSON.parse(localStorage.getItem(LLAVE) || 'null'); }
    catch (e) { return null; }
  }
  function guardar(decision) {
    try { localStorage.setItem(LLAVE, JSON.stringify({ decision: decision, fecha: new Date().toISOString() })); }
    catch (e) { /* sin almacenamiento: no insistir cada carga */ }
  }

  function mostrar() {
    if (!caja) { return; }
    caja.hidden = false;
    document.body.classList.add('con-aviso');
    window.requestAnimationFrame(function () { caja.classList.add('visible'); });
  }
  function ocultar() {
    if (!caja) { return; }
    caja.classList.remove('visible');
    document.body.classList.remove('con-aviso');
    window.setTimeout(function () { caja.hidden = true; }, 500);
  }

  /* Primera visita: el aviso aparece tras la primera intención de
     scroll o a los 2,5 s — nunca tapa el primer momento del héroe. */
  var ya = guardado();
  if (!ya && caja) {
    var lanzado = false;
    function lanzar() {
      if (lanzado) { return; }
      lanzado = true;
      mostrar();
    }
    window.addEventListener('scroll', lanzar, { once: true, passive: true });
    window.setTimeout(lanzar, 2500);
  }

  if (caja) {
    document.getElementById('ckAceptar').addEventListener('click', function () {
      guardar('aceptada');
      ocultar();
    });
    document.getElementById('ckRechazar').addEventListener('click', function () {
      guardar('rechazada');
      ocultar();
    });
  }

  /* Reabrir preferencias desde el pie */
  if (btnPie) {
    btnPie.addEventListener('click', mostrar);
  }
})();
