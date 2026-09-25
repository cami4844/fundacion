const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const http = require("http"), { spawn } = require("child_process"), fs = require("fs");
const perfil = "C:\\Users\\hrach\\Downloads\\_edge_dock";
try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {}
const get = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej); });
const w = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const e = spawn(EDGE, ["--headless=new", "--remote-debugging-port=9453", "--disable-gpu", "--user-data-dir=" + perfil, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let v = null;
  for (let i = 0; i < 40 && !v; i++) { await w(300); try { v = await get("http://127.0.0.1:9453/json/version"); } catch (x) {} }
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  const env = (m, pa, s) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: pa || {}, sessionId: s })); });
  ws.onmessage = (x) => { const m = JSON.parse(x.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const t = await env("Target.createTarget", { url: "http://localhost:8787/index.html" });
  const a = await env("Target.attachToTarget", { targetId: t.targetId, flatten: true });
  const s = a.sessionId;
  await env("Page.enable", {}, s); await env("Runtime.enable", {}, s);
  await env("Emulation.setDeviceMetricsOverride", { width: 390, height: 780, deviceScaleFactor: 1, mobile: true }, s);
  await env("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] }, s);
  await w(2400);
  for (const y of [429, 600]) {
    await env("Runtime.evaluate", { expression: "scrollTo(0," + y + ")", returnByValue: true }, s);
    await w(1600);
    const r = await env("Runtime.evaluate", { expression: `(()=>{const l=document.getElementById('intro-logo');const iso=document.querySelector('#lockup .lockup__iso');const rl=l.getBoundingClientRect();const ri=iso.getBoundingClientRect();return {y:scrollY,ih:innerHeight,pTarget:Math.min(1,scrollY/(innerHeight*0.55)),inlineOp:l.style.opacity,computedOp:getComputedStyle(l).opacity,logoW:Math.round(rl.width),isoW:Math.round(ri.width),logoX:Math.round(rl.x+rl.width/2),isoX:Math.round(ri.x+ri.width/2),logoY:Math.round(rl.y+rl.height/2),isoY:Math.round(ri.y+ri.height/2)}})()`, returnByValue: true }, s);
    console.log("y=" + y + ":", JSON.stringify(r.result.value));
  }
  ws.close(); e.kill();
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (x) {}
  process.exit(0);
})();
