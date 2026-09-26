/* ============================================================
   CONFIGURACIÓN DE LA FUNDACIÓN — V15
   Un solo archivo para ajustar todo el sitio.
   Edita SOLO lo que hay entre comillas.
   ============================================================
   SEGURIDAD: la clave del panel YA NO vive en este archivo.
   Se guarda cifrada (scrypt) en la base de datos y se cambia
   desde el propio panel → pestaña «Seguridad». Así nadie que
   vea el código del sitio puede enterarse de la clave.
   ============================================================ */
window.CONFIG = {
  /* WhatsApp oficial (formato internacional, sin espacios) */
  whatsapp: "573219359764",

  /* Redes sociales: escribe la URL real y el botón se activa solo.
     "" = sigue mostrándose como "próximamente". */
  instagram: "",
  facebook: "",

  /* Versión del sitio (cache-bust de assets al subir cambios) */
  version: "15.4.0"
};
