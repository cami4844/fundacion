/* ============================================================
   interactions.js — escenas canvas (hero, ejes), mapa real de
   Colombia, fichas con filtros y modal, estantería, mosaico con
   luzbox y huevo de pascua. Toda escena DUERME fuera de vista
   (IntersectionObserver + visibilitychange) — sin rAF perpetuo.
   ============================================================ */
(function () {
  'use strict';

  var C = window.CONTENIDO || {};
  var reducido = !!(window.FX && !window.FX.activas());

  /* ---------- Cascada: los elementos creados por JS entran escalonados.
     El retraso inline solo vive durante la entrada; luego se retira para
     que los hovers respondan al instante. ---------- */
  function cascada(el, i, paso, conMascara) {
    if (!el) { return; }
    var retraso = Math.min(i * (paso || 70), 420);
    el.setAttribute('data-rev', '');
    if (conMascara) { el.setAttribute('data-rev-mask', ''); }
    el.style.transitionDelay = retraso + 'ms';
    window.Revelar.observar(el, function () {
      window.setTimeout(function () { el.style.transitionDelay = ''; }, retraso + 750);
    });
  }

  /* ---------- Motor de escena: rAF solo visible ---------- */
  function escena(lienzo, dibujar) {
    var ctx = lienzo.getContext('2d');
    var visible = false, raf = 0, t = 0, parado = false;
    function paso() {
      if (!visible || parado) { return; }
      t += 1;
      dibujar(ctx, lienzo, t);
      raf = requestAnimationFrame(paso);
    }
    function encender() { if (!visible) { visible = true; if (!raf) { raf = requestAnimationFrame(paso); } } }
    function apagar() { visible = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function tamano() {
      var r = lienzo.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      lienzo.width = Math.max(1, Math.round(r.width * dpr));
      lienzo.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    tamano();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (e.isIntersecting && !reducido) { tamano(); encender(); }
          else { apagar(); }
        });
      }, { threshold: 0.05 }).observe(lienzo);
    } else { encender(); }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { parado = true; apagar(); }
      else { parado = false; }
    });
    window.addEventListener('resize', function () { tamano(); });
    return {
      detener: function () { parado = true; apagar(); },
      reanudar: function () { parado = false; encender(); },
      estado: function () { return { visible: visible, parado: parado, raf: raf }; }
    };
  }

  /* ---------- HERO: constelación sobria ---------- */
  var puntero = { x: -9999, y: -9999 };
  var cometas = [];
  function heroRed() {
    var lienzo = document.getElementById('lienzoRed');
    if (!lienzo) { return; }
    var nodos = [], w = 0, h = 0, N;
    function poblar() {
      var r = lienzo.getBoundingClientRect();
      w = r.width; h = r.height;
      N = Math.max(26, Math.min(56, Math.round(w * h / 26000)));
      nodos = [];
      for (var i = 0; i < N; i++) {
        nodos.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16,
          r: Math.random() * 1.3 + 0.6
        });
      }
    }
    poblar();
    window.addEventListener('resize', poblar);
    lienzo.parentElement.addEventListener('pointermove', function (ev) {
      var r = lienzo.getBoundingClientRect();
      puntero.x = ev.clientX - r.left; puntero.y = ev.clientY - r.top;
    }, { passive: true });
    lienzo.parentElement.addEventListener('pointerleave', function () { puntero.x = -9999; puntero.y = -9999; });

    var esc = escena(lienzo, function (ctx, cv, t) {
      var r = cv.getBoundingClientRect();
      if (Math.abs(r.width - w) > 2 || Math.abs(r.height - h) > 2) { poblar(); }
      ctx.clearRect(0, 0, w, h);
      var i, j, n;
      for (i = 0; i < nodos.length; i++) {
        n = nodos[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) { n.vx *= -1; }
        if (n.y < 0 || n.y > h) { n.vy *= -1; }
        var dx = puntero.x - n.x, dy = puntero.y - n.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140 && d2 > 1) { n.x -= dx * 0.0012; n.y -= dy * 0.0012; }
      }
      ctx.lineWidth = 0.55;
      for (i = 0; i < nodos.length; i++) {
        for (j = i + 1; j < nodos.length; j++) {
          var a = nodos[i], b = nodos[j];
          var dd = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
          if (dd < 130 * 130) {
            ctx.strokeStyle = 'rgba(120,160,205,' + (0.34 * (1 - dd / 16900)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < nodos.length; i++) {
        n = nodos[i];
        ctx.fillStyle = 'rgba(196,214,235,0.8)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.fill();
      }
      /* Cometas ocasionales */
      if (t % 420 === 0 && cometas.length < 2) {
        cometas.push({ x: Math.random() * w, y: -10, vx: 0.7 + Math.random(), vy: 1.1 + Math.random() * 0.6, vida: 130 });
      }
      for (i = cometas.length - 1; i >= 0; i--) {
        var c = cometas[i];
        c.x += c.vx; c.y += c.vy; c.vida -= 1;
        ctx.strokeStyle = 'rgba(62,193,190,' + Math.max(0, c.vida / 130).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - c.vx * 12, c.y - c.vy * 12); ctx.stroke();
        if (c.vida <= 0 || c.y > h + 20) { cometas.splice(i, 1); }
      }
    });
    window.ESCENAS.registrar(esc);

    /* Estallido del huevo de pascua */
    window.Interactions = window.Interactions || {};
    window.Interactions.estallido = function () {
      for (var k = 0; k < 7; k++) {
        cometas.push({ x: w * Math.random(), y: h * 0.3 * Math.random(), vx: (Math.random() - 0.5) * 2.4, vy: 1.5 + Math.random(), vida: 150 });
      }
    };
  }

  /* ---------- EJES: acordeón con animación firma por eje ---------- */
  var FIRMAS = {
    red: function (ctx, cv, t) {
      var w = cv.clientWidth, h = cv.clientHeight, i, j;
      var pts = [[0.12, 0.5], [0.3, 0.25], [0.3, 0.75], [0.5, 0.5], [0.7, 0.25], [0.7, 0.75], [0.88, 0.5]];
      var fase = Math.min(1, (t % 240) / 240);
      ctx.clearRect(0, 0, w, h);
      var enlaces = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]];
      ctx.lineWidth = 1;
      for (i = 0; i < enlaces.length; i++) {
        var porc = Math.max(0, Math.min(1, fase * enlaces.length - i));
        if (porc <= 0) { continue; }
        var a = pts[enlaces[i][0]], b = pts[enlaces[i][1]];
        ctx.strokeStyle = 'rgba(21,112,184,0.55)';
        ctx.beginPath();
        ctx.moveTo(a[0] * w, a[1] * h);
        ctx.lineTo(a[0] * w + (b[0] - a[0]) * w * porc, a[1] * h + (b[1] - a[1]) * h * porc);
        ctx.stroke();
      }
      for (i = 0; i < pts.length; i++) {
        ctx.fillStyle = 'rgba(2,156,154,0.9)';
        ctx.beginPath(); ctx.arc(pts[i][0] * w, pts[i][1] * h, 2.6, 0, 6.2832); ctx.fill();
      }
    },
    investigacion: function (ctx, cv, t) {
      var w = cv.clientWidth, h = cv.clientHeight;
      ctx.clearRect(0, 0, w, h);
      var fase = (t % 200) / 200;
      ctx.strokeStyle = 'rgba(21,112,184,0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      var pasos = 64;
      for (var i = 0; i <= pasos * Math.min(1, fase * 1.35); i++) {
        var x = (i / pasos) * w;
        var y = h / 2 + Math.sin((x / w) * Math.PI * 2.2) * h * 0.26;
        if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
      if (fase < 0.72) {
        ctx.fillStyle = 'rgba(2,156,154,0.95)';
        ctx.beginPath(); ctx.arc(w * Math.min(1, fase * 1.35), h / 2 + Math.sin(fase * Math.PI * 2.2 * 1.35) * h * 0.26, 3, 0, 6.2832); ctx.fill();
      }
    },
    desarrollo: function (ctx, cv, t) {
      var w = cv.clientWidth, h = cv.clientHeight;
      ctx.clearRect(0, 0, w, h);
      var fase = Math.min(1, (t % 260) / 260);
      ctx.strokeStyle = 'rgba(124,178,54,0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.92); ctx.lineTo(w * 0.5, h * 0.92 - (h * 0.62) * fase); ctx.stroke();
      var ramas = [[-0.16, 0.34], [0.16, 0.3], [-0.09, 0.55], [0.1, 0.58]];
      for (var i = 0; i < ramas.length; i++) {
        var p = Math.max(0, Math.min(1, fase * ramas.length - i));
        if (p <= 0) { continue; }
        var r = ramas[i];
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.92 - h * r[1]);
        ctx.lineTo(w * (0.5 + r[0] * p), h * 0.92 - h * (r[1] + 0.13 * p));
        ctx.stroke();
      }
      if (fase >= 1) { ctx.fillStyle = 'rgba(2,156,154,0.9)'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.28, 3, 0, 6.2832); ctx.fill(); }
    },
    derechos: function (ctx, cv, t) {
      var w = cv.clientWidth, h = cv.clientHeight;
      ctx.clearRect(0, 0, w, h);
      var pulso = 0.5 + 0.5 * Math.sin(t / 40);
      ctx.lineWidth = 1.3;
      for (var i = 0; i < 3; i++) {
        ctx.strokeStyle = 'rgba(62,193,190,' + (0.55 - i * 0.15).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.92, (12 + i * 13) + pulso * 3, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(175,192,210,0.85)';
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.92, 3.4, 0, 6.2832); ctx.fill();
    },
    territorio: function (ctx, cv, t) {
      var w = cv.clientWidth, h = cv.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(175,192,210,0.4)';
      for (var i = 0; i < 4; i++) {
        ctx.beginPath();
        for (var x = 0; x <= w; x += 8) {
          var y = h * (0.3 + i * 0.18) + Math.sin(x / w * Math.PI * 2 + i) * h * 0.05;
          if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
      }
      var fase = (t % 220) / 220;
      var nx = w * 0.32, ny = h * 0.44;
      ctx.strokeStyle = 'rgba(2,156,154,0.8)';
      ctx.beginPath();
      var pasos = 70;
      for (var k = 0; k <= pasos * fase; k++) {
        var px = (k / pasos) * w;
        var py = h * 0.78 - Math.sin((k / pasos) * Math.PI) * h * 0.3;
        if (k === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
      }
      ctx.stroke();
      if (fase < 0.85) { ctx.fillStyle = 'rgba(62,193,190,0.95)'; ctx.beginPath(); ctx.arc(nx, ny, 2.8, 0, 6.2832); ctx.fill(); }
    }
  };

  function ejesAcordeon() {
    var caja = document.getElementById('acordeon');
    if (!caja || !C.ejes) { return; }
    var flecha = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    C.ejes.forEach(function (eje, i) {
      var item = document.createElement('article');
      item.className = 'eje-item';
      item.setAttribute('data-abierta', 'false');
      item.innerHTML =
        '<button class="eje-boton" type="button" aria-expanded="false" aria-controls="eje-cuerpo-' + i + '">' +
          '<span class="eje-indice mono">0' + (i + 1) + '</span>' +
          '<span class="eje-nombre">' + eje.nombre + '</span>' +
          '<span class="eje-resumen">' + eje.resumen + '</span>' +
          '<span class="eje-flecha">' + flecha + '</span>' +
        '</button>' +
        '<div class="eje-cuerpo" id="eje-cuerpo-' + i + '">' +
          '<div class="eje-cuerpo-int">' +
            '<p class="eje-detalle">' + eje.detalle + '</p>' +
            '<canvas class="eje-lienzo" id="eje-lienzo-' + i + '" aria-hidden="true"></canvas>' +
          '</div>' +
        '</div>';
      caja.appendChild(item);
      cascada(item, i, 60);
    });

    /* Comportamiento: una abierta a la vez, teclado correcto */
    var items = Array.prototype.slice.call(caja.querySelectorAll('.eje-item'));
    var escenas = {};
    items.forEach(function (item, i) {
      var boton = item.querySelector('.eje-boton');
      boton.addEventListener('click', function () {
        var abrir = item.getAttribute('data-abierta') !== 'true';
        items.forEach(function (otro, j) {
          otro.setAttribute('data-abierta', 'false');
          otro.querySelector('.eje-boton').setAttribute('aria-expanded', 'false');
          if (escenas[j]) { escenas[j].detener(); }
        });
        if (abrir) {
          item.setAttribute('data-abierta', 'true');
          boton.setAttribute('aria-expanded', 'true');
          var lienzo = document.getElementById('eje-lienzo-' + i);
          var fn = FIRMAS[C.ejes[i].id];
          if (lienzo && fn && window.FX.activas()) {
            escenas[i] = window.ESCENAS.registrar(escena(lienzo, fn));
          }
        }
      });
    });
  }

  /* ---------- MAPA REAL DE COLOMBIA ---------- */
  function mapaColombia() {
    var svg = document.getElementById('mapaColombia');
    var datos = window.MAPA_COLOMBIA;
    if (!svg || !datos) { return; }
    svg.setAttribute('viewBox', '0 0 ' + datos.viewBox.split(' ')[2] + ' ' + datos.viewBox.split(' ')[3]);
    var NS = 'http://www.w3.org/2000/svg';
    var tooltip = document.createElement('div');
    tooltip.className = 'mapa-tooltip';
    svg.parentElement.appendChild(tooltip);

    Object.keys(datos.departamentos).forEach(function (nombre) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', datos.departamentos[nombre]);
      p.setAttribute('class', 'depto' + (nombre === 'Boyacá' ? ' depto-depto-confirmado' : ''));
      var titulo = document.createElementNS(NS, 'title');
      titulo.textContent = nombre;
      p.appendChild(titulo);
      p.addEventListener('pointerenter', function (ev) {
        tooltip.textContent = nombre;
        var r = svg.parentElement.getBoundingClientRect();
        var x = ev.clientX - r.left, y = ev.clientY - r.top;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
        tooltip.style.opacity = '1';
        /* En toque el cursor nunca "sale": el nombre se retira solo */
        if (ev.pointerType === 'touch') {
          window.clearTimeout(p.__rcc_tt);
          p.__rcc_tt = window.setTimeout(function () { tooltip.style.opacity = '0'; }, 1600);
        }
      });
      p.addEventListener('pointermove', function (ev) {
        var r = svg.parentElement.getBoundingClientRect();
        tooltip.style.left = (ev.clientX - r.left) + 'px';
        tooltip.style.top = (ev.clientY - r.top) + 'px';
      });
      p.addEventListener('pointerleave', function () { tooltip.style.opacity = '0'; });
      svg.appendChild(p);
    });

    /* El mapa se construye al entrar en vista: los departamentos
       aparecen en cascada desde el primero dibujado. Sin JS o con
       movimiento reducido: siempre visible de una sola vez. */
    var marco = svg.closest('.mapa-marco');
    if (marco && !reducido && 'IntersectionObserver' in window) {
      var rutas = svg.querySelectorAll('.depto');
      Array.prototype.forEach.call(rutas, function (p, i) {
        p.style.transitionDelay = (i * 12) + 'ms';
      });
      var listo = false;
      var construir = function () {
        if (listo) { return; }
        listo = true;
        marco.classList.remove('espera');
        marco.classList.add('construido');
        window.setTimeout(function () {
          Array.prototype.forEach.call(rutas, function (p) { p.style.transitionDelay = ''; });
        }, rutas.length * 12 + 800);
      };
      marco.classList.add('espera');
      var ioMapa = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (en.isIntersecting) {
            ioMapa.disconnect();
            window.setTimeout(construir, 150);
          }
        });
      }, { threshold: 0.25 });
      ioMapa.observe(marco);
      window.setTimeout(construir, 3500); /* failsafe */
    }

    /* Nodo de Tunja con pulso discreto */
    var grupo = document.createElementNS(NS, 'g');
    var halo = document.createElementNS(NS, 'circle');
    halo.setAttribute('cx', datos.tunja.x); halo.setAttribute('cy', datos.tunja.y);
    halo.setAttribute('r', '1.1'); halo.setAttribute('fill', 'rgba(2,156,154,0.4)');
    var punto = document.createElementNS(NS, 'circle');
    punto.setAttribute('cx', datos.tunja.x); punto.setAttribute('cy', datos.tunja.y);
    punto.setAttribute('r', '0.65'); punto.setAttribute('fill', '#3EC1BE');
    var tTunja = document.createElementNS(NS, 'title');
    tTunja.textContent = 'Tunja — presencia confirmada';
    grupo.appendChild(halo); grupo.appendChild(punto); grupo.appendChild(tTunja);
    if (!reducido) {
      /* Pulso con SMIL: sin JS, sin rAF, sin coste */
      var animR = document.createElementNS(NS, 'animate');
      animR.setAttribute('attributeName', 'r');
      animR.setAttribute('values', '0.9;2.1;0.9');
      animR.setAttribute('dur', '2.6s');
      animR.setAttribute('repeatCount', 'indefinite');
      halo.appendChild(animR);
      var animO = document.createElementNS(NS, 'animate');
      animO.setAttribute('attributeName', 'opacity');
      animO.setAttribute('values', '0.75;0.15;0.75');
      animO.setAttribute('dur', '2.6s');
      animO.setAttribute('repeatCount', 'indefinite');
      halo.appendChild(animO);
    }
    svg.appendChild(grupo);
  }

  /* ---------- PROGRAMAS: fichas + filtros + modal ---------- */
  function programas() {
    var caja = document.getElementById('fichas');
    var filtros = document.querySelectorAll('.filtro');
    var modal = document.getElementById('modal');
    if (!caja || !C.programas) { return; }
    var nombreEje = {};
    (C.ejes || []).forEach(function (e) { nombreEje[e.id] = e.nombre; });

    C.programas.fichas.forEach(function (f, i) {
      var art = document.createElement('button');
      art.type = 'button';
      art.className = 'ficha';
      art.setAttribute('data-eje', f.eje);
      art.innerHTML =
        '<span class="ficha-etiqueta mono">' + (nombreEje[f.eje] || f.eje) + '</span>' +
        '<h3>' + f.titulo + '</h3>' +
        '<p class="ficha-estado">Por confirmar — contenido oficial pendiente de aprobación.</p>' +
        '<span class="ficha-pie"><span class="ficha-abre">Ver ficha</span>' +
        '<span class="mono ficha-num">0' + (i + 1) + '</span></span>';
      art.addEventListener('click', function () { abrirModal(nombreEje[f.eje] || f.eje, f.titulo, C.programas.nota); });
      caja.appendChild(art);
      cascada(art, i, 70);
    });

    Array.prototype.forEach.call(filtros, function (boton) {
      boton.addEventListener('click', function () {
        Array.prototype.forEach.call(filtros, function (b) { b.classList.remove('activo'); });
        boton.classList.add('activo');
        var cual = boton.getAttribute('data-filtro');
        var visibles = [];
        Array.prototype.forEach.call(caja.children, function (ficha) {
          var mostrar = cual === 'todos' || ficha.getAttribute('data-eje') === cual;
          if (mostrar) { ficha.removeAttribute('oculta'); visibles.push(ficha); }
          else { ficha.setAttribute('oculta', ''); }
        });
        /* Reentrada suave de las fichas visibles tras cada filtro */
        if (window.FX.activas()) {
          visibles.forEach(function (ficha, i) {
            ficha.classList.remove('entra');
            void ficha.offsetWidth; /* reinicia la animación */
            ficha.style.animationDelay = Math.min(i * 45, 300) + 'ms';
            ficha.classList.add('entra');
          });
          window.setTimeout(function () {
            visibles.forEach(function (ficha) {
              ficha.classList.remove('entra');
              ficha.style.animationDelay = '';
            });
          }, 900);
        }
      });
    });

    function abrirModal(etiqueta, titulo, cuerpo) {
      if (!modal) { return; }
      document.getElementById('modalEtiqueta').textContent = etiqueta;
      document.getElementById('modalTitulo').textContent = titulo;
      document.getElementById('modalCuerpo').textContent = cuerpo;
      modal.hidden = false;
      document.documentElement.classList.add('con-menu-abierto');
      if (window.Bloqueo) { window.Bloqueo.sincronizar(true); }
      var cierra = modal.querySelector('.modal-cierra');
      if (cierra) { cierra.focus(); }
    }
    function cerrarModal() {
      modal.hidden = true;
      document.documentElement.classList.remove('con-menu-abierto');
      if (window.Bloqueo) { window.Bloqueo.sincronizar(false); }
    }
    window.Interactions = window.Interactions || {};
    window.Interactions.abrirModal = abrirModal;

    if (modal) {
      modal.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-cerrar-modal]')) { cerrarModal(); }
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && !modal.hidden) { cerrarModal(); }
      });
    }
  }

  /* ---------- CONOCIMIENTO: estantería ---------- */
  function conocimiento() {
    var caja = document.querySelector('.estanteria');
    if (!caja || !C.conocimiento) { return; }
    var iconoLibro = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
    C.conocimiento.categorias.forEach(function (cat, i) {
      var d = document.createElement('article');
      d.className = 'repisa';
      d.innerHTML =
        '<span class="repisa-icono">' + iconoLibro + '</span>' +
        '<h3>' + cat + '</h3>' +
        '<span class="repisa-linea" aria-hidden="true"></span>' +
        '<p class="repisa-estado">Próximamente — por confirmar</p>';
      caja.appendChild(d);
      cascada(d, i, 80);
    });
  }

  /* ---------- GALERÍA: mosaico + luzbox ---------- */
  function galeria() {
    var caja = document.getElementById('mosaico');
    if (!caja || !C.galeria) { return; }
    var luz = document.getElementById('luzbox');
    var img = document.getElementById('luzboxImg');
    var pie = document.getElementById('luzboxPie');
    var actual = 0;
    var visibles = [];

    C.galeria.items.forEach(function (it, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mosaico-item';
      b.setAttribute('data-titulo', it.titulo + ' — ' + it.categoria);
      b.setAttribute('aria-label', 'Ampliar: ' + it.titulo);
      b.innerHTML = '<img src="assets/images/galeria/' + it.archivo + '" alt="' + it.titulo + ' (' + it.categoria + ')" loading="lazy" width="800" height="600">';
      b.addEventListener('click', function () { abrir(i); });
      caja.appendChild(b);
      cascada(b, i, 60, true); /* con máscara: cada pieza se desenfrena */
    });

    function abrir(i) {
      visibles = Array.prototype.slice.call(caja.children).filter(function (c) { return !c.hasAttribute('oculta'); });
      actual = visibles.indexOf(caja.children[i]);
      poner(caja.children[i]);
      luz.hidden = false;
      document.documentElement.classList.add('con-menu-abierto');
      if (window.Bloqueo) { window.Bloqueo.sincronizar(true); }
    }
    function poner(item) {
      var idx = Array.prototype.indexOf.call(caja.children, item);
      var it = C.galeria.items[idx];
      img.src = 'assets/images/galeria/' + it.archivo;
      img.alt = it.titulo + ' (' + it.categoria + ')';
      pie.textContent = it.titulo + ' — ' + it.categoria + ' · ' + (actual + 1) + '/' + visibles.length;
    }
    function mover(delta) {
      if (!visibles.length) { return; }
      actual = (actual + delta + visibles.length) % visibles.length;
      poner(visibles[actual]);
    }
    if (luz) {
      luz.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-cierra-luz]') || ev.target === luz) { cerrar(); }
        if (ev.target.closest('.luzbox-prev')) { mover(-1); }
        if (ev.target.closest('.luzbox-next')) { mover(1); }
      });
      document.addEventListener('keydown', function (ev) {
        if (luz.hidden) { return; }
        if (ev.key === 'Escape') { cerrar(); }
        if (ev.key === 'ArrowLeft') { mover(-1); }
        if (ev.key === 'ArrowRight') { mover(1); }
      });
      /* Gesto de arrastre: en móvil la galería también se recorre con el dedo */
      var toqueX = null, toqueY = null;
      luz.addEventListener('touchstart', function (ev) {
        if (ev.touches.length === 1) {
          toqueX = ev.touches[0].clientX;
          toqueY = ev.touches[0].clientY;
        }
      }, { passive: true });
      luz.addEventListener('touchend', function (ev) {
        if (toqueX === null) { return; }
        var t = ev.changedTouches[0];
        var dx = t.clientX - toqueX, dy = t.clientY - toqueY;
        toqueX = toqueY = null;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          mover(dx < 0 ? 1 : -1);
        }
      }, { passive: true });
      function cerrar() {
        luz.hidden = true;
        document.documentElement.classList.remove('con-menu-abierto');
        if (window.Bloqueo) { window.Bloqueo.sincronizar(false); }
      }
    }
  }

  /* ---------- TERRITORIO: las cifras cobran vida al entrar en vista ---------- */
  function contarDatos() {
    var panel = document.querySelector('.panel-datos');
    if (!panel || reducido || !('IntersectionObserver' in window)) { return; }
    var valores = panel.querySelectorAll('.dato-valor');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        io.disconnect();
        Array.prototype.forEach.call(valores, function (v) {
          var original = v.textContent.trim();
          var m = original.match(/^(\d{1,3}(?:\.\d{3})+|\d{4})/);
          if (!m) { return; } /* coordenadas y textos: quedan intactos */
          var objetivo = parseInt(m[1].replace(/\./g, ''), 10);
          if (!objetivo || objetivo > 99999) { return; }
          var agrupar = m[1].indexOf('.') !== -1;
          var t0 = null, DUR = 1300;
          function paso(ts) {
            if (t0 === null) { t0 = ts; }
            var k = Math.min(1, (ts - t0) / DUR);
            var eased = 1 - Math.pow(1 - k, 3);
            var val = Math.round(objetivo * eased);
            v.textContent = agrupar ? val.toLocaleString('es-CO') : String(val);
            if (k < 1) { window.requestAnimationFrame(paso); }
          }
          window.requestAnimationFrame(paso);
        });
      });
    }, { threshold: 0.4 });
    io.observe(panel);
  }

  /* ---------- Arranque ---------- */
  heroRed();
  ejesAcordeon();
  mapaColombia();
  programas();
  conocimiento();
  galeria();
  contarDatos();
  activarGmaps();

  /* ---------- MAPA DE GOOGLE: despierta a propósito ----------
     En móvil el iframe atrapa los gestos de scroll y la página
     parece rota: un velo lo mantiene dormido hasta el toque. */
  function activarGmaps() {
    var velo = document.getElementById('gmapsVelo');
    if (!velo) { return; }
    function despertar() { velo.classList.add('tocado'); }
    velo.addEventListener('click', despertar);
    velo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); despertar(); }
    });
  }
})();
