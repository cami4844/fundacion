(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);

  const S = { csrf: null, version: "12", clavePorDefecto: false, editando: null, noticias: [] };

  const apiURL = (ruta) => new URL("../api/" + ruta, location.href).href;

  /* Si el panel se abrió haciendo doble clic en el archivo, la API no
     existe: fetch ni siquiera intenta nada. Se avisa antes de que la
     persona escriba la clave y se crea de nuevo su clave. */
  if (location.protocol === "file:") {
    document.addEventListener("DOMContentLoaded", () => {
      const e = document.getElementById("login-estado");
      if (e) {
        e.textContent = "Estás abriendo el panel como archivo. Ciérralo y ábrelo desde el navegador en http://localhost:8787/admin/ (con el servidor encendido en la terminal).";
        e.className = "estado mal";
      }
      const b = document.getElementById("entrar");
      if (b) b.disabled = true;
    });
  }

  async function api(ruta, { metodo = "GET", cuerpo = null, planta = false } = {}) {
    const cab = { Accept: "application/json" };
    if (cuerpo !== null) cab["Content-Type"] = "application/json";
    if (S.csrf && metodo !== "GET") cab["x-csrf"] = S.csrf;
    const ctrl = new AbortController();
    const fin = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(apiURL(ruta), {
        method: metodo, headers: cab, credentials: "same-origin",
        body: cuerpo !== null ? JSON.stringify(cuerpo) : undefined, signal: ctrl.signal,
      });
      if (r.status === 401 && !planta) { mostrarLogin("Tu sesión terminó. Ingresa la clave de nuevo."); return { r, j: {} }; }
      const j = await r.json().catch(() => null);
      /* Si la respuesta no es JSON no vino del servidor real (visor
         integrado o proxy): se marca para explicar la causa concreta. */
      if (j === null) return { r, j: { ok: false, noJson: true } };
      return { r, j };
    } catch (err) {
  /* Antes este error se tragaba en silencio: el botón se quedaba
     diciendo "Verificando…" para siempre y no explicaba nada. Ahora se
     separa "el servidor está apagado" de "la clave está mala". */
      const razon = err && err.name === "AbortError" ? "tardó más de 15 segundos en responder" : "no está respondiendo";
      return {
        r: { ok: false, status: 0 },
        j: {
          ok: false,
          sinConexion: true,
          error: `No se pudo hablar con el servidor: ${razon}. Comprueba que la terminal siga corriendo "node server.js" y que esta pestaña sea http://localhost:8787/admin/`,
        },
      };
    } finally { clearTimeout(fin); }
  }

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const ponEstado = (el, texto, tipo = "") => { const e = $(el); e.textContent = texto; e.className = "estado " + tipo; };

  /* ═══════════ sesión ═══════════ */
  function mostrarLogin(aviso) {
    $("#app").style.display = "none";
    $("#pantalla-login").style.display = "flex";
    if (aviso) ponEstado("#login-estado", aviso, "aviso");
    setTimeout(() => $("#clave").focus(), 60);
  }

  async function reanudar() {
    const { r, j } = await api("sesion");
    if (r.ok && j.ok) { S.csrf = j.csrf; S.version = j.version; S.clavePorDefecto = j.clavePorDefecto; await entrar(); }
  }

  async function entrar() {
    $("#pantalla-login").style.display = "none";
    $("#app").style.display = "block";
    $("#chip-version").textContent = "v" + S.version.split(".").slice(0, 2).join(".");
    $("#aviso-defecto").style.display = S.clavePorDefecto ? "block" : "none";
    await Promise.all([cargarResumen(), cargarNoticias(), cargarMensajes()]);
  }

  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const clave = $("#clave").value;
    if (!clave) { ponEstado("#login-estado", "Escribe la clave.", "mal"); return; }
    const btn = $("#entrar");
    btn.disabled = true; btn.textContent = "Verificando…";
    ponEstado("#login-estado", "");
    const { r, j } = await api("login", { metodo: "POST", cuerpo: { clave } });
    btn.disabled = false; btn.textContent = "Entrar al panel";
    if (r.ok && j.ok) {
      S.csrf = j.csrf; S.version = j.version; S.clavePorDefecto = j.clavePorDefecto;
      $("#clave").value = "";
      await entrar();
      if (j.clavePorDefecto) ponEstado("#login-estado", "");
      return;
    }
    /* Tres causas muy distintas que antes se veían igual: */
    if (j.sinConexion) {
      ponEstado("#login-estado", j.error, "mal");
    } else if (r.status === 429) {
      ponEstado("#login-estado", j.error || "Demasiados intentos. Espera unos minutos.", "mal");
    } else if (r.status === 400 || r.status === 401 || r.status === 403) {
      ponEstado("#login-estado", (j.error || "Clave incorrecta.") + " Si ya la cambiaste y no te acuerdas, se puede restablecer con: node cambiar-clave.js", "mal");
    } else if (j.noJson) {
      ponEstado("#login-estado", "Esta página no está hablando con el servidor de la Fundación (parece el visor integrado de una app). Copia este enlace y ábrelo en Edge o Chrome: http://localhost:8787/admin/", "mal");
    } else {
      ponEstado("#login-estado", j.error || "No se pudo completar el acceso.", "mal");
    }
  });

  const irSeg = document.getElementById("ir-seguridad");
  if (irSeg) irSeg.addEventListener("click", () => window.irSeguridad());

  $("#salir").addEventListener("click", async () => {
    await api("logout", { metodo: "POST" });
    S.csrf = null;
    mostrarLogin("Sesión cerrada. ¡Hasta pronto!");
  });

  window.irSeguridad = () => {
    activarPestana("v-seguridad");
    $("#s-actual").focus();
  };

  /* ═══════════ llaves de acceso: huella / Windows Hello (WebAuthn) ═══════════ */
  const B64 = {
    a: (buf) => {
      const b = new Uint8Array(buf);
      let s = "";
      for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    },
    de: (t) => Uint8Array.from(atob(String(t).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(t).length / 4) * 4, "=")), (c) => c.charCodeAt(0)),
  };

  function waSoportado() {
    return Boolean(window.PublicKeyCredential && window.isSecureContext && navigator.credentials && navigator.credentials.create);
  }

  async function entrarConHuella() {
    const btn = $("#btn-huella");
    btn.disabled = true;
    ponEstado("#login-estado", "Esperando tu huella o llave… revisa el aviso del navegador.", "aviso");
    try {
      const { r, j } = await api("webauthn/login/opciones", { metodo: "POST", cuerpo: {}, planta: true });
      if (!r.ok || !j.ok) { ponEstado("#login-estado", j.error || "No se pudo iniciar el acceso con llave.", "mal"); return; }
      const o = j.opciones;
      const cred = await navigator.credentials.get({
        publicKey: {
          challenge: B64.de(o.challenge),
          rpId: o.rpId,
          allowCredentials: o.allowCredentials.map((c) => ({ type: "public-key", id: B64.de(c.id) })),
          userVerification: "preferred",
          timeout: o.timeout || 60000,
        },
      });
      const resp = cred.response;
      const { r: r2, j: j2 } = await api("webauthn/login", {
        metodo: "POST",
        planta: true,
        cuerpo: {
          id: cred.id,
          respuesta: {
            authenticatorData: B64.a(resp.authenticatorData),
            clientDataJSON: B64.a(resp.clientDataJSON),
            signature: B64.a(resp.signature),
            userHandle: resp.userHandle ? B64.a(resp.userHandle) : null,
          },
        },
      });
      if (r2.ok && j2.ok) {
        S.csrf = j2.csrf;
        if (j2.version) S.version = j2.version;
        await entrar();
      } else {
        ponEstado("#login-estado", j2.error || "La llave no fue aceptada. Intenta de nuevo o usa la clave.", "mal");
      }
    } catch (e) {
      const cancelo = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
      ponEstado("#login-estado", cancelo ? "Cancelaste la llave o tardó demasiado." : "Este navegador no pudo usar la llave aquí.", "aviso");
    } finally {
      btn.disabled = false;
    }
  }

  async function registrarLlave() {
    const btn = $("#wa-nueva");
    btn.disabled = true;
    ponEstado("#wa-estado", "Sigue las instrucciones de tu dispositivo…", "aviso");
    try {
      const { r, j } = await api("webauthn/registro/opciones", { metodo: "POST", cuerpo: {} });
      if (!r.ok || !j.ok) { ponEstado("#wa-estado", j.error || "No se pudieron pedir las opciones.", "mal"); return; }
      const o = j.opciones;
      const nombre = (window.prompt("Ponle un nombre a esta llave para reconocerla (ej: Celular de Diana):", "Mi llave") || "").trim()
        || "Llave " + new Date().toLocaleDateString("es-CO");
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: B64.de(o.challenge),
          rp: o.rp,
          user: { id: B64.de(o.user.id), name: o.user.name, displayName: o.user.displayName },
          pubKeyCredParams: o.pubKeyCredParams,
          timeout: o.timeout || 60000,
          excludeCredentials: (o.excludeCredentials || []).map((c) => ({ type: "public-key", id: B64.de(c.id) })),
          authenticatorSelection: o.authenticatorSelection,
          attestation: "none",
        },
      });
      const resp = cred.response;
      const { r: r2, j: j2 } = await api("webauthn/registro", {
        metodo: "POST",
        cuerpo: {
          nombre,
          id: cred.id,
          respuesta: {
            attestationObject: B64.a(resp.attestationObject),
            clientDataJSON: B64.a(resp.clientDataJSON),
            transports: typeof resp.getTransports === "function" ? resp.getTransports() : [],
          },
        },
      });
      if (r2.ok && j2.ok) { ponEstado("#wa-estado", "Llave registrada: " + nombre, "ok"); cargarLlaves(); }
      else ponEstado("#wa-estado", j2.error || "No se pudo registrar la llave.", "mal");
    } catch (e) {
      const cancelo = e && (e.name === "NotAllowedError" || e.name === "InvalidStateError");
      ponEstado("#wa-estado", e && e.name === "InvalidStateError" ? "Esa llave ya estaba registrada." : cancelo ? "Cancelaste el registro." : "Este navegador no pudo registrar la llave.", "aviso");
    } finally {
      btn.disabled = false;
    }
  }

  async function cargarLlaves() {
    const caja = $("#wa-lista");
    const { r, j } = await api("webauthn/llaves");
    if (!r.ok || !j.ok) { caja.innerHTML = '<p class="msj-vacio">No se pudo leer la lista de llaves.</p>'; return; }
    if (!j.llaves.length) { caja.innerHTML = '<p class="msj-vacio">Aún no hay llaves registradas: la clave escrita es tu único acceso.</p>'; return; }
    caja.innerHTML = j.llaves.map((l) => `
      <div class="item-noticia">
        <div class="info">
          <b>${esc(l.nombre)}</b>
          <div class="meta">Creada: ${esc(l.creado_en)} UTC · Último uso: ${esc(l.ultimo_uso || "aún no se ha usado")}${l.transporte ? " · " + esc(l.transporte) : ""}</div>
        </div>
        <button class="btn-x" type="button" data-borrar-llave="${l.id}">Eliminar</button>
      </div>`).join("");
    caja.querySelectorAll("[data-borrar-llave]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!window.confirm("¿Eliminar esta llave? En ese dispositivo ya no servirá para entrar.")) return;
        await api("webauthn/llaves/" + b.dataset.borrarLlave, { metodo: "DELETE" });
        cargarLlaves();
      })
    );
  }

  $("#wa-nueva").addEventListener("click", registrarLlave);
  if (waSoportado()) {
    $("#wa-separador").hidden = false;
    $("#btn-huella").hidden = false;
    $("#btn-huella").addEventListener("click", entrarConHuella);
  }

  /* ═══════════ pestañas ═══════════ */
  function activarPestana(id) {
    document.querySelectorAll(".pestana").forEach((p) => p.classList.toggle("activa", p.dataset.vista === id));
    document.querySelectorAll(".vista").forEach((v) => v.classList.toggle("activa", v.id === id));
    if (id === "v-seguridad") { cargarRegistro(); cargarLlaves(); }
    if (id === "v-correo") cargarCorreo();
  }
  document.querySelectorAll(".pestana").forEach((p) =>
    p.addEventListener("click", () => activarPestana(p.dataset.vista))
  );
  document.querySelectorAll("[data-accion]").forEach((b) =>
    b.addEventListener("click", () => {
      const a = b.dataset.accion;
      if (a === "nueva-noticia") { activarPestana("v-noticias"); abrirEditor(); }
      if (a === "ver-mensajes") activarPestana("v-mensajes");
      if (a === "ver-correo") activarPestana("v-correo");
    })
  );

  /* ═══════════ resumen ═══════════ */
  async function cargarResumen() {
    const [{ r: rN, j: jN }, { r: rS, j: jS }] = await Promise.all([
      api("noticias?todas=1"), api("sesion"),
    ]);
    if (rN.ok && jN.ok) {
      const pub = jN.noticias.filter((n) => n.estado === "publicada").length;
      const bor = jN.noticias.length - pub;
      $("#r-publicadas").textContent = pub;
      $("#r-borradores").textContent = bor;
    }
    if (rS.ok && jS.ok) {
      $("#r-sin-leer").textContent = jS.mensajesSinLeer;
      $("#r-correo").textContent = jS.correo.activo ? "Activo" : "Desactivado";
    }
  }

  /* ═══════════ noticias ═══════════ */
  async function cargarNoticias() {
    const { r, j } = await api("noticias?todas=1");
    if (!r.ok || !j.ok) { $("#lista").innerHTML = "<p class='msj-vacio'>No se pudo cargar la lista.</p>"; return; }
    S.noticias = j.noticias;
    pintaNoticias();
  }

  function pintaNoticias() {
    const lista = $("#lista");
    lista.innerHTML = "";
    if (!S.noticias.length) {
      lista.innerHTML = "<p class='msj-vacio'>Todavía no hay publicaciones. Pulsa «+ Nueva noticia o evento» y escribe la primera.</p>";
      return;
    }
    S.noticias.forEach((n) => {
      const d = document.createElement("div");
      d.className = "item-noticia";
      const mini = n.imagen ? `<img class="miniatura" src="${esc(n.imagen)}" alt="">` : "";
      d.innerHTML = `${mini}
        <div class="info">
          <span class="etiq etiq--${esc(n.categoria || "Noticia")}">${esc(n.categoria || "Noticia")}</span>
          <span class="estado-chip ${esc(n.estado || "publicada")}">${n.estado === "borrador" ? "Borrador" : "Publicada"}</span>
          <br><b>${esc(n.titulo)}</b>
          <div class="meta">${esc(n.fecha)}${n.etiqueta ? " · " + esc(n.etiqueta) : ""}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn-s btn-mini" data-editar type="button">Editar</button>
          <button class="btn-x" data-borrar type="button">Eliminar</button>
        </div>`;
      d.querySelector("[data-editar]").addEventListener("click", () => abrirEditor(n));
      d.querySelector("[data-borrar]").addEventListener("click", async () => {
        if (!confirm("¿Eliminar «" + (n.titulo || "sin título") + "»? Esta acción no se puede deshacer.")) return;
        const { r } = await api("noticias/" + n.id, { metodo: "DELETE" });
        if (r.ok) { await cargarNoticias(); await cargarResumen(); }
      });
      lista.appendChild(d);
    });
  }

  function abrirEditor(n = null) {
    S.editando = n;
    $("#editor-noticia").style.display = "block";
    $("#editor-titulo").textContent = n ? "Editar publicación" : "Escribir nueva publicación";
    $("#n-titulo").value = n ? n.titulo : "";
    $("#n-fecha").value = n ? n.fecha : new Date().toISOString().slice(0, 10);
    $("#n-categoria").value = n ? (n.categoria || "Noticia") : "Noticia";
    $("#n-estado").value = n ? (n.estado || "publicada") : "publicada";
    $("#n-etiqueta").value = n ? (n.etiqueta || "") : "";
    $("#n-resumen").value = n ? n.texto : "";
    const cuerpo = $("#n-cuerpo");
    cuerpo.innerHTML = n
      ? (n.cuerpo || "<p>" + esc(n.texto) + "</p>")
      : "";
    const vista = $("#n-portada-vista");
    if (n && n.imagen) { vista.src = n.imagen; vista.style.display = "block"; }
    else { vista.removeAttribute("src"); vista.style.display = "none"; }
    ponEstado("#n-estado", "");
    $("#editor-noticia").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#n-titulo").focus();
  }

  $("#n-cancelar").addEventListener("click", () => { $("#editor-noticia").style.display = "none"; S.editando = null; });
  $("#refrescar-not").addEventListener("click", cargarNoticias);
  $("#agregar").addEventListener("click", () => abrirEditor());

  /* barra de formato */
  document.querySelectorAll(".barra-h [data-cmd]").forEach((b) =>
    b.addEventListener("mousedown", (e) => e.preventDefault())
  );
  document.querySelectorAll(".barra-h [data-cmd]").forEach((b) =>
    b.addEventListener("click", () => {
      $("#n-cuerpo").focus();
      document.execCommand(b.dataset.cmd, false, b.dataset.val || null);
    })
  );

  document.querySelector("[data-accion=enlace]").addEventListener("click", () => {
    const url = prompt("Dirección del enlace (https://…):");
    if (!url) return;
    $("#n-cuerpo").focus();
    document.execCommand("createLink", false, url);
  });

  document.querySelector("[data-accion=quitar-formato]").addEventListener("click", () => {
    $("#n-cuerpo").focus();
    document.execCommand("removeFormat");
  });

  /* imagen inline dentro del texto */
  document.querySelector("[data-accion=imagen]").addEventListener("click", () => $("#n-img-inline").click());
  $("#n-img-inline").addEventListener("change", async () => {
    const f = $("#n-img-inline").files[0];
    if (!f) return;
    ponEstado("#n-estado", "Subiendo imagen…");
    const j = await subir(f);
    if (j && j.ok) {
      $("#n-cuerpo").focus();
      document.execCommand("insertHTML", false, `<img src="${esc(j.ruta)}" alt="">`);
      ponEstado("#n-estado", "Imagen insertada.");
    } else ponEstado("#n-estado", (j && j.error) || "No se pudo subir la imagen.", "mal");
    $("#n-img-inline").value = "";
  });

  /* portada */
  $("#n-portada-subir").addEventListener("click", async () => {
    const f = $("#n-portada").files[0];
    if (!f) { ponEstado("#n-estado", "Primero elige un archivo de imagen.", "aviso"); return; }
    ponEstado("#n-estado", "Subiendo portada…");
    const j = await subir(f);
    if (j && j.ok) {
      $("#n-portada-vista").src = j.ruta;
      $("#n-portada-vista").style.display = "block";
      ponEstado("#n-estado", "Portada lista. No olvides guardar.", "ok");
    } else ponEstado("#n-estado", (j && j.error) || "No se pudo subir.", "mal");
  });
  $("#n-portada-quitar").addEventListener("click", () => {
    $("#n-portada").value = "";
    $("#n-portada-vista").removeAttribute("src");
    $("#n-portada-vista").style.display = "none";
  });

  async function subir(archivo) {
    const fd = new FormData();
    fd.append("archivo", archivo);
    const cab = { "x-csrf": S.csrf };
    const ctrl = new AbortController();
    const fin = setTimeout(() => ctrl.abort(), 30000);
    try {
      const r = await fetch(apiURL("subir"), { method: "POST", headers: cab, credentials: "same-origin", body: fd, signal: ctrl.signal });
      if (r.status === 401) { mostrarLogin("Tu sesión terminó. Ingresa la clave de nuevo."); return null; }
      return await r.json().catch(() => null);
    } finally { clearTimeout(fin); }
  }

  /* guardar */
  $("#n-guardar").addEventListener("click", async () => {
    const titulo = $("#n-titulo").value.trim();
    const resumen = $("#n-resumen").value.trim();
    if (!titulo) { ponEstado("#n-estado", "La publicación necesita título.", "mal"); return; }
    if (!resumen) { ponEstado("#n-estado", "Escribe el resumen corto: es lo primero que se lee.", "mal"); return; }
    const btn = $("#n-guardar");
    btn.disabled = true;
    ponEstado("#n-estado", "Guardando…");
    const datos = {
      titulo,
      fecha: $("#n-fecha").value || new Date().toISOString().slice(0, 10),
      categoria: $("#n-categoria").value,
      estado: $("#n-estado").value,
      etiqueta: $("#n-etiqueta").value.trim(),
      texto: resumen,
      cuerpo: $("#n-cuerpo").innerHTML,
      imagen: $("#n-portada-vista").getAttribute("src") || "",
    };
    const esNueva = !S.editando;
    const { r, j } = await api("noticias" + (esNueva ? "" : "/" + S.editando.id), { metodo: esNueva ? "POST" : "PUT", cuerpo: datos });
    btn.disabled = false;
    if (r.ok && j.ok) {
      ponEstado("#n-estado", esNueva ? "¡Publicación creada! Ya está en el sitio." : "Cambios guardados en el sitio.", "ok");
      $("#editor-noticia").style.display = "none";
      S.editando = null;
      await Promise.all([cargarNoticias(), cargarResumen()]);
    } else {
      ponEstado("#n-estado", j.error || "No se pudo guardar (error " + r.status + ").", "mal");
    }
  });

  /* ═══════════ mensajes ═══════════ */
  async function cargarMensajes() {
    const caja = $("#bandeja");
    const { r, j } = await api("mensajes");
    if (!r.ok || !j.ok) { caja.innerHTML = "<p class='msj-vacio'>No se pudo leer la bandeja.</p>"; return; }
    const sinLeer = j.mensajes.filter((m) => !m.leido).length;
    const burbuja = $("#contador-msj");
    burbuja.textContent = sinLeer;
    burbuja.hidden = sinLeer === 0;
    $("#r-sin-leer").textContent = sinLeer;
    if (!j.mensajes.length) {
      caja.innerHTML = "<p class='msj-vacio'>Todavía no hay mensajes. Cuando alguien escriba en «Escríbenos», aparecerá aquí (y te llegará al correo si lo activaste).</p>";
      return;
    }
    caja.innerHTML = "";
    j.mensajes.forEach((m) => {
      const d = document.createElement("div");
      d.className = "msg" + (m.leido ? "" : " sin-leer");
      d.innerHTML = `
        ${m.leido ? "" : '<span class="punto">nuevo</span>'}
        <b>${esc(m.nombre)}</b> · <span class="cuando">${esc(m.motivo || "Mensaje")} · ${esc(m.recibido_en)} UTC</span><br>
        <span class="cuando">${m.correo ? "Correo: " + esc(m.correo) : "Sin correo"}</span>
        <p class="texto">${esc(m.mensaje)}</p>
        <div class="fila">
          ${m.correo ? `<a class="btn-s btn-mini" style="text-decoration:none" href="mailto:${esc(m.correo)}?subject=Respuesta%20%E2%80%94%20Fundaci%C3%B3n%20Red%20Con%20Ciencia">Responder</a>` : ""}
          ${m.leido ? "" : '<button class="btn-s btn-mini" data-leer type="button">Marcar leído</button>'}
          <button class="btn-x" data-borrar-msj type="button">Eliminar</button>
        </div>`;
      const leer = d.querySelector("[data-leer]");
      if (leer) leer.addEventListener("click", async () => {
        const rr = await api("mensajes/" + m.id, { metodo: "PATCH" });
        if (rr.r.ok) { d.classList.remove("sin-leer"); leer.remove(); d.querySelector(".punto")?.remove(); cargarMensajes(); }
      });
      d.querySelector("[data-borrar-msj]").addEventListener("click", async () => {
        if (!confirm("¿Eliminar este mensaje de la bandeja?")) return;
        const rr = await api("mensajes/" + m.id, { metodo: "DELETE" });
        if (rr.r.ok) { d.remove(); cargarMensajes(); }
      });
      caja.appendChild(d);
    });
  }
  $("#refrescar-msj").addEventListener("click", cargarMensajes);

  /* ═══════════ correo ═══════════ */
  async function cargarCorreo() {
    const { r, j } = await api("ajustes");
    if (!r.ok || !j.ok) return;
    $("#c-activo").checked = Boolean(j.activo);
    $("#c-destino").value = j.destino || "";
    if (j.pista) $("#c-key").placeholder = "Clave guardada (" + j.pista + "). Déjalo vacío para conservarla.";
  }

  $("#c-guardar").addEventListener("click", async () => {
    ponEstado("#c-estado", "Guardando…");
    const { r, j } = await api("ajustes", {
      metodo: "POST",
      cuerpo: { accion: "guardar", destino: $("#c-destino").value.trim(), key: $("#c-key").value.trim(), activo: $("#c-activo").checked },
    });
    if (r.ok && j.ok) {
      ponEstado("#c-estado", "Guardado. " + (j.correo.activo ? "Las copias por correo están activas." : "Sin copia por correo."), "ok");
      $("#c-key").value = "";
      await cargarResumen(); await cargarCorreo();
    } else ponEstado("#c-estado", j.error || "No se pudo guardar.", "mal");
  });

  $("#c-probar").addEventListener("click", async () => {
    ponEstado("#c-estado", "Enviando correo de prueba…");
    const { r, j } = await api("ajustes", { metodo: "POST", cuerpo: { accion: "probar" } });
    if (r.ok && j.ok) ponEstado("#c-estado", "¡Llegó! Revisa la bandeja (y el spam por si acaso).", "ok");
    else ponEstado("#c-estado", j.aviso || j.error || "No se pudo enviar la prueba.", "mal");
  });

  /* ═══════════ seguridad ═══════════ */
  $("#s-guardar").addEventListener("click", async () => {
    const actual = $("#s-actual").value, nueva = $("#s-nueva").value;
    if (!actual || !nueva) { ponEstado("#s-estado", "Rellena las dos claves.", "mal"); return; }
    if (nueva.length < 10 || !/[a-zA-Z]/.test(nueva) || !/[0-9]/.test(nueva)) {
      ponEstado("#s-estado", "La clave nueva necesita 10+ caracteres con letras y números.", "mal"); return;
    }
    ponEstado("#s-estado", "Actualizando…");
    const { r, j } = await api("clave", { metodo: "POST", cuerpo: { actual, nueva } });
    if (r.ok && j.ok) {
      ponEstado("#s-estado", j.aviso, "ok");
      S.csrf = null;
      setTimeout(() => mostrarLogin("Clave actualizada. Ingresa con la nueva."), 1200);
    } else ponEstado("#s-estado", j.error || "No se pudo actualizar.", "mal");
  });

  async function cargarRegistro() {
    const caja = $("#registro");
    const { r, j } = await api("registro");
    if (!r.ok || !j.ok) { caja.innerHTML = "<p class='msj-vacio'>No se pudo leer el registro.</p>"; return; }
    $("#g-sesiones").textContent = j.sesionesActivas;
    if (!j.eventos.length) { caja.innerHTML = "<p class='msj-vacio'>Aún no hay eventos registrados.</p>"; return; }
    caja.innerHTML = "";
    j.eventos.forEach((ev) => {
      const d = document.createElement("div");
      d.className = "evento";
      d.innerHTML = `<span class="en">${esc(ev.en)}</span><span class="t">${esc(ev.tipo)}</span><span>${esc(ev.detalle || "")}${ev.ip ? " · " + esc(ev.ip) : ""}</span>`;
      caja.appendChild(d);
    });
  }

  /* arranque: reanudar sesión si la cookie sigue viva */
  reanudar();
})();