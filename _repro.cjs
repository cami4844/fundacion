/* reproduce el flujo exacto de Cami: URL con ?password=..., clave en el
   campo, click en Entrar. Muestra el estado y el codigo HTTP real. */
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const http = require("http"), { spawn } = require("child_process"), fs = require("fs");
const perfil = "C:\\Users\\hrach\\Downloads\\_edge_repro";
const CLAVE = "rcc-9918835e6d0f";
try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {}
const get = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej); });
const w = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const e = spawn(EDGE, ["--headless=new", "--remote-debugging-port=9460", "--disable-gpu", "--user-data-dir=" + perfil, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let v = null;
  for (let i = 0; i < 40 && !v; i++) { await w(300); try { v = await get("http://127.0.0.1:9460/json/version"); } catch (x) {} }
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  const env = (m, pa, s) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: pa || {}, sessionId: s })); });
  ws.onmessage = (x) => { const m = JSON.parse(x.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const t = await env("Target.createTarget", { url: "http://localhost:8787/admin?password=" + CLAVE });
  const a = await env("Target.attachToTarget", { targetId: t.targetId, flatten: true });
  const s = a.sessionId;
  await env("Page.enable", {}, s); await env("Runtime.enable", {}, s);
  await w(2400);
  const ev = async (exp) => (await env("Runtime.evaluate", { expression: exp, returnByValue: true, awaitPromise: true }, s)).result.value;
  /* 1. pegar la clave EN EL CAMPO como ella */
  await ev("document.getElementById('clave').value='" + CLAVE + "'");
  await ev("document.getElementById('entrar').click()");
  await w(2200);
  const dentro = await ev("getComputedStyle(document.getElementById('app')).display === 'block'");
  const estado = await ev("document.getElementById('login-estado').textContent");
  const url = await ev("location.href");
  console.log((dentro ? "PASA   " : "FALLA  ") + "entrada escribiendo la clave en el campo");
  console.log("  estado: " + JSON.stringify(estado) + "  url: " + url);
  if (!dentro) {
    /* 2. si fallo, capturar el POST real desde el navegador */
    const r2 = await ev(`fetch("../api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clave:"${CLAVE}"})}).then(r=>r.text().then(t=>r.status+" | "+t))`);
    console.log("  POST directo desde el navegador: " + r2);
  }
  ws.close(); e.kill();
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (x) {}
  process.exit(0);
})().catch((x) => { console.error("CRASH:", x.message); process.exit(1); });
