/* ============================================================
   COOKIES V6 — banner de consentimiento real
   · Guarda la decisión en localStorage (frcc-consent)
   · "Esenciales" siempre · "Mapa de Google" es opcional:
     el mapa de la sede SOLO se carga si aceptas esa cookie.
   · Sin terceros: todo corre en tu navegador.
   ============================================================ */
(() => {
  "use strict";
  const CLAVE = "frcc-consent";
  const LM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { return null; }
  }
  function guardar(c) {
    try { localStorage.setItem(CLAVE, JSON.stringify({ ...c, fecha: new Date().toISOString() })); } catch (e) {}
    document.dispatchEvent(new CustomEvent("frcc:consent", { detail: c }));
  }

  /* avisa el consentimiento actual a quien escuche (mapa, etc.) */
  window.frccConsent = leer;

  function construir() {
    const banner = document.createElement("div");
    banner.className = "cookies" + (LM ? " cookies--sin-anim" : "");
    banner.id = "cookies-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Aviso de cookies");
    banner.setAttribute("aria-live", "polite");
    banner.innerHTML = `
      <div class="cookies__tarjeta">
        <span class="cookies__icono" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01M15.5 15.5v.01M8.5 14.5v.01M12 12v.01"/></svg>
        </span>
        <div class="cookies__txt">
          <b>Tu privacidad nos importa</b>
          <p>Usamos cookies esenciales para que el sitio funcione, y una opcional para mostrar el mapa de Google de nuestra sede. Puedes decidir libremente.</p>
        </div>
        <div class="cookies__acciones">
          <button type="button" class="btn btn--mini" data-c="todo">Aceptar todo</button>
          <button type="button" class="btn btn--mini btn--mini-suave" data-c="esenciales">Solo esenciales</button>
          <button type="button" class="cookies__config" data-c="config">Configurar</button>
        </div>
      </div>`;

    const panel = document.createElement("div");
    panel.className = "cookies-panel";
    panel.id = "cookies-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Configuración de cookies");
    panel.innerHTML = `
      <div class="cookies-panel__caja">
        <h3>Cookies que usamos</h3>
        <div class="cookie-op">
          <div><b>Esenciales</b><p>Necesarias para la navegación, el menú y tus preferencias. Siempre activas.</p></div>
          <span class="interruptor activo" aria-hidden="true"><i></i></span>
        </div>
        <div class="cookie-op">
          <div><b>Mapa de Google (opcional)</b><p>Permite cargar el mapa con la ubicación de la sede. Google puede instalar sus propias cookies si la activas.</p></div>
          <button type="button" class="interruptor" id="ck-mapa" role="switch" aria-checked="false" aria-label="Cookies del mapa de Google"><i></i></button>
        </div>
        <div class="cookies-panel__pie">
          <button type="button" class="btn btn--mini btn--mini-suave" data-c="esenciales">Guardar</button>
          <button type="button" class="btn btn--mini" data-c="todo">Aceptar todo</button>
        </div>
        <p class="cookies-panel__nota">Puedes cambiar tu decisión cuando quieras desde el enlace «Cookies» del pie de página.</p>
      </div>`;

    document.body.append(banner, panel);

    /* ya hay decisión? el banner no se vuelve a mostrar (solo queda el
       panel, reabrible desde el enlace «Cookies» del pie) */
    const previo = leer();
    if (previo && previo.esenciales) banner.remove();

    let mapaOk = false;
    const abrirPanel = () => {
      mapaOk = !!(leer() && leer().mapa);
      const sw = panel.querySelector("#ck-mapa");
      sw.classList.toggle("activo", mapaOk);
      sw.setAttribute("aria-checked", String(mapaOk));
      panel.classList.add("abierto");
    };
    const cerrarTodo = () => { banner.remove(); panel.classList.remove("abierto"); };

    banner.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]");
      if (!b) return;
      const c = b.dataset.c;
      if (c === "todo") { guardar({ esenciales: true, mapa: true }); cerrarTodo(); }
      else if (c === "esenciales") { guardar({ esenciales: true, mapa: false }); cerrarTodo(); }
      else abrirPanel();
    });
    panel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]");
      const sw = e.target.closest("#ck-mapa");
      if (sw) {
        mapaOk = !mapaOk;
        sw.classList.toggle("activo", mapaOk);
        sw.setAttribute("aria-checked", String(mapaOk));
        return;
      }
      if (!b) return;
      guardar({ esenciales: true, mapa: mapaOk });
      cerrarTodo();
    });
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") panel.classList.remove("abierto"); });

    /* reabrir desde el pie o por petición de otra parte del sitio */
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-abrir-cookies]")) abrirPanel();
    });
    document.addEventListener("frcc:abrir-cookies", abrirPanel);

    /* decidido → avisa (por si el mapa espera) */
    if (previo) document.dispatchEvent(new CustomEvent("frcc:consent", { detail: previo }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", construir);
  else construir();
})();
