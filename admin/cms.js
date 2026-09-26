/* Cargador del CMS de la Fundación (admin/cms.html).
   Revisa admin/config.yml: si todavía tiene los valores PEGA_AQUI muestra
   los pasos de activación; si está lista, carga el editor (Sveltia CMS).
   Archivo externo para no chocar con la Content-Security-Policy del servidor. */
(async function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const muestra = (id) => { if ($(id)) $(id).hidden = false; const e = $("espera"); if (e) e.hidden = true; };
  try {
    const r = await fetch("config.yml", { cache: "no-store" });
    const t = await r.text();
    const valor = (clave) => {
      const m = t.match(new RegExp("^\\s*" + clave + ":\\s*(\\S+)", "m"));
      return m ? m[1] : "";
    };
    const app = valor("app_id");
    const base = valor("base_url");
    const listo = app && base && !/PEGA_AQUI/.test(app) && !/PEGA_AQUI/.test(base);
    if (!listo) { muestra("instrucciones"); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js";
    s.onload = () => { const e = $("espera"); if (e) e.hidden = true; };
    s.onerror = () => muestra("fallo");
    document.head.appendChild(s);
  } catch (e) {
    muestra("fallo");
  }
})();
