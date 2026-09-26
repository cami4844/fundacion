/* ============================================================
   TALLER V15 — momento firma «Poner en marcha el taller»
   · El botón de la consola enciende, uno a uno, los cuatro
     componentes (los enchufes), gira el dial, prende los LEDs
     y pone a Redito feliz con una frase.
   · Solo alterna la clase en-marcha: el CSS hace la coreografía.
   · Sin dependencias; prefers-reduced-motion queda instantáneo.
   ============================================================ */
(() => {
  "use strict";
  const btn = document.getElementById("btn-marcha");
  if (!btn) return;
  const escena = document.getElementById("rb-escena");
  const burbuja = document.getElementById("rb-burbuja");
  let fraseTimer = 0;

  btn.addEventListener("click", () => {
    const enMarcha = !document.body.classList.contains("en-marcha");
    document.body.classList.toggle("en-marcha", enMarcha);
    btn.setAttribute("aria-pressed", String(enMarcha));
    btn.textContent = enMarcha ? "Apagar el taller" : "Poner en marcha el taller";
    try { navigator.vibrate && navigator.vibrate(enMarcha ? [12, 50, 12] : 8); } catch (e) {}

    if (escena) {
      escena.classList.toggle("rb-feliz", enMarcha);
      if (!enMarcha) {
        clearTimeout(fraseTimer);
        if (escena.classList.contains("en-casa")) escena.classList.remove("rb-feliz");
      }
    }
    if (burbuja) {
      clearTimeout(fraseTimer);
      burbuja.textContent = enMarcha ? "¡Taller en marcha!" : "Nos vemos en el taller";
      burbuja.classList.toggle("visible", enMarcha);
      if (enMarcha) fraseTimer = setTimeout(() => burbuja.classList.remove("visible"), 3600);
    }
  });
})();
