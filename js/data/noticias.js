/* ============================================================
   NOTICIAS — fuente única de datos (V6)
   ¿Cómo añadir una noticia? Dos caminos:
   1) admin/admin.html (panel con clave) → botón "Descargar noticias.js"
      → reemplaza este archivo en el repositorio. Listo.
   2) O edita este archivo a mano: copia un bloque { ... } y cambia
      título, fecha (AAAA-MM-DD), etiqueta y texto.
   Campos: id (único), fecha (AAAA-MM-DD), etiqueta, titulo, texto,
           imagen (ruta opcional "assets/img/fotos/...webp")
   ============================================================ */
window.NOTICIAS = [
  {
    id: "nace-presencia-digital",
    fecha: "2026-09-23",
    etiqueta: "Novedad",
    titulo: "Nace nuestra presencia digital",
    texto: "Estrenamos sitio web oficial: un punto de encuentro para conocer quiénes somos, qué estamos construyendo y cómo conectar con la Fundación desde cualquier rincón de Colombia.",
    imagen: "assets/img/fotos/noticia-taller.webp"
  },
  {
    id: "cuatro-programas-estructuracion",
    fecha: "2026-09-23",
    etiqueta: "Institucional",
    titulo: "Cuatro programas en estructuración",
    texto: "Avanzamos en el diseño de nuestros primeros programas: proyectos educativos, investigación e innovación social, fortalecimiento familiar y comunitario, y promoción en salud mental.",
    imagen: "assets/img/fotos/noticia-investigacion.webp"
  }
];
