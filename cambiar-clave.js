/* ============================================================
   CAMBIAR LA CLAVE DEL PANEL — sin servidor y sin intermediarios
   ------------------------------------------------------------
   Para qué sirve: si olvidaste la clave o quieres establishing una
   nueva, la restableces tú misma desde la terminal. La clave NUNCA se
   escribe en ningún archivo: solo se guarda su hash.

   Cómo usarlo:
     1) CIERRA el servidor (si está corriendo, Ctrl+C en su terminal)
     2) En esta carpeta, ejecuta:   node cambiar-clave.js
     3) Escribe la clave nueva (no se ve al escribir)
   ============================================================ */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ARCHIVO = path.join(__dirname, "data", "credenciales.json");

function hashClave(clave) {
  const sal = crypto.randomBytes(16).toString("hex");
  return `scrypt$${sal}$${crypto.scryptSync(clave, sal, 64).toString("hex")}`;
}

function pedir(texto, ocultar) {
  return new Promise((resolve) => {
    if (!ocultar) {
      const r = require("node:readline").createInterface({ input: process.stdin, output: process.stdout });
      r.question(texto, (a) => { r.close(); resolve(a.trim()); });
      return;
    }
    /* lectura oculta: en Windows sin dependencias externas */
    process.stdout.write(texto);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    let txt = "";
    const alPulsar = (buf) => {
      const c = buf.toString("utf8");
      if (c === "\r" || c === "\n" || c === "") {
        stdin.removeListener("data", alPulsar);
        if (stdin.setRawMode) stdin.setRawMode(Boolean(wasRaw));
        stdin.pause();
        process.stdout.write("\n");
        resolve(txt);
      } else if (c === "") {
        process.stdout.write("\n");
        process.exit(0);
      } else if (c === "" || c === "\b") {
        txt = txt.slice(0, -1);
      } else {
        txt += c;
      }
    };
    stdin.on("data", alPulsar);
  });
}

(async () => {
  console.log("\n  FUNDACIÓN RED CON CIENCIA — clave del panel\n");
  if (!fs.existsSync(ARCHIVO)) {
    console.log("  No encuentro data/credenciales.json.");
    console.log("  Ejecuta esto desde la carpeta del proyecto.\n");
    process.exit(1);
  }
  const clave = await pedir("  Clave nueva (mínimo 10 caracteres): ", true);
  if (clave.length < 10) { console.log("\n  Muy corta: mínimo 10 caracteres. No se cambió nada.\n"); process.exit(1); }
  const otra = await pedir("  Repítela para confirmar:            ", true);
  if (clave !== otra) { console.log("\n  Las dos no coinciden. No se cambió nada.\n"); process.exit(1); }

  const datos = JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
  datos.hash = hashClave(clave);
  datos.nota = "Aquí vive SOLO el hash cifrado de la clave del panel. Cambia la clave desde el panel (pestaña Seguridad) o con: node cambiar-clave.js";
  fs.writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2) + "\n", "utf8");

  console.log("\n  Clave cambiada.");
  console.log("  Ahora sí: vuelve a prender el servidor (node server.js) y entra al panel.\n");
  process.exit(0);
})();
