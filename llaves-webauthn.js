/* ============================================================
   LLAVES DE ACCESO (WebAuthn) — huella, Windows Hello, llave USB
   ------------------------------------------------------------
   Módulo sin dependencias usado por server.js.

   Cómo funciona:
   · La clave escrita SIGUE siendo el respaldo. Las llaves se
     registran solo con sesión activa (+CSRF) y luego sirven
     para entrar sin escribir la clave.
   · El servidor verifica de verdad: reto de un solo uso,
     origen exacto, rpId, flag UP, contador anti-clonación y
     firma ES256/RS256 con crypto.verify nativo.
   · Requiere HTTPS en producción (o localhost en desarrollo).
   ============================================================ */
"use strict";
const crypto = require("node:crypto");
const { randomBytes, createHash, timingSafeEqual } = crypto;

const b64u = {
  enc: (b) => Buffer.from(b).toString("base64url"),
  dec: (s) => Buffer.from(String(s || ""), "base64url"),
};
const sha256 = (b) => createHash("sha256").update(b).digest();

/* ---------- CBOR mínimo (decodifica attestation/assertion) ---------- */
function cborLeer(buf, off = 0) {
  const primero = buf[off]; off += 1;
  const mt = primero >> 5, ai = primero & 0x1f; /* tipo mayor: 3 bits */
  let len;
  if (ai < 24) len = ai;
  else if (ai === 24) { len = buf[off]; off += 1; }
  else if (ai === 25) { len = buf.readUInt16BE(off); off += 2; }
  else if (ai === 26) { len = buf.readUInt32BE(off); off += 4; }
  else if (ai === 27) { len = Number(buf.readBigUInt64BE(off)); off += 8; }
  else throw new Error("CBOR no soportado");
  if (mt === 0) return [len, off];
  if (mt === 1) return [-1 - len, off];
  if (mt === 2) return [buf.subarray(off, off + len), off + len];
  if (mt === 3) return [buf.subarray(off, off + len).toString("utf8"), off + len];
  if (mt === 4) {
    const a = [];
    for (let i = 0; i < len; i++) { const [v, o] = cborLeer(buf, off); a.push(v); off = o; }
    return [a, off];
  }
  if (mt === 5) {
    const m = {};
    for (let i = 0; i < len; i++) {
      const [k, o1] = cborLeer(buf, off);
      const [v, o2] = cborLeer(buf, o1);
      m[typeof k === "string" ? k : String(k)] = v;
      off = o2;
    }
    return [m, off];
  }
  if (mt === 6) return cborLeer(buf, off); /* etiqueta: se ignora */
  /* mt 7: simples/flotantes — solo se necesitan true/false/null */
  if (ai === 20) return [false, off];
  if (ai === 21) return [true, off];
  if (ai === 22 || ai === 23) return [null, off];
  if (ai === 25) return [buf.readFloat16BE ? buf.readFloat16BE(off) : 0, off + 2];
  if (ai === 26) return [buf.readFloatBE(off), off + 4];
  if (ai === 27) return [buf.readDoubleBE(off), off + 8];
  throw new Error("CBOR simple no soportado");
}

/* ---------- authData ---------- */
function parsearAuthData(ad) {
  if (!Buffer.isBuffer(ad) || ad.length < 37) throw new Error("authData corto");
  const salida = {
    rpIdHash: ad.subarray(0, 32),
    flags: ad[32],
    signCount: ad.readUInt32BE(33),
    credId: null, cose: null,
  };
  let off = 37;
  if (salida.flags & 0x40) { /* AT: viene credencial */
    off += 16; /* aaguid, no se usa */
    const largo = ad.readUInt16BE(off); off += 2;
    salida.credId = ad.subarray(off, off + largo); off += largo;
    const [, fin] = cborLeer(ad, off);
    salida.cose = ad.subarray(off, fin); /* bytes crudos COSE de la llave */
  }
  return salida;
}

/* ---------- COSE → KeyObject (ES256 y RS256) ---------- */
function derLongitud(prefijo, largo) {
  if (largo < 128) return Buffer.from([prefijo, largo]);
  if (largo < 256) return Buffer.from([prefijo, 0x81, largo]);
  return Buffer.from([prefijo, 0x82, largo >> 8, largo & 0xff]);
}
function derEntero(b) {
  if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]);
  return Buffer.concat([derLongitud(0x02, b.length), b]);
}
function derSecuencia(parte) {
  return Buffer.concat([derLongitud(0x30, parte.length), parte]);
}
function llaveDesdeCOSE(coseBytes) {
  const [cose] = cborLeer(coseBytes, 0);
  const kty = cose["1"], alg = cose["3"];
  if (kty === 2 && cose["-1"] === 1) { /* EC P-256 → ES256 */
    const x = cose["-2"], y = cose["-3"];
    if (!x || !y || x.length !== 32 || y.length !== 32) throw new Error("P-256 inválida");
    const spki = Buffer.concat([
      Buffer.from("3059301306072a8648ce3d020106082a8648ce3d030107034200" + "04", "hex"), x, y,
    ]);
    return { alg: alg || -7, key: crypto.createPublicKey({ key: spki, format: "der", type: "spki" }), x, y };
  }
  if (kty === 3) { /* RSA → RS256 */
    const n = cose["-1"], e = cose["-2"];
    if (!n || !e) throw new Error("RSA inválida");
    const rsaPK = derSecuencia(Buffer.concat([derEntero(n), derEntero(e)]));
    const bit = Buffer.concat([Buffer.from([0]), rsaPK]);
    const algoritmo = Buffer.from("06092a864886f70d0101010500", "hex");
    const spki = derSecuencia(Buffer.concat([derSecuencia(algoritmo), derSecuencia(bit)]));
    return { alg: alg || -257, key: crypto.createPublicKey({ key: spki, format: "der", type: "spki" }) };
  }
  throw new Error("Tipo de llave no soportado (solo huellas ES256/RS256)");
}
function verificarFirma(llave, datos, firma) {
  try { return crypto.verify("sha256", datos, llave, firma); } catch { return false; }
}

/* ---------- attestation (registro) ---------- */
function verificarAttestation(fmt, stmt, ad, authDataCrudo, hashCliente, coseBytes) {
  if (fmt === "none") return true; /* Windows Hello y muchos navegadores: sin firma */
  if (fmt === "packed") {
    const firma = stmt.sig;
    if (!Buffer.isBuffer(firma)) return false;
    let llave = null;
    try {
      if (Array.isArray(stmt.x5c) && stmt.x5c.length) {
        llave = crypto.createPublicKey({ key: Buffer.from(stmt.x5c[0]), format: "der", type: "x509" });
      }
    } catch {}
    if (!llave) llave = llaveDesdeCOSE(coseBytes).key; /* autoatestación */
    return verificarFirma(llave, Buffer.concat([authDataCrudo, hashCliente]), firma);
  }
  if (fmt === "fido-u2f") { /* llaves USB antiguas */
    try {
      if (!Array.isArray(stmt.x5c) || !stmt.x5c.length || !Buffer.isBuffer(stmt.sig)) return false;
      const hoja = crypto.createPublicKey({ key: Buffer.from(stmt.x5c[0]), format: "der", type: "x509" });
      const cose = llaveDesdeCOSE(coseBytes);
      if (!cose.x || !cose.y) return false;
      const base = sha256(Buffer.concat([
        Buffer.from([0]), ad.rpIdHash, hashCliente, ad.credId,
        Buffer.concat([Buffer.from([0x04]), cose.x, cose.y]),
      ]));
      return crypto.verify(null, base, hoja, stmt.sig);
    } catch { return false; }
  }
  return false;
}

/* ---------- retos de un solo uso ---------- */
const retos = new Map();
function nuevoReto(clave) {
  const reto = randomBytes(32);
  retos.set(clave, { reto, exp: Date.now() + 5 * 60 * 1000 });
  if (retos.size > 200) for (const [k, v] of retos) if (v.exp < Date.now()) retos.delete(k);
  return reto;
}
function tomarReto(clave) {
  const v = retos.get(clave);
  retos.delete(clave);
  if (!v || v.exp < Date.now()) return null;
  return v;
}

/* ---------- helpers de petición ---------- */
function rpIdDe(req) {
  return String(req.headers.host || "localhost").split(":")[0].toLowerCase();
}
function origenValido(req, origin) {
  if (typeof origin !== "string") return false;
  const host = String(req.headers.host || "");
  return origin === `http://${host}` || origin === `https://${host}`;
}
function clienteData(buffer) {
  const cd = JSON.parse(Buffer.from(buffer).toString("utf8"));
  if (!cd || typeof cd.type !== "string" || typeof cd.challenge !== "string" || typeof cd.origin !== "string") throw new Error("clientData inválido");
  if (cd.crossOrigin === true) throw new Error("origen cruzado");
  return cd;
}

/* ============================================================
   Rutas. Contexto C: { db, registrar, textoSeguro, crearSesion,
   bloqueoActivo, enviarJSON, leerCuerpo, sesionDe, guardado,
   cookieSesion, VIDA_SESION, VERSION }
   Devuelve true si la petición fue atendida aquí.
   ============================================================ */
function init(db) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS llaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credential_id TEXT NOT NULL UNIQUE,
    cose TEXT NOT NULL,
    alg INTEGER NOT NULL,
    nombre TEXT NOT NULL DEFAULT 'Llave del equipo',
    sign_count INTEGER NOT NULL DEFAULT 0,
    transporte TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    ultimo_uso TEXT
  );`);
}

async function ruta(req, res, url, C) {
  const rutaAbs = url.pathname.replace(/\/+$/, "");
  const metodo = req.method;
  if (!rutaAbs.startsWith("/api/webauthn/")) return false;
  const { db, registrar, textoSeguro, crearSesion, bloqueoActivo, enviarJSON, leerCuerpo, sesionDe, guardado, cookieSesion, VIDA_SESION, VERSION } = C;
  const ip = C.ip;
  const USUARIO = { id: b64u.enc(Buffer.from("frcc-equipo-panel")), name: "Equipo Fundación", displayName: "Equipo Fundación Red Con Ciencia" };

  /* ---- registro: pedir opciones (sesión + CSRF) ---- */
  if (rutaAbs === "/api/webauthn/registro/opciones" && metodo === "POST") {
    const g = guardado(req);
    if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj), true;
    const rpId = rpIdDe(req);
    const existentes = db.prepare("SELECT credential_id FROM llaves").all()
      .map((f) => ({ type: "public-key", id: f.credential_id }));
    const reto = nuevoReto("reg:" + g.sesion.id);
    return enviarJSON(res, 200, {
      ok: true,
      opciones: {
        challenge: b64u.enc(reto),
        rp: { id: rpId, name: "Fundación Red Con Ciencia" },
        user: USUARIO,
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        timeout: 60000,
        attestation: "none",
        excludeCredentials: existentes,
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      },
    }), true;
  }

  /* ---- registro: verificar y guardar (sesión + CSRF) ---- */
  if (rutaAbs === "/api/webauthn/registro" && metodo === "POST") {
    const g = guardado(req);
    if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj), true;
    try {
      const c = await leerCuerpo(req);
      const nombre = textoSeguro(c.nombre, 60) || "Llave del equipo";
      const r = c.respuesta || {};
      const cd = clienteData(r.clientDataJSON ? b64u.dec(r.clientDataJSON) : null);
      if (cd.type !== "webauthn.create") throw new Error("tipo incorrecto");
      const v = tomarReto("reg:" + g.sesion.id);
      if (!v || !timingSafeEqual(b64u.dec(cd.challenge), v.reto)) throw new Error("reto inválido o repetido");
      if (!origenValido(req, cd.origin)) throw new Error("origen no reconocido");
      const crudoAttest = b64u.dec(r.attestationObject);
      const [attObj] = cborLeer(crudoAttest);
      if (process.env.FRCC_DEBUG) console.log("[webauthn] attest bytes:", crudoAttest.length, "claves:", Object.keys(attObj || {}), "authData tipo:", typeof attObj.authData, "len:", attObj.authData && attObj.authData.length);
      const authData = attObj.authData;
      const ad = parsearAuthData(authData);
      const rpId = rpIdDe(req);
      if (!ad.rpIdHash.equals(sha256(rpId))) throw new Error("rpId no coincide");
      if (!(ad.flags & 0x40) || !ad.credId || !ad.cose) throw new Error("la respuesta no trae la llave");
      const cose = llaveDesdeCOSE(ad.cose);
      if (!verificarAttestation(attObj.fmt, attObj.attStmt || {}, ad, authData, sha256(b64u.dec(r.clientDataJSON)), ad.cose)) {
        registrar("webauthn-registro-rechazado", `Firma de registro inválida (fmt ${attObj.fmt})`, ip);
        throw new Error("la firma de registro no es válida");
      }
      const credId = b64u.enc(ad.credId);
      if (db.prepare("SELECT 1 FROM llaves WHERE credential_id=?").get(credId)) {
        return enviarJSON(res, 400, { ok: false, error: "Esa llave ya está registrada." }), true;
      }
      const transporte = Array.isArray(r.transports) ? textoSeguro(r.transports.join(","), 80) : "";
      const info = db.prepare("INSERT INTO llaves (credential_id, cose, alg, nombre, transporte) VALUES (?, ?, ?, ?, ?)")
        .run(credId, b64u.enc(ad.cose), cose.alg, nombre, transporte || null);
      registrar("webauthn-registro", `Llave añadida: ${nombre}`, ip);
      return enviarJSON(res, 201, { ok: true, llave: { id: Number(info.lastInsertRowid), nombre } }), true;
    } catch (e) {
      return enviarJSON(res, 400, { ok: false, error: "No se pudo registrar la llave: " + (e.message || "datos inválidos") }), true;
    }
  }

  /* ---- login: pedir opciones (público, con bloqueo) ---- */
  if (rutaAbs === "/api/webauthn/login/opciones" && metodo === "POST") {
    const espera = bloqueoActivo(ip);
    if (espera !== null) return enviarJSON(res, 429, { ok: false, error: `Demasiados intentos fallidos. Espera ${Math.ceil(espera / 60)} minuto(s).` }), true;
    const filas = db.prepare("SELECT credential_id FROM llaves").all();
    if (!filas.length) return enviarJSON(res, 400, { ok: false, error: "No hay llaves registradas todavía. Entra con la clave y regístralas en la pestaña Seguridad." }), true;
    /* la clave del Map es el propio reto: al responder, el clientData trae el
       challenge y con él se rescata y consume (un solo uso) */
    const reto = randomBytes(32);
    retos.set("wa:" + b64u.enc(reto), { reto, exp: Date.now() + 5 * 60 * 1000 });
    if (retos.size > 200) for (const [k, v] of retos) if (v.exp < Date.now()) retos.delete(k);
    return enviarJSON(res, 200, {
      ok: true,
      opciones: {
        challenge: b64u.enc(reto),
        rpId: rpIdDe(req),
        allowCredentials: filas.map((f) => ({ type: "public-key", id: f.credential_id })),
        userVerification: "preferred",
        timeout: 60000,
      },
    }), true;
  }

  /* ---- login: verificar firma (público, con bloqueo) ---- */
  if (rutaAbs === "/api/webauthn/login" && metodo === "POST") {
    const espera = bloqueoActivo(ip);
    if (espera !== null) {
      registrar("webauthn-login-bloqueado", `IP en espera (${espera}s)`, ip);
      return enviarJSON(res, 429, { ok: false, error: `Demasiados intentos fallidos. Espera ${Math.ceil(espera / 60)} minuto(s).` }), true;
    }
    const fallo = (detalle) => {
      db.prepare("INSERT INTO intentos_login (ip, ok) VALUES (?, 0)").run(ip);
      registrar("webauthn-login-fallido", detalle, ip);
      return enviarJSON(res, 401, { ok: false, error: "La llave no fue aceptada. Intenta de nuevo o usa la clave." }), true;
    };
    try {
      const c = await leerCuerpo(req);
      const r = c.respuesta || {};
      const cd = clienteData(r.clientDataJSON ? b64u.dec(r.clientDataJSON) : null);
      if (cd.type !== "webauthn.get") return fallo("tipo incorrecto");
      const v = tomarReto("wa:" + cd.challenge);
      if (!v || !timingSafeEqual(b64u.dec(cd.challenge), v.reto)) return fallo("reto inválido");
      if (!origenValido(req, cd.origin)) return fallo("origen no reconocido");
      const credId = typeof c.id === "string" ? c.id : b64u.enc(b64u.dec(c.rawId || ""));
      const fila = db.prepare("SELECT * FROM llaves WHERE credential_id=?").get(credId);
      if (!fila) return fallo("llave desconocida");
      const authData = b64u.dec(r.authenticatorData);
      const ad = parsearAuthData(authData);
      if (!ad.rpIdHash.equals(sha256(rpIdDe(req)))) return fallo("rpId no coincide");
      if (!(ad.flags & 0x01)) return fallo("la llave pidió presencia del usuario");
      const cose = llaveDesdeCOSE(b64u.dec(fila.cose));
      const datos = Buffer.concat([authData, sha256(b64u.dec(r.clientDataJSON))]);
      if (!verificarFirma(cose.key, datos, b64u.dec(r.signature))) return fallo("firma inválida");
      /* contador anti-clonación */
      if (ad.signCount !== 0 && ad.signCount <= fila.sign_count) return fallo("contador de llave no avanzó");
      db.prepare("UPDATE llaves SET sign_count=?, ultimo_uso=datetime('now') WHERE id=?").run(ad.signCount, fila.id);
      db.prepare("INSERT INTO intentos_login (ip, ok) VALUES (?, 1)").run(ip);
      registrar("webauthn-login-ok", `Entrada con llave: ${fila.nombre}`, ip);
      const { token, csrf } = crearSesion(ip, req.headers["user-agent"] || "");
      return enviarJSON(res, 200, {
        ok: true, csrf, expiraEn: VIDA_SESION, version: VERSION, clavePorDefecto: false,
      }, { "Set-Cookie": cookieSesion(req, token, VIDA_SESION / 1000) }), true;
    } catch (e) {
      return fallo("petición inválida");
    }
  }

  /* ---- lista de llaves (sesión) ---- */
  if (rutaAbs === "/api/webauthn/llaves" && metodo === "GET") {
    const s = sesionDe(req);
    if (!s) return enviarJSON(res, 401, { ok: false, error: "Sesión no válida." }), true;
    const filas = db.prepare("SELECT id, nombre, transporte, creado_en, ultimo_uso FROM llaves ORDER BY id DESC").all();
    return enviarJSON(res, 200, { ok: true, llaves: filas }), true;
  }

  /* ---- borrar llave (sesión + CSRF) ---- */
  const m = rutaAbs.match(/^\/api\/webauthn\/llaves\/(\d+)$/);
  if (m && metodo === "DELETE") {
    const g = guardado(req);
    if (!g.ok) return enviarJSON(res, g.resp.codigo, g.resp.obj), true;
    const fila = db.prepare("SELECT nombre FROM llaves WHERE id=?").get(Number(m[1]));
    db.prepare("DELETE FROM llaves WHERE id=?").run(Number(m[1]));
    registrar("webauthn-borrada", `Llave eliminada: ${fila ? fila.nombre : "id " + m[1]}`, ip);
    return enviarJSON(res, 200, { ok: true }), true;
  }

  return enviarJSON(res, 404, { ok: false, error: "Ruta de llaves no encontrada." }), true;
}

module.exports = { init, ruta };
