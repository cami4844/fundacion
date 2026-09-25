const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const http = require("http"), { spawn } = require("child_process"), fs = require("fs");
const perfil = "C:\\Users\\hrach\\Downloads\\_edge_h1";
try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {}
const get = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej); });
const w = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const e = spawn(EDGE, ["--headless=new", "--remote-debugging-port=9454", "--disable-gpu", "--user-data-dir=" + perfil, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let v = null;
  for (let i = 0; i < 40 && !v; i++) { await w(300); try { v = await get("http://127.0.0.1:9454/json/version"); } catch (x) {} }
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  const env = (m, pa, s) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: pa || {}, sessionId: s })); });
  ws.onmessage = (x) => { const m = JSON.parse(x.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const t = await env("Target.createTarget", { url: "http://localhost:8787/programas.html" });
  const a = await env("Target.attachToTarget", { targetId: t.targetId, flatten: true });
  const s = a.sessionId;
  await env("Page.enable", {}, s); await env("Runtime.enable", {}, s);
  await env("Emulation.setDeviceMetricsOverride", { width: 320, height: 700, deviceScaleFactor: 1, mobile: true }, s);
  await w(2200);
  const r = await env("Runtime.evaluate", { expression: `(()=>{
    const h = document.querySelector(".cab-pagina h1");
    const cs = getComputedStyle(h);
    const rango = document.createRange ? null : null;
    const span = h.querySelector(".marca-agua");
    const scs = span ? getComputedStyle(span) : null;
    return { texto: h.textContent.trim().slice(0,60), hSW: h.scrollWidth, hCW: h.clientWidth,
      wordBreak: cs.overflowWrap, fontSize: cs.fontSize, ls: cs.letterSpacing,
      spanSW: span ? span.scrollWidth : null, spanWS: scs ? scs.whiteSpace : null,
      hijos: [...h.childNodes].map(n => ({ t: (n.textContent||"").trim().slice(0,22), el: n.nodeType===1 ? n.tagName : "#text" })) };
  })()`, returnByValue: true }, s);
  console.log(JSON.stringify(r.result.value, null, 1));
  ws.close(); e.kill();
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (x) {}
  process.exit(0);
})();
