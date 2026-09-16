/* ============================================================
   forms.js — formulario honesto: valida en el navegador y
   compone el mensaje para abrir WhatsApp. Sin backend fingido.
   ============================================================ */
(function () {
  'use strict';

  var form = document.getElementById('formulario');
  if (!form) { return; }

  var estado = document.getElementById('formEstado');
  var WHATSAPP = 'https://wa.me/573219359764';

  function decir(txt, tipo) {
    if (!estado) { return; }
    estado.textContent = txt;
    estado.className = 'form-estado mono' + (tipo ? ' ' + tipo : '');
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nombre = document.getElementById('fNombre');
    var correo = document.getElementById('fCorreo');
    var mensaje = document.getElementById('fMensaje');

    var ok = true;
    [nombre, mensaje].forEach(function (campo) {
      var vacio = !campo.value.trim();
      campo.classList.toggle('error', vacio);
      if (vacio) { ok = false; }
    });
    if (correo.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim())) {
      correo.classList.add('error');
      ok = false;
    } else {
      correo.classList.remove('error');
    }

    if (!ok) {
      decir('Revisa los campos marcados.', 'mal');
      return;
    }

    var texto = 'Hola, soy ' + nombre.value.trim() + '. ' + mensaje.value.trim();
    if (correo.value.trim()) { texto += ' (correo: ' + correo.value.trim() + ')'; }
    var url = WHATSAPP + '?text=' + encodeURIComponent(texto);

    decir('Abriendo WhatsApp con tu mensaje listo para revisar y enviar…', 'ok');
    window.open(url, '_blank', 'noopener');
  });

  form.addEventListener('input', function (ev) {
    if (ev.target.classList) { ev.target.classList.remove('error'); }
  });
})();
