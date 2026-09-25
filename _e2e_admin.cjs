/* E2E del panel: entrar con clave -> cambiar la clave desde Seguridad ->
   volver a entrar -> registrar huella (autenticador virtual) -> borrarla.
   Todo por la interfaz real, como lo haría Cami. */
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const http = require("http"), { spawn } = require("child_process"), fs = require("fs"), path = require("path");
const perfil = "C:\\Users\\hrach\\Downloads\\_edge_admin";
const RAIZ = "C:\\Users\\hrach\\Downloads\\fundacion-red-con-ciencia-web-v10";
const CLAVE1 = "PruebaPanel152a", CLAVE2 = "PruebaPanel152b";
try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {}
const get = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej); });
const w = (ms) => new Promise((r) => setTimeout(r, ms));
const pasos = [];
const ok = (n, c, d) => { pasos.push((c ? "PASA   " : "FALLA  ") + n + (d ? "  -> " + d : "")); console.log(pasos[pasos.length - 1]); };
setTimeout(() => { console.log("WATCHDOG: colgado. Pasos hasta ahora:\n" + pasos.join("\n")); process.exit(2); }, 90000);

(async () => {
  const e = spawn(EDGE, ["--headless=new", "--remote-debugging-port=9455", "--disable-gpu", "--user-data-dir=" + perfil, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let v = null;
  for (let i = 0; i < 40 && !v; i++) { await w(300); try { v = await get("http://127.0.0.1:9455/json/version"); } catch (x) {} }
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  const env = (m, pa, s) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: pa || {}, sessionId: s })); });
  ws.onmessage = (x) => { const m = JSON.parse(x.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const t = await env("Target.createTarget", { url: "http://localhost:8787/admin/" });
  const a = await env("Target.attachToTarget", { targetId: t.targetId, flatten: true });
  const s = a.sessionId;
  await env("Page.enable", {}, s); await env("Runtime.enable", {}, s);
  await env("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, s);
  await env("WebAuthn.enable", {}, s);
  await env("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } }, s);
  await w(1800);
  const shot = async (nombre) => {
    const f = await env("Page.captureScreenshot", { format: "png" }, s);
    if (f && f.data) fs.writeFileSync(path.join("C:\\Users\\hrach\\Downloads\\_capturas_v151", nombre), Buffer.from(f.data, "base64"));
  };
  const evalua = async (exp) => (await env("Runtime.evaluate", { expression: exp, returnByValue: true, awaitPromise: true }, s)).result.value;

  /* 1. login con clave de prueba */
  ok("panel responde con el estilo nuevo", await evalua("!!document.querySelector('link[href*=\"admin.css\"]')"));
  await evalua("document.getElementById('clave').value='" + CLAVE1 + "'");
  await evalua("document.getElementById('entrar').click()");
  await w(1600);
  ok("entrada con clave", await evalua("getComputedStyle(document.getElementById('app')).display === 'block' && document.getElementById('pantalla-login').style.display === 'none'"));
  await shot("12-admin-panel-nuevo.png");

  /* 2. cambiar la clave desde la pestaña Seguridad (flujo real del panel) */
  await evalua("[...document.querySelectorAll('.pestana')].find(b => b.dataset.vista === 'v-seguridad').click()");
  await w(700);
  await evalua("document.getElementById('s-actual').value='" + CLAVE1 + "'");
  await evalua("document.getElementById('s-nueva').value='" + CLAVE2 + "'");
  await evalua("document.getElementById('s-guardar').click()");
  await w(1800);
  const estadoClave = await evalua("document.getElementById('s-estado').textContent.trim()");
  ok("cambio de clave desde el panel", /cambi|actualiz|nueva/i.test(estadoClave) && !/error|fall/i.test(estadoClave), estadoClave);

  /* 3. cerrar sesión y volver a entrar SOLO con la clave nueva */
  await evalua("document.getElementById('salir').click()");
  await w(1400);
  await evalua("document.getElementById('clave').value='" + CLAVE2 + "'");
  await evalua("document.getElementById('entrar').click()");
  await w(1600);
  ok("reentrada con la clave nueva", await evalua("getComputedStyle(document.getElementById('app')).display === 'block'"));

  /* 4. registrar huella (autenticador virtual = huella del celular) */
  await evalua("[...document.querySelectorAll('.pestana')].find(b => b.dataset.vista === 'v-seguridad').click()");
  await w(700);
  await evalua("document.getElementById('wa-nueva').click()");
  await w(3000);
  const estadoHuella = await evalua("document.getElementById('wa-estado').textContent.trim()");
  const listaLlaves = await evalua("document.getElementById('wa-lista').textContent");
  ok("registro de huella", !/error|no se pudo|fall/i.test(estadoHuella) && /registr|listo|list/i.test(listaLlaves + estadoHuella), estadoHuella || "(sin mensaje)");

  /* 5. borrar la huella de prueba */
  const borro = await evalua("(async()=>{const b=document.querySelector('[data-borrar-llave]');if(!b)return 'sin-boton';b.click();await new Promise(r=>setTimeout(r,1200));return 'borrada'})()");
  await w(600);
  ok("borrado de huella", borro === "borrada", String(borro));
  await shot("13-admin-seguridad.png");

  await env("Target.closeTarget", { targetId: t.targetId });
  ws.close(); e.kill();
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (x) {}
  console.log(pasos.join("\n"));
  process.exit(0);
})().catch((x) => { console.error("CRASH:", x.message, "\n" + pasos.join("\n")); process.exit(1); });
