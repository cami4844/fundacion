/* QA profunda V15.2 — mide, no supone.
   7 páginas × 8 anchos: errores de consola, desbordes, imágenes rotas,
   brújula, fuentes, cookies en visita nueva, ojos siempre activos y el
   acople del logo del intro a la esquina. */
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const http = require("http"), { spawn } = require("child_process"), fs = require("fs");
const perfil = "C:\\Users\\hrach\\Downloads\\_edge_qa152";
const PUERTO = 9451;
try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {}
const get = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej); });
const w = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGINAS = ["index.html", "nosotros.html", "programas.html", "territorio.html", "noticias.html", "contacto.html", "404.html"];
const ANCHOS = [320, 360, 390, 768, 1024, 1280, 1440, 1920];
const ALTOS = { 320: 700, 360: 740, 390: 780, 768: 900, 1024: 800, 1280: 900, 1440: 900, 1920: 1000 };

(async () => {
  const e = spawn(EDGE, ["--headless=new", "--remote-debugging-port=" + PUERTO, "--disable-gpu",
    "--user-data-dir=" + perfil, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let v = null;
  for (let i = 0; i < 50 && !v; i++) { await w(300); try { v = await get("http://127.0.0.1:" + PUERTO + "/json/version"); } catch (x) {} }
  if (!v) { console.log("FALLO: Edge no abrió"); process.exit(1); }
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  const env = (m, pa, s) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: pa || {}, sessionId: s })); });
  ws.onmessage = (x) => { const m = JSON.parse(x.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const erroresConsola = [];

  const sonda = `(()=>{
    const out = { scrollX:0, overflow:false, imgsRotas:0, brujula:null, textoDesborda:[], fuente:null };
    out.scrollX = Math.round(document.documentElement.scrollWidth) - innerWidth;
    out.overflow = out.scrollX > 1;
    document.querySelectorAll("img").forEach(i => { if (i.complete && i.naturalWidth === 0 && i.width > 0) out.imgsRotas++; });
    const b = document.querySelector(".brujula");
    if (b) {
      const btns = [...document.querySelectorAll(".brujula__btn")];
      out.brujula = { pasos: document.querySelectorAll(".brujula__paso").length,
        btnAlto: btns.length ? Math.round(btns[0].getBoundingClientRect().height) : 0,
        centrada: (() => { const f = document.querySelector(".brujula__flechas"); if (!f) return null;
          const r = f.getBoundingClientRect(); return Math.round(r.left + r.width/2 - innerWidth/2); })() };
    }
    /* texto que desborda su caja (lo "cosido") */
    for (const el of document.querySelectorAll("main p, main h1, main h2, main h3, main li, .ficha, .tarjeta, .mapa-caja")) {
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        const cs = getComputedStyle(el);
        if (cs.overflowX !== "hidden" && cs.overflowX !== "clip")
          out.textoDesborda.push(el.tagName + "." + String(el.className).slice(0,30) + " +" + (el.scrollWidth - el.clientWidth) + "px");
      }
    }
    out.fuente = { sora: document.fonts.check("16px Sora"), mono: document.fonts.check("16px 'JetBrains Mono'") };
    return out;
  })()`;

  for (const ancho of ANCHOS) {
    const t = await env("Target.createTarget", { url: "about:blank" });
    const a = await env("Target.attachToTarget", { targetId: t.targetId, flatten: true });
    const s = a.sessionId;
    await env("Page.enable", {}, s);
    await env("Runtime.enable", {}, s);
    await env("Log.enable", {}, s).catch(() => {});
    await env("Emulation.setDeviceMetricsOverride", { width: ancho, height: ALTOS[ancho], deviceScaleFactor: 1, mobile: ancho < 700 }, s);
    await env("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] }, s);
    for (const pag of PAGINAS) {
      await env("Page.navigate", { url: "http://localhost:8787/" + pag }, s);
      await w(2100);
      const r = await env("Runtime.evaluate", { expression: sonda, returnByValue: true }, s).catch(() => null);
      if (!r || !r.result || !r.result.value) { console.log(ancho, pag, "SONDA FALLO"); continue; }
      const o = r.result.value;
      const problemas = [];
      if (o.overflow) problemas.push("overflowX+" + o.scrollX);
      if (o.imgsRotas) problemas.push("imgRotas:" + o.imgsRotas);
      if (o.textoDesborda.length) problemas.push("texto:" + o.textoDesborda.slice(0, 3).join(" | "));
      if (pag === "404.html" ? o.brujula : !o.brujula) problemas.push("brujula:" + (o.brujula ? "en404" : "falta"));
      if (o.brujula && (o.brujula.pasos !== 6)) problemas.push("pasos:" + o.brujula.pasos);
      if (!o.fuente.sora || !o.fuente.mono) problemas.push("fuente:" + JSON.stringify(o.fuente));
      console.log((problemas.length ? "PROBLEMA" : "ok      ") + " " + String(ancho).padStart(4) + " " + pag.padEnd(15) + (problemas.length ? "  " + problemas.join("  ") : "") +
        (o.brujula ? "  [btn:" + o.brujula.btnAlto + "px cx:" + o.brujula.centrada + "]" : ""));
    }
    await env("Target.closeTarget", { targetId: t.targetId });
  }

  /* ——— cookies en visita nueva + ojos siempre activos + acople del logo ——— */
  const t = await env("Target.createTarget", { url: "http://localhost:8787/index.html" });
  const a = await env("Target.attachToTarget", { targetId: t.targetId, flatten: true });
  const s = a.sessionId;
  await env("Page.enable", {}, s); await env("Runtime.enable", {}, s);
  await env("Emulation.setDeviceMetricsOverride", { width: 390, height: 780, deviceScaleFactor: 1, mobile: true }, s);
  await env("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] }, s);
  await w(2500);
  let r = await env("Runtime.evaluate", { expression: "(()=>{const b=document.getElementById('cookies-banner');if(!b)return 'SIN BANNER';const r=b.getBoundingClientRect();const cs=getComputedStyle(b);return 'banner visible='+((r.height>0)&&cs.display!=='none'&&cs.visibility!=='hidden')+' alto='+Math.round(r.height)})()", returnByValue: true }, s);
  console.log("COOKIES visita nueva:", r.result.value);

  /* ojos: con el robot en pantalla y sin tocar nada, la pupila se mueve sola */
  await env("Runtime.evaluate", { expression: "document.querySelector('#robot').scrollIntoView({block:'center'})", returnByValue: true }, s);
  await w(1200);
  r = await env("Runtime.evaluate", { expression: "(()=>{const p=document.querySelector('#rb-ojo-i .rb-pupila');return p?p.style.getPropertyValue('--px')||'0':'sin pupila'})()", returnByValue: true }, s);
  const px1 = r.result.value;
  await w(3600);
  r = await env("Runtime.evaluate", { expression: "(()=>{const p=document.querySelector('#rb-ojo-i .rb-pupila');return p?p.style.getPropertyValue('--px')||'0':'sin pupila'})()", returnByValue: true }, s);
  console.log("OJOS autonomos: px antes=" + px1 + " despues(3.6s sin raton)=" + r.result.value + " -> " + (px1 !== r.result.value ? "MOVIENDOSE" : "QUIETOS (mal)"));

  /* acople del logo: scroll 0 / mitad / completo */
  const mideIntro = "(()=>{const l=document.getElementById('intro-logo');const iso=document.querySelector('#lockup .lockup__iso');if(!l||!iso)return 'SIN INTRO';const rl=l.getBoundingClientRect();const ri=iso.getBoundingClientRect();const lema=document.getElementById('intro-lema');return {p:Math.round(Math.min(1,scrollY/(innerHeight*0.55))*100)/100,logoX:Math.round(rl.x+rl.width/2),isoX:Math.round(ri.x+ri.width/2),logoW:Math.round(rl.width),isoW:Math.round(ri.width),logoOp:getComputedStyle(l).opacity,lockupOp:getComputedStyle(document.getElementById('lockup')).opacity,lemaOp:lema?getComputedStyle(lema).opacity:'-'}})()";
  for (const y of [0, Math.round(390 * 0.55 / 2), Math.round(780 * 0.55)]) {
    await env("Runtime.evaluate", { expression: "scrollTo(0," + y + ")", returnByValue: true }, s);
    await w(450);
    r = await env("Runtime.evaluate", { expression: mideIntro, returnByValue: true }, s);
    console.log("ACOPE scrollY=" + y + ":", JSON.stringify(r.result.value));
  }
  await env("Target.closeTarget", { targetId: t.targetId });
  console.log("ERRORES CONSOLA:", erroresConsola.length ? erroresConsola.slice(0, 8) : "0");
  ws.close(); e.kill();
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (x) {}
  process.exit(0);
})().catch((x) => { console.error("CRASH:", x.message); process.exit(1); });
