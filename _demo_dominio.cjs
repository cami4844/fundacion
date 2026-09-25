/* demostración: el panel funcionando en un dominio .com (de prueba) */
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const http = require("http"), { spawn } = require("child_process"), fs = require("fs"), path = require("path");
const perfil = "C:\\Users\\hrach\\Downloads\\_edge_dominio";
const CLAVE = "rcc-9918835e6d0f";
try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {}
const get = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej); });
const w = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const e = spawn(EDGE, ["--headless=new", "--remote-debugging-port=9462", "--disable-gpu", "--user-data-dir=" + perfil, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let v = null;
  for (let i = 0; i < 40 && !v; i++) { await w(300); try { v = await get("http://127.0.0.1:9462/json/version"); } catch (x) {} }
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  const env = (m, pa, s) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: pa || {}, sessionId: s })); });
  ws.onmessage = (x) => { const m = JSON.parse(x.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const t = await env("Target.createTarget", { url: "http://demo-fundacion-prueba.com:8787/admin" });
  const a = await env("Target.attachToTarget", { targetId: t.targetId, flatten: true });
  const s = a.sessionId;
  await env("Page.enable", {}, s); await env("Runtime.enable", {}, s);
  await env("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false }, s);
  await w(2400);
  const ev = async (exp) => (await env("Runtime.evaluate", { expression: exp, returnByValue: true, awaitPromise: true }, s)).result.value;
  const shot = async (n) => { const f = await env("Page.captureScreenshot", { format: "png" }, s); if (f && f.data) fs.writeFileSync(path.join("C:\\Users\\hrach\\Downloads\\_capturas_v151", n), Buffer.from(f.data, "base64")); };
  console.log("URL activa:", await ev("location.href"));
  await shot("19-panel-en-dominio-login.png");
  await ev("document.getElementById('clave').value='" + CLAVE + "'");
  await ev("document.getElementById('entrar').click()");
  await w(2600);
  const dentro = await ev("getComputedStyle(document.getElementById('app')).display === 'block'");
  console.log(dentro ? "PASA: sesion iniciada EN EL DOMINIO DE PRUEBA" : "FALLA");
  await shot("20-panel-en-dominio-adentro.png");
  ws.close(); e.kill();
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (x) {}
  process.exit(0);
})().catch((x) => { console.error("CRASH:", x.message); process.exit(1); });
