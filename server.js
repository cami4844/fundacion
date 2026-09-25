/* ============================================================
   SERVIDOR DE LA FUNDACIÓN RED CON CIENCIA — V11
   ------------------------------------------------------------
   Todo-en-uno, SIN dependencias: solo Node.js (v22 o superior).

   Qué hace:
   · Sirve el sitio web (carpeta actual) en http://localhost:8787
   · Base de datos SQLite real en  data/fundacion.db
   · Panel del equipo en /admin/ con seguridad endurecida:
       - Clave cifrada con scrypt (nunca en texto plano)
       - Sesiones con cookie HttpOnly + token CSRF
       - Bloqueo anti fuerza bruta: 5 fallos → 15 min de espera
       - Registro de auditoría de eventos de seguridad
       - Subida de imágenes validada por contenido real (magia)
   · Noticias con imágenes, tipo (Noticia/Evento/Convocatoria/
     Taller) y borradores, con editor enriquecido en el panel
   · Los mensajes del formulario quedan en la bandeja y, si lo
     activas en el panel, se avisan por correo (Web3Forms).

   Cómo usarlo:
   1) Instala Node.js 22+ (https://nodejs.org)
   2) Doble clic a  iniciar-servidor.bat  (Windows)
      o en terminal:  node server.js
   3) Abre  http://localhost:8787
   4) Panel del equipo:  http://localhost:8787/admin/

   La clave del panel NO está escrita en ningún archivo: aquí solo
   vive su hash (scrypt) en data/credenciales.json. Si la olvidas,
   restablece una nueva con:  node cambiar-clave.js
   ============================================================ */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { scryptSync, randomBytes, timingSafeEqual, createHash } = crypto;

const RAIZ = __dirname;
const PUERTO = Number(process.env.PORT || 8787);
const VERSION = "15.2.0";
const llaves = require("./llaves-webauthn");
const CARPETA_DATA = path.join(RAIZ, "data");
const ARCHIVO_DB = path.join(CARPETA_DATA, "fundacion.db");
const ARCHIVO_CLAVE = path.join(CARPETA_DATA, "credenciales.json");
const CARPETA_SUBIDAS = path.join(RAIZ, "uploads");

fs.mkdirSync(CARPETA_DATA, { recursive: true });
fs.mkdirSync(CARPETA_SUBIDAS, { recursive: true });

/* ---------- base de datos ---------- */
const db = new DatabaseSync(ARCHIVO_DB);
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS noticias (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha     TEXT NOT NULL,
  etiqueta  TEXT NOT NULL DEFAULT 'Novedad',
  titulo    TEXT NOT NULL,
  texto     TEXT NOT NULL,
  cuerpo    TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'Noticia',
  estado    TEXT NOT NULL DEFAULT 'publicada',
  imagen    TEXT,
  creada_en TEXT NOT NULL DEFAULT (datetime('now')),
  editada_en TEXT
);
CREATE TABLE IF NOT EXISTS mensajes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  correo      TEXT,
  motivo      TEXT,
  mensaje     TEXT NOT NULL,
  ip          TEXT,
  leido       INTEGER NOT NULL DEFAULT 0,
  recibido_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sesiones (
  id        TEXT PRIMARY KEY,
  csrf      TEXT NOT NULL,
  ip        TEXT,
  agente    TEXT,
  creada_en TEXT NOT NULL DEFAULT (datetime('now')),
  expira_en INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS intentos_login (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  ok INTEGER NOT NULL,
  en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS registro_seguridad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  detalle TEXT,
  ip TEXT,
  en TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
/* migraciones suaves para bases creadas con versiones anteriores */
for (const c of ["cuerpo TEXT NOT NULL DEFAULT ''", "categoria TEXT NOT NULL DEFAULT 'Noticia'", "estado TEXT NOT NULL DEFAULT 'publicada'", "editada_en TEXT"]) {
  try { db.exec(`ALTER TABLE noticias ADD COLUMN ${c}`); } catch {}
}
try { db.exec("ALTER TABLE mensajes ADD COLUMN leido INTEGER NOT NULL DEFAULT 0"); } catch {}
llaves.init(db); /* tabla de llaves de acceso (huella/USB) */

/* ---------- clave del equipo: scrypt + sal ----------
   No hay ninguna clave de fábrica en el código. La clave real de la
   fundación solo la sabe quien la eligió. */
function hashClave(clave) {
  const sal = randomBytes(16).toString("hex");
  return `scrypt$${sal}$${scryptSync(clave, sal, 64).toString("hex")}`;
}
function verificarClave(clave, guardada) {
  try {
    const [alg, sal, hash] = String(guardada).split("$");
    if (alg !== "scrypt") return false;
    const a = scryptSync(clave, sal, 64);
    const b = Buffer.from(hash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}
function claveValida(clave) {
  return typeof clave === "string" && clave.length >= 10 && /[a-zA-Z]/.test(clave) && /[0-9]/.test(clave);
}

/* siembra el hash (primera vez) o migra claves planas antiguas */
(function prepararClave() {
  let guardado = "";
  try { guardado = JSON.parse(fs.readFileSync(ARCHIVO_CLAVE, "utf8")).hash || ""; } catch {}
  if (!guardado) {
    /* No hay ninguna clave de fábrica escrita en el código. En la
       primera arrancada se genera una al azar y se imprime UNA vez en
       la terminal de quien la arranca; de ahí en adelante solo queda su
       hash. También se puede fijar con FRCC_CLAVE antes de arrancar. */
    const env = process.env.FRCC_CLAVE || "";
    const inicial = env || ("rcc-" + randomBytes(9).toString("base64url") + "-" + randomBytes(3).toString("base64url"));
    guardado = hashClave(inicial);
    fs.writeFileSync(ARCHIVO_CLAVE, JSON.stringify({
      nota: "Aquí vive SOLO el hash cifrado de la clave del panel. Cambia la clave desde el panel (pestaña Seguridad) o con: node cambiar-clave.js",
      hash: guardado,
    }, null, 2));
    ponerAjuste("clave_por_defecto", env ? "0" : "1");
    registrar("siembra", "Clave del panel generada con hash scrypt");
    if (!env) {
      console.log("\n  ┌──────────────────────────────────────────────┐");
      console.log("  │  CLAVE DEL PANEL (solo se muestra esta vez)  │");
      console.log("  ├──────────────────────────────────────────────┤");
      console.log("  │  " + inicial.padEnd(44) + "│");
      console.log("  └──────────────────────────────────────────────┘");
      console.log("  Anótala y cámbiala desde el panel en cuanto entres.\n");
    }
  }
  global.__hashClave = guardado;
})();

function obtenerHash() { return global.__hashClave; }
function ponerHash(h) { global.__hashClave = h; try { fs.writeFileSync(ARCHIVO_CLAVE, JSON.stringify({ nota: "Hash scrypt de la clave del panel", hash: h }, null, 2)); } catch {} }

/* ---------- ajustes ---------- */
function ajuste(clave, defecto) {
  const f = db.prepare("SELECT valor FROM ajustes WHERE clave=?").get(clave);
  return f ? f.valor : defecto;
}
function ponerAjuste(clave, valor) {
  db.prepare("INSERT INTO ajustes (clave, valor, actualizado_en) VALUES (?, ?, datetime('now')) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor, actualizado_en=datetime('now')").run(clave, valor);
}
/* correo: semillas desde variables de entorno (opcional) */
if (process.env.CORREO_DESTINO && !ajuste("correo_destino", "")) ponerAjuste("correo_destino", process.env.CORREO_DESTINO);
if (process.env.WEB3FORMS_KEY && !ajuste("correo_key", "")) ponerAjuste("correo_key", process.env.WEB3FORMS_KEY);

function registrar(tipo, detalle, ip = "") {
  try { db.prepare("INSERT INTO registro_seguridad (tipo, detalle, ip) VALUES (?, ?, ?)").run(tipo, String(detalle || "").slice(0, 300), ip || null); } catch {}
}

/* ---------- sesiones (cookie HttpOnly + CSRF) ---------- */
const VIDA_SESION = 12 * 60 * 60 * 1000;
const sha256 = (t) => createHash("sha256").update(t).digest("hex");

function crearSesion(ip, agente) {
  const token = randomBytes(32).toString("hex");
  const csrf = randomBytes(24).toString("hex");
  db.prepare("DELETE FROM sesiones WHERE expira_en < ?").run(Date.now());
  db.prepare("INSERT INTO sesiones (id, csrf, ip, agente, expira_en) VALUES (?, ?, ?, ?, ?)").run(sha256(token), csrf, ip, String(agente || "").slice(0, 180), Date.now() + VIDA_SESION);
  return { token, csrf };
}
function sesionDe(req) {
  const galletas = req.headers.cookie || "";
  const m = galletas.match(/(?:^|;\s*)frcc_sesion=([a-f0-9]{64})/i);
  if (!m) return null;
  const f = db.prepare("SELECT * FROM sesiones WHERE id=?").get(sha256(m[1]));
  if (!f || f.expira_en < Date.now()) {
    if (f) try { db.prepare("DELETE FROM sesiones WHERE id=?").run(f.id); } catch {}
    return null;
  }
  return f;
}
function guardado(req) {
  const s = sesionDe(req);
  if (!s) return { ok: false, resp: { codigo: 401, obj: { ok: false, error: "Sesión no válida. Ingresa tu clave de nuevo." } } };
  const csrf = req.headers["x-csrf"] || "";
  if (!csrf || csrf !== s.csrf) return { ok: false, resp: { codigo: 403, obj: { ok: false, error: "Token CSRF ausente o incorrecto." } } };
  return { ok: true, sesion: s };
}

/* ---------- bloqueo anti fuerza bruta ---------- */
const MAX_FALLOS = 5, VENTANA_BLOQUEO_MS = 15 * 60 * 1000;
function bloqueoActivo(ip) {
  const filas = db.prepare("SELECT en FROM intentos_login WHERE ip=? AND ok=0 AND en >= datetime('now','-15 minutes') ORDER BY id DESC").all(ip);
  if (filas.length < MAX_FALLOS) return null;
  const ultimo = Date.parse(filas[0].en.replace(" ", "T") + "Z");
  return Math.max(0, Math.ceil((ultimo + VENTANA_BLOQUEO_MS - Date.now()) / 1000));
}

/* ---------- utilidades HTTP ---------- */
function textoSeguro(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
/* cookie de sesión: añade Secure cuando la petición llega por HTTPS
   (nginx lo avisa con X-Forwarded-Proto) — así funciona igual en
   localhost y en el dominio real */
function cookieSesion(req, valor, maxAgeSeg) {
  const seguro = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
  return `frcc_sesion=${valor}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeg}${seguro ? "; Secure" : ""}`;
}
function enviarJSON(res, codigo, obj, cabeceras = {}) {
  const cuerpo = JSON.stringify(obj);
  res.writeHead(codigo, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...cabeceras,
  });
  res.end(cuerpo);
}
function leerCuerpo(req, maxBytes = 1024 * 1024) {
  return new Promise((resuelve, rechaza) => {
    const trozos = [];
    let total = 0;
    req.on("data", (c) => {
      total += c.length;
      if (total > maxBytes) { rechaza(new Error("cuerpo grande")); req.destroy(); return; }
      trozos.push(c);
    });
    req.on("end", () => {
      const texto = Buffer.concat(trozos).toString("utf8");
      try { resuelve(texto ? JSON.parse(texto) : {}); }
      catch { rechaza(new Error("JSON invalido")); }
    });
    req.on("error", rechaza);
  });
}

/* límite de ritmo público (contacto): 5 mensajes por hora por IP */
const ritmoIP = new Map();
const LIMITE_MENSAJES = 5, VENTANA_MS = 60 * 60 * 1000;
function ritmoOk(ip) {
  const ahora = Date.now();
  const lista = (ritmoIP.get(ip) || []).filter((m) => ahora - m < VENTANA_MS);
  if (lista.length >= LIMITE_MENSAJES) return false;
  ritmoIP.set(ip, [...lista, ahora]);
  return true;
}

/* ---------- sanitizador HTML (lista blanca) ---------- */
const ETIQUETAS_OK = new Set(["p","br","strong","b","em","i","u","s","h2","h3","h4","ul","ol","li","a","img","blockquote","figure","figcaption","hr","span"]);
const ATRIBUTOS_OK = { a: new Set(["href","title","target","rel"]), img: new Set(["src","alt","title","width","height","loading"]) };
function sanitizarHTML(entrada) {
  if (typeof entrada !== "string") return "";
  let html = entrada.slice(0, 40000);
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base)[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  html = html.replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base)\b[^>]*>/gi, "");
  html = html.replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)((?:\s+[^>]*)?)\s*\/?\s*>/g, (_t, cierre, etiRaw, atrRaw) => {
    const et = etiRaw.toLowerCase();
    if (!ETIQUETAS_OK.has(et)) return "";
    if (cierre) return `</${et}>`;
    const permitidos = ATRIBUTOS_OK[et];
    let atributos = "";
    if (permitidos) {
      const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
      let m;
      while ((m = re.exec(atrRaw))) {
        const nombre = m[1].toLowerCase();
        const valor = (m[3] ?? m[4] ?? m[5] ?? "").trim();
        if (!permitidos.has(nombre) || /^on/i.test(nombre)) continue;
        const limpio = valor.replace(/[^\w\s:\/.?!&=+,#%~;-]/g, "");
        if (nombre === "href" || nombre === "src") {
          if (/^\s*(javascript|vbscript):/i.test(valor)) continue;
          if (nombre === "src" && !/^(\/uploads\/|https?:\/\/)/i.test(limpio)) continue;
        }
        if (nombre === "target") { atributos += ' target="_blank" rel="noopener noreferrer"'; continue; }
        atributos += ` ${nombre}="${limpio}"`;
      }
    }
    if (et === "img") atributos += ' loading="lazy"';
    return `<${et}${atributos}>`;
  });
  return html;
}

/* ---------- correo (Web3Forms, sin dependencias) ---------- */
async function enviarCorreo(asunto, cuerpo, replyA) {
  const activo = ajuste("correo_activo", "0") === "1";
  if (!activo) return { ok: false, motivo: "desactivado", mensaje: "La notificación por correo está desactivada en el panel." };
  const key = ajuste("correo_key", ""), destino = ajuste("correo_destino", "");
  if (!key || !destino) return { ok: false, motivo: "sin-configurar", mensaje: "Falta la clave de Web3Forms o el correo de destino." };
  try {
    const ctrl = new AbortController();
    const fin = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ access_key: key, subject: asunto, from_name: "Web Fundación Red Con Ciencia", mensaje: cuerpo, replyto: replyA || "" }),
      signal: ctrl.signal,
    });
    clearTimeout(fin);
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.success) { registrar("correo", `Enviado a ${destino} — ${asunto}`); return { ok: true, motivo: "enviado", mensaje: "Correo enviado." }; }
    registrar("correo", `Rechazado: ${j.message || r.status}`);
    return { ok: false, motivo: "rechazado", mensaje: j.message || "El servicio rechazó el envío. Revisa la clave." };
  } catch {
    registrar("correo", "Error de red al enviar correo");
    return { ok: false, motivo: "error-red", mensaje: "No se pudo contactar el servicio de correo." };
  }
}

/* ---------- multipart (subida de imágenes) ---------- */
function leerMultiparte(req, maxBytes = 6 * 1024 * 1024) {
  return new Promise((resuelve, rechaza) => {
    const tipo = req.headers["content-type"] || "";
    const m = tipo.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!m) return rechaza(new Error("sin boundary"));
    const delimitador = Buffer.from("--" + (m[1] || m[2]).trim());
    const trozos = [];
    let total = 0;
    req.on("data", (c) => {
      total += c.length;
      if (total > maxBytes) { rechaza(new Error("archivo grande")); req.destroy(); return; }
      trozos.push(c);
    });
    req.on("end", () => {
      const buf = Buffer.concat(trozos);
      const arch = { nombre: "", datos: null };
      let pos = buf.indexOf(delimitador);
      while (pos !== -1) {
        const ini = pos + delimitador.length;
        if (buf.subarray(ini, ini + 2).toString() === "--") break; /* cierre final */
        const cabeza = buf.subarray(ini + 2);
        const corte = cabeza.indexOf("\r\n\r\n");
        if (corte !== -1) {
          const cabeceras = cabeza.subarray(0, corte).toString("utf8");
          const nm = cabeceras.match(/name="([^"]*)"/);
          const fn = cabeceras.match(/filename="([^"]*)"/);
          const finParte = cabeza.indexOf(delimitador, corte);
          if (nm && fn && fn[1] && finParte !== -1) {
            arch.nombre = fn[1];
            arch.datos = cabeza.subarray(corte + 4, finParte - 2); /* quita \r\n final */
          }
        }
        pos = buf.indexOf(delimitador, ini);
      }
      resuelve(arch);
    });
    req.on("error", rechaza);
  });
}

const FIRMAS = [
  { ext: "jpg", tipo: "image/jpeg", prueba: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", tipo: "image/png", prueba: (b) => b.subarray(0, 4).toString("hex") === "89504e47" },
  { ext: "webp", tipo: "image/webp", prueba: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

/* ---------- MIME estáticos ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".db": "application/octet-stream", ".sql": "text/plain; charset=utf-8",
};
/* ---------- cabeceras de seguridad ----------
   Nada de esto sustituye al HTTPS: es la segunda capa, la que evita que
   una página injecte scripts, que el sitio se meta en un iframe para
   hacer phishing o que filtre a qué páginas se navega. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",         /* hay estilos inline de --d y --pe */
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",                        /* la API es del mismo servidor */
  "frame-src https://www.google.com https://maps.google.com",
  "form-action 'self' https://formsubmit.co",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");
const CABECERAS_SEGURIDAD = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

/* archivos que existen en el proyecto pero NUNCA deben salir por HTTP */
const NO_SERVIR = new Set([
  "server.js", "llaves-webauthn.js", "iniciar-servidor.bat", "iniciar-servidor.sh",
  "cambiar-clave.js", "esquema.sql",
]);

function conSeguridad(cab, esAdmin) {
  return Object.assign({}, CABECERAS_SEGURIDAD, cab, esAdmin
    ? { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" }
    : {});
}

function servirEstatico(req, res, urlPath) {
  let ruta = decodeURIComponent(urlPath.split("?")[0]);
  if (ruta.endsWith("/")) ruta += "index.html";
  const abs = path.normalize(path.join(RAIZ, ruta));
  if (!abs.startsWith(RAIZ)) { res.writeHead(403, conSeguridad({ "Content-Type": "text/plain" })); return res.end("Prohibido"); }
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) {
      /* Solo se acepta el index de una CARPETA (por ejemplo /admin/ ->
         admin/index.html). Ya no se cae al index.html de la raíz: eso
         hacía que cualquier dirección inventada devolviera la portada
         con estado 200, y ni se veía la página de error ni Google
         entendía que la página no existía. */
      if (!path.basename(ruta).includes(".")) {
        try {
          const st2 = fs.statSync(path.join(RAIZ, ruta, "index.html"));
          if (st2.isFile()) {
            const esAdmin = String(ruta).includes("admin");
            const cab = conSeguridad({ "Content-Type": MIME[".html"], "Content-Length": st2.size }, esAdmin);
            res.writeHead(200, cab);
            return fs.createReadStream(path.join(RAIZ, ruta, "index.html")).pipe(res);
          }
        } catch {}
      }
      /* Lo que no existe se lleva a 404.html CON estado 404. Antes
         caía al index.html con estado 200: Google indexaba un montón
         dedirecciones falsas y la gente nunca veía la página de error. */
      const pagina404 = path.join(RAIZ, "404.html");
      try {
        const st404 = fs.statSync(pagina404);
        if (st404.isFile()) {
          res.writeHead(404, conSeguridad({ "Content-Type": MIME[".html"], "Content-Length": st404.size }));
          return fs.createReadStream(pagina404).pipe(res);
        }
      } catch {}
      res.writeHead(404, conSeguridad({ "Content-Type": "text/plain; charset=utf-8" }));
      return res.end("404: no encontrado");
    }
    /* blindaje: la carpeta data/ (base, clave cifrada, esquema) NO se sirve */
    if (String(abs).startsWith(path.join(RAIZ, "data"))) {
      res.writeHead(403, conSeguridad({ "Content-Type": "text/plain; charset=utf-8" }));
      return res.end("403: carpeta interna");
    }
    /* blindaje: código del servidor, utilidades de arranque y notas
       internas no se sirven. Los .md y .sql quedan fuera de la web
       aunque estén fuera de data/. */
    const nombre = path.basename(abs);
    const ext = path.extname(abs).toLowerCase();
    const sinPunto = nombre.startsWith(".");
    if (NO_SERVIR.has(nombre) || sinPunto || ext === ".sql" || ext === ".md" || ext === ".db") {
      res.writeHead(403, conSeguridad({ "Content-Type": "text/plain; charset=utf-8" }));
      return res.end("403: archivo interno");
    }
    const tipo = MIME[ext] || "application/octet-stream";
    const esAdmin = ruta.startsWith("admin/");
    /* Caché controlada: el HTML nunca se guarda (siempre la versión nueva)
       y el resto se revalida SIEMPRE. Sin esto el navegador guardaba el CSS
       viejo con caché heurística y Cami seguía viendo el diseño anterior. */
    const cache = ext === ".html"
      ? { "Cache-Control": "no-store" }
      : { "Cache-Control": "no-cache", "ETag": '"' + st.size.toString(16) + "-" + Math.floor(st.mtimeMs / 1000).toString(16) + '"' };
    if (cache.ETag && req.headers["if-none-match"] === cache.ETag) {
      res.writeHead(304, conSeguridad(cache, esAdmin));
      return res.end();
    }
    res.writeHead(200, conSeguridad(Object.assign({ "Content-Type": tipo, "Content-Length": st.size }, cache), esAdmin));
    fs.createReadStream(abs).pipe(res);
  });
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const ruta = url.pathname.replace(/\/+$/, "");
  const metodo = req.method;
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";
  const agentes = req.headers["user-agent"] || "";

  /* salud (público) */
  if (ruta === "/api/salud" && metodo === "GET") {
    return enviarJSON(res, 200, { ok: true, modo: "servidor", version: VERSION });
  }

  /* login (público, con bloqueo anti fuerza bruta) */
  if (ruta === "/api/login" && metodo === "POST") {
    const espera = bloqueoActivo(ip);
    if (espera !== null) {
      registrar("login-bloqueado", `IP en espera (${espera}s)`, ip);
      return enviarJSON(res, 429, { ok: false, error: `Demasiados intentos fallidos. Espera ${Math.ceil(espera / 60)} minuto(s).` });
    }
    const c = await leerCuerpo(req);
    const clave = textoSeguro(c.clave, 128);
    if (!clave || !verificarClave(clave, obtenerHash())) {
      db.prepare("INSERT INTO intentos_login (ip, ok) VALUES (?, 0)").run(ip);
      registrar("login-fallido", "Clave incorrecta", ip);
      return enviarJSON(res, 401, { ok: false, error: "Clave incorrecta." });
    }
    db.prepare("INSERT INTO intentos_login (ip, ok) VALUES (?, 1)").run(ip);
    registrar("login-ok", "Inicio de sesión del panel", ip);
    const { token, csrf } = crearSesion(ip, agentes);
    return enviarJSON(res, 200, {
      ok: true, csrf, expiraEn: VIDA_SESION, version: VERSION,
      clavePorDefecto: ajuste("clave_por_defecto", "0") === "1",
      correo: { activo: ajuste("correo_activo", "0") === "1", destino: ajuste("correo_destino", ""), configurado: Boolean(ajuste("correo_key", "") && ajuste("correo_destino", "")) },
    }, { "Set-Cookie": cookieSesion(req, token, VIDA_SESION / 1000) });
  }

  /* llaves de acceso — huella / Windows Hello / USB (WebAuthn) */
  if (await llaves.ruta(req, res, url, { db, registrar, textoSeguro, crearSesion, bloqueoActivo, enviarJSON, leerCuerpo, sesionDe, guardado, cookieSesion, VIDA_SESION, VERSION, ip })) return;

  /* sesión actual (para reanudar) */
  if (ruta === "/api/sesion" && metodo === "GET") {
    const s = sesionDe(req);
    if (!s) return enviarJSON(res, 401, { ok: false });
    return enviarJSON(res, 200, {
      ok: true, csrf: s.csrf, expiraEn: Number(s.expira_en), version: VERSION,
      clavePorDefecto: ajuste("clave_por_defecto", "0") === "1",
      correo: { activo: ajuste("correo_activo", "0") === "1", destino: ajuste("correo_destino", ""), configurado: Boolean(ajuste("correo_key", "") && ajuste("correo_destino", "")) },
      mensajesSinLeer: Number(db.prepare("SELECT COUNT(*) c FROM mensajes WHERE leido=0").get().c),
    });
  }

  /* logout */
  if (ruta === "/api/logout" && metodo === "POST") {
    const s = sesionDe(req);
    if (s) try { db.prepare("DELETE FROM sesiones WHERE id=?").run(s.id); } catch {}
    registrar("logout", "Cierre de sesión", ip);
    return enviarJSON(res, 200, { ok: true }, { "Set-Cookie": cookieSesion(req, "", 0) });
  }

  /* mensajes públicos */
  if (ruta === "/api/mensajes" && metodo === "POST") {
    if (!ritmoOk(ip)) return enviarJSON(res, 429, { ok: false, error: "Demasiados mensajes seguidos. Intenta más tarde o escríbenos por WhatsApp." });
    const c = await leerCuerpo(req);
    if (textoSeguro(c.empresa, 80)) return enviarJSON(res, 201, { ok: true, aviso: "Tu mensaje quedó guardado en la bandeja del equipo." });
    const nombre = textoSeguro(c.nombre, 80);
    const mensaje = textoSeguro(c.mensaje, 2000);
    const correo = textoSeguro(c.correo, 120);
    const motivo = textoSeguro(c.motivo, 60) || "Mensaje";
    if (!nombre || !mensaje) return enviarJSON(res, 400, { ok: false, error: "Faltan el nombre o el mensaje." });
    db.prepare("INSERT INTO mensajes (nombre, correo, motivo, mensaje, ip) VALUES (?, ?, ?, ?, ?)").run(nombre, correo, motivo, mensaje, ip);
    const cuerpo =
      `Nuevo mensaje recibido desde el formulario «Escríbenos» del sitio web.\n\n` +
      `Motivo: ${motivo}\nNombre: ${nombre}\nCorreo: ${correo || "(no lo dejó)"}\n\nMensaje:\n${mensaje}\n\n` +
      `— Puedes responderle desde el panel del equipo: bandeja de mensajes.`;
    enviarCorreo(`Mensaje web de ${nombre} — ${motivo}`, cuerpo, correo || undefined).then((r) => {
      if (!r.ok && r.motivo !== "desactivado" && r.motivo !== "sin-configurar") registrar("correo-error-publico", r.mensaje, ip);
    });
    return enviarJSON(res, 201, { ok: true, aviso: "Tu mensaje quedó guardado en la bandeja del equipo." });
  }

  /* noticias: lectura pública (solo publicadas) */
  if (ruta === "/api/noticias" && metodo === "GET" && !url.searchParams.get("todas")) {
    const filas = db.prepare("SELECT id, fecha, etiqueta, titulo, texto, cuerpo, categoria, estado, imagen FROM noticias WHERE estado='publicada' ORDER BY fecha DESC, id DESC").all();
    return enviarJSON(res, 200, { ok: true, noticias: filas });
  }

  /* subida de imágenes (sesión + CSRF + magia de archivo) */
  if (ruta === "/api/subir" && metodo === "POST") {
    const g = guardado(req);
    if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj);
    try {
      const arch = await leerMultiparte(req);
      if (!arch.datos || !arch.datos.length) return enviarJSON(res, 400, { ok: false, error: "No se recibió ningún archivo." });
      if (arch.datos.length > 5 * 1024 * 1024) return enviarJSON(res, 400, { ok: false, error: "La imagen debe pesar entre 1 KB y 5 MB." });
      const firma = FIRMAS.find((f) => f.prueba(arch.datos));
      if (!firma) {
        registrar("subida-rechazada", `No es imagen: ${arch.nombre.slice(0, 80)}`, ip);
        return enviarJSON(res, 415, { ok: false, error: "El archivo no es una imagen válida (solo JPG, PNG o WebP)." });
      }
      const nombre = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(10).toString("hex")}.${firma.ext}`;
      fs.writeFileSync(path.join(CARPETA_SUBIDAS, nombre), arch.datos);
      registrar("subida", `Imagen publicada: ${nombre} (${Math.round(arch.datos.length / 1024)} KB)`, ip);
      return enviarJSON(res, 201, { ok: true, ruta: `/uploads/${nombre}` });
    } catch (e) {
      return enviarJSON(res, 400, { ok: false, error: e.message === "archivo grande" ? "La imagen pesa más de 5 MB." : "Petición de subida inválida." });
    }
  }

  /* rutas conocidas que requieren sesión */
  const rutaConocida =
    ruta === "/api/noticias" || /^\/api\/noticias\/\d+$/.test(ruta) ||
    ruta === "/api/mensajes" || /^\/api\/mensajes\/\d+$/.test(ruta) ||
    ruta === "/api/clave" || ruta === "/api/ajustes" || ruta === "/api/registro";
  if (!rutaConocida) return enviarJSON(res, 404, { ok: false, error: "Ruta de API no encontrada." });

  const s = sesionDe(req);
  if (!s) return enviarJSON(res, 401, { ok: false, error: "Sesión no válida. Ingresa tu clave de nuevo." });

  /* bandeja de mensajes (solo lectura con sesión) */
  if (ruta === "/api/mensajes" && metodo === "GET") {
    const filas = db.prepare("SELECT id, nombre, correo, motivo, mensaje, leido, recibido_en FROM mensajes ORDER BY id DESC LIMIT 200").all();
    return enviarJSON(res, 200, { ok: true, mensajes: filas.map((f) => ({ ...f, leido: Boolean(f.leido) })) });
  }

  /* noticias: todas (para el panel) */
  if (ruta === "/api/noticias" && metodo === "GET") {
    const filas = db.prepare("SELECT id, fecha, etiqueta, titulo, texto, cuerpo, categoria, estado, imagen, editada_en FROM noticias ORDER BY fecha DESC, id DESC").all();
    return enviarJSON(res, 200, { ok: true, noticias: filas });
  }

  /* crear noticia */
  if (ruta === "/api/noticias" && metodo === "POST") {
    const g = guardado(req);
    if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj);
    const c = await leerCuerpo(req);
    const titulo = textoSeguro(c.titulo, 140);
    const texto = textoSeguro(c.texto, 3000);
    const cuerpo = sanitizarHTML(c.cuerpo);
    if (!titulo || !texto) return enviarJSON(res, 400, { ok: false, error: "La noticia necesita título y resumen." });
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(c.fecha || "") ? c.fecha : new Date().toISOString().slice(0, 10);
    const etiqueta = textoSeguro(c.etiqueta, 40) || "Novedad";
    const categoria = ["Noticia", "Evento", "Convocatoria", "Taller"].includes(c.categoria) ? c.categoria : "Noticia";
    const estado = c.estado === "borrador" ? "borrador" : "publicada";
    const imagen = textoSeguro(c.imagen, 200);
    const info = db.prepare("INSERT INTO noticias (fecha, etiqueta, titulo, texto, cuerpo, categoria, estado, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(fecha, etiqueta, titulo, texto, cuerpo, categoria, estado, imagen || null);
    registrar("noticia-crear", `id ${Number(info.lastInsertRowid)}: ${titulo}`, ip);
    return enviarJSON(res, 201, { ok: true, id: Number(info.lastInsertRowid) });
  }

  /* editar / borrar noticia */
  let m = ruta.match(/^\/api\/noticias\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    const g = guardado(req);
    if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj);
    if (metodo === "PUT") {
      const c = await leerCuerpo(req);
      const titulo = textoSeguro(c.titulo, 140);
      const texto = textoSeguro(c.texto, 3000);
      const cuerpo = sanitizarHTML(c.cuerpo);
      if (!titulo || !texto) return enviarJSON(res, 400, { ok: false, error: "La noticia necesita título y resumen." });
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(c.fecha || "") ? c.fecha : new Date().toISOString().slice(0, 10);
      const etiqueta = textoSeguro(c.etiqueta, 40) || "Novedad";
      const categoria = ["Noticia", "Evento", "Convocatoria", "Taller"].includes(c.categoria) ? c.categoria : "Noticia";
      const estado = c.estado === "borrador" ? "borrador" : "publicada";
      const imagen = textoSeguro(c.imagen, 200);
      db.prepare("UPDATE noticias SET fecha=?, etiqueta=?, titulo=?, texto=?, cuerpo=?, categoria=?, estado=?, imagen=?, editada_en=datetime('now') WHERE id=?").run(fecha, etiqueta, titulo, texto, cuerpo, categoria, estado, imagen || null, id);
      registrar("noticia-editar", `id ${id}: ${titulo}`, ip);
      return enviarJSON(res, 200, { ok: true });
    }
    if (metodo === "DELETE") {
      db.prepare("DELETE FROM noticias WHERE id=?").run(id);
      registrar("noticia-borrar", `id ${id}`, ip);
      return enviarJSON(res, 200, { ok: true });
    }
  }

  /* marcar mensaje leído */
  m = ruta.match(/^\/api\/mensajes\/(\d+)$/);
  if (m && metodo === "PATCH") {
    const g = guardado(req);
    if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj);
    db.prepare("UPDATE mensajes SET leido=1 WHERE id=?").run(Number(m[1]));
    return enviarJSON(res, 200, { ok: true });
  }
  if (m && metodo === "DELETE") {
    const g = guardado(req);
    if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj);
    db.prepare("DELETE FROM mensajes WHERE id=?").run(Number(m[1]));
    return enviarJSON(res, 200, { ok: true });
  }

  /* cambio de clave del panel */
  if (ruta === "/api/clave") {
    const g = guardado(req);
    if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj);
    if (metodo === "GET") return enviarJSON(res, 200, { ok: true, clavePorDefecto: ajuste("clave_por_defecto", "0") === "1" });
    if (metodo === "POST") {
      const c = await leerCuerpo(req);
      const actual = textoSeguro(c.actual, 128), nueva = textoSeguro(c.nueva, 128);
      if (!verificarClave(actual, obtenerHash())) {
        registrar("clave-cambio-fallido", "La clave actual no coincide", ip);
        return enviarJSON(res, 400, { ok: false, error: "La clave actual no coincide." });
      }
      if (!claveValida(nueva)) return enviarJSON(res, 400, { ok: false, error: "La clave nueva necesita al menos 10 caracteres, con letras y números." });
      if (nueva === actual) return enviarJSON(res, 400, { ok: false, error: "Escribe una clave diferente a la actual." });
      ponerHash(hashClave(nueva));
      ponerAjuste("clave_por_defecto", "0");
      db.prepare("DELETE FROM sesiones").run();
      registrar("clave-cambiada", "Clave del panel actualizada y sesiones rotadas", ip);
      return enviarJSON(res, 200, { ok: true, aviso: "Clave actualizada. Vuelve a iniciar sesión con la nueva." });
    }
  }

  /* ajustes de correo */
  if (ruta === "/api/ajustes") {
    if (metodo === "GET") {
      const key = ajuste("correo_key", "");
      return enviarJSON(res, 200, { ok: true, activo: ajuste("correo_activo", "0") === "1", destino: ajuste("correo_destino", ""), pista: key ? key.slice(0, 4) + "••••" + key.slice(-4) : "", configurado: Boolean(key) });
    }
    if (metodo === "POST") {
      const g = guardado(req);
      if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj);
      const c = await leerCuerpo(req);
      if (c.accion === "probar") {
        const destino = ajuste("correo_destino", "");
        if (!destino) return enviarJSON(res, 400, { ok: false, error: "Primero guarda un correo de destino." });
        const r = await enviarCorreo("Correo de prueba — web Fundación Red Con Ciencia", "Este es un correo de prueba enviado desde el panel del equipo.\n\nSi estás leyendo esto, la notificación de mensajes funciona correctamente.\n\n— Sistema web de la Fundación Red Con Ciencia", destino);
        registrar("correo-prueba", `${r.motivo}: ${r.mensaje}`, ip);
        return enviarJSON(res, r.ok ? 200 : 400, { ok: r.ok, aviso: r.mensaje, motivo: r.motivo });
      }
      const destino = textoSeguro(c.destino, 120).toLowerCase();
      const key = textoSeguro(c.key, 120);
      if (destino && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(destino)) return enviarJSON(res, 400, { ok: false, error: "El correo de destino no parece válido." });
      if (key && !/^[a-zA-Z0-9-]{16,}$/.test(key)) return enviarJSON(res, 400, { ok: false, error: "La clave de Web3Forms parece incorrecta (son 32 letras/números)." });
      if (destino) ponerAjuste("correo_destino", destino);
      if (key) ponerAjuste("correo_key", key);
      ponerAjuste("correo_activo", c.activo ? "1" : "0");
      registrar("correo-config", `Guardado: destino=${destino || "(sin cambio)"} activo=${c.activo ? 1 : 0}`, ip);
      return enviarJSON(res, 200, { ok: true, aviso: "Configuración guardada.", correo: { activo: ajuste("correo_activo", "0") === "1", destino: ajuste("correo_destino", ""), configurado: Boolean(ajuste("correo_key", "") && ajuste("correo_destino", "")) } });
    }
  }

  /* registro de seguridad */
  if (ruta === "/api/registro" && metodo === "GET") {
    const eventos = db.prepare("SELECT tipo, detalle, ip, en FROM registro_seguridad ORDER BY id DESC LIMIT 60").all();
    const sesionesActivas = Number(db.prepare("SELECT COUNT(*) c FROM sesiones WHERE expira_en > ?").get(Date.now()).c);
    return enviarJSON(res, 200, { ok: true, sesionesActivas, eventos });
  }

  return enviarJSON(res, 404, { ok: false, error: "Ruta de API no encontrada." });
}

/* ---------- servidor ---------- */
const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/")) {
    api(req, res, url).catch((e) => {
      const msg = e && e.message === "JSON invalido" ? "JSON invalido" : e && e.message === "cuerpo grande" ? "Cuerpo demasiado grande" : "Error interno";
      try { enviarJSON(res, 500, { ok: false, error: msg }); } catch {}
    });
    return;
  }
  servirEstatico(req, res, url.pathname);
});

servidor.listen(PUERTO, () => {
  console.log("");
  console.log("  Fundacion Red Con Ciencia — servidor V13");
  console.log("  ------------------------------------------");
  console.log("  Sitio:            http://localhost:" + PUERTO);
  console.log("  Panel del equipo: http://localhost:" + PUERTO + "/admin/");
  console.log("  Base de datos:    data/fundacion.db");
  console.log("  Clave del panel: la que tú elegiste (guardada solo como hash)");
  console.log("  ¿La olvidaste?    node cambiar-clave.js");
  console.log("");
  console.log("  Detén el servidor con Ctrl + C");
  console.log("");
});
