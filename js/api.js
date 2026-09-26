/* ============================================================
   API DETECTOR V6 — ¿está el sitio corriendo con servidor?
   · Si abres la web con "node server.js" o en un hosting con
     Node, la API responde y las noticias/mensajes usan la
     BASE DE DATOS real (data/fundacion.db).
   · Si abres la web como archivos planos (GitHub Pages o
     file://), la API no existe y el sitio funciona en modo
     archivo (noticias desde js/data/noticias.js y mensajes
     por WhatsApp). Todo sigue funcionando.
   ============================================================ */
window.API = (async () => {
  "use strict";
  try {
    const ctrl = new AbortController();
    const fin = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch("api/salud", { headers: { Accept: "application/json" }, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(fin);
    if (!r.ok) throw new Error("sin api");
    const j = await r.json();
    if (j && j.ok && j.modo === "servidor") return { disponible: true, version: j.version };
    return { disponible: false };
  } catch (e) {
    return { disponible: false };
  }
})();
