/* ============================================================
   main.js — arranque, gate de FX, reloj y utilidades base
   Patrón 7.42: clase .js en <html> (gate), safe() que degrada
   a no-op, y preferencia de animaciones respetada siempre.
   ============================================================ */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var raiz = window.CONTENIDO || {};

  /* --- Preferencia de movimiento (nativa del sistema) --- */
  window.FX = {
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    activas: function () {
      return !this.reduced;
    },
    /* safe(): ejecuta fn solo si las animaciones están activas */
    safe: function (fn) {
      if (this.activas() && typeof fn === 'function') { return fn(); }
      return null;
    }
  };

  /* --- Escenas de canvas registrables: se detienen si FX se apaga --- */
  window.ESCENAS = (function () {
    var escenas = [];
    return {
      registrar: function (escena) { escenas.push(escena); return escena; },
      detenerTodas: function () {
        escenas.forEach(function (e) { if (typeof e.detener === 'function') { e.detener(); } });
      },
      reanudarTodas: function () {
        escenas.forEach(function (e) { if (typeof e.reanudar === 'function') { e.reanudar(); } });
      }
    };
  })();

  /* --- Bloqueo de scroll honesto para iOS --- */
  window.Bloqueo = (function () {
    var esIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var y = 0, bloqueado = false;
    function sincronizar(quiere) {
      if (quiere === bloqueado) { return; }
      bloqueado = quiere;
      if (!esIOS) { return; } /* fuera de iOS basta el overflow hidden del HTML */
      if (bloqueado) {
        y = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = (-y) + 'px';
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
      } else {
        var estaba = y;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        /* volver al punto exacto, sin animación */
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, estaba);
        document.documentElement.style.scrollBehavior = '';
      }
    }
    return { sincronizar: sincronizar };
  })();

  /* --- Año del pie --- */
  var anio = document.getElementById('pieAnio');
  if (anio) { anio.textContent = String(new Date().getFullYear()); }

  /* --- Reloj vivo de Tunja (America/Bogota) --- */
  var reloj = document.getElementById('pieReloj');
  function tic() {
    if (!reloj) { return; }
    try {
      var ahora = new Date();
      var txt = new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'America/Bogota'
      }).format(ahora);
      reloj.textContent = 'Tunja · ' + txt;
    } catch (e) {
      reloj.textContent = 'Tunja · Colombia';
    }
  }
  if (reloj) {
    tic();
    setInterval(tic, 1000);
  }

  /* --- Huevo de pascua: escribe "ciencia" en cualquier parte --- */
  var buffer = '';
  document.addEventListener('keydown', function (ev) {
    if (ev.key && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      buffer = (buffer + ev.key.toLowerCase()).slice(-7);
      if (buffer === 'ciencia') {
        buffer = '';
        if (window.Interactions && typeof window.Interactions.estallido === 'function') {
          window.Interactions.estallido();
        }
      }
    }
  });
})();
