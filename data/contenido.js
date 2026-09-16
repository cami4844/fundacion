/* ============================================================
   CONTENIDO — Fundación Red Con Ciencia Tunja
   Fuente única de verdad del sitio (v4.0.1).
   Solo datos CONFIRMADOS. Todo lo pendiente vive marcado
   como "por_confirmar" y la UI lo presenta con honestidad.
   Editar este archivo NO requiere tocar HTML/CSS/JS.
   ============================================================ */
window.CONTENIDO = {
  meta: {
    nombre: "Fundación Red Con Ciencia Tunja",
    nombreCorto: "Red Con Ciencia",
    lema: "La ciencia nos conecta, la conciencia nos transforma.",
    ciudad: "Tunja, Boyacá, Colombia",
    version: "4.0.1"
  },

  contacto: {
    telefonoVisible: "321 9359764",
    telefonoIntl: "573219359764",
    whatsapp: "https://wa.me/573219359764",
    notas: [
      "Este formulario no envía datos a un servidor: abre WhatsApp con tu mensaje listo para revisar y enviar.",
      "Dirección física de la sede: por confirmar."
    ]
  },

  /* Datos públicos del territorio (Tunja, Boyacá) — no son cifras institucionales */
  territorio: {
    altitud: "2.820",
    altitudUnidad: "msnm",
    fundacionCiudad: "1539",
    coords: "5.5353° N — 73.3622° O",
    presenciaConfirmada: ["Tunja (capital de Boyacá)"],
    presenciaPorConfirmar: true,
    mapsEmbed: "https://maps.google.com/maps?q=Tunja%2C%20Boyac%C3%A1%2C%20Colombia&z=13&output=embed"
  },

  /* Ejes: estructura propuesta del sitio, pendiente de aprobación oficial */
  ejes: [
    {
      id: "red",
      nombre: "Red",
      resumen: "Tejido de personas e instituciones alrededor de la ciencia.",
      detalle: "La dimensión de red del proyecto: vínculos entre actores, instituciones y comunidad. El desarrollo completo de este eje se incorporará cuando sea aprobado por la Fundación."
    },
    {
      id: "investigacion",
      nombre: "Investigación",
      resumen: "Preguntas que se formulan, evidencia que se organiza.",
      detalle: "El componente de investigación del proyecto institucional. El desarrollo completo de este eje se incorporará cuando sea aprobado por la Fundación."
    },
    {
      id: "desarrollo",
      nombre: "Desarrollo",
      resumen: "Aprendizaje y crecimiento para la comunidad.",
      detalle: "El componente formativo y de desarrollo del proyecto institucional. El desarrollo completo de este eje se incorporará cuando sea aprobado por la Fundación."
    },
    {
      id: "derechos",
      nombre: "Derechos",
      resumen: "Protección y garantía de derechos de la niñez y la juventud.",
      detalle: "El componente de protección y derechos del proyecto institucional. El desarrollo completo de este eje se incorporará cuando sea aprobado por la Fundación."
    },
    {
      id: "territorio",
      nombre: "Territorio",
      resumen: "Raíz boyacense: Tunja y su entorno andino.",
      detalle: "La dimensión territorial del proyecto, con la ciudad de Tunja como punto confirmado. El desarrollo completo de este eje se incorporará cuando sea aprobado por la Fundación."
    }
  ],

  programas: {
    nota: "Arquitectura lista para recibir los programas y proyectos oficiales. Cada ficha vivirá aquí con galería, detalles y contacto.",
    fichas: [
      { titulo: "Programas institucionales", eje: "red" },
      { titulo: "Proyectos con la comunidad", eje: "territorio" },
      { titulo: "Iniciativas educativas", eje: "desarrollo" },
      { titulo: "Aliados y convocatorias", eje: "investigacion" }
    ]
  },

  conocimiento: {
    nota: "Centro de conocimiento: investigaciones, publicaciones, informes y material educativo. La estructura crece con el contenido oficial.",
    categorias: ["Investigaciones", "Publicaciones", "Informes", "Material educativo"]
  },

  galeria: {
    nota: "Composiciones visuales de identidad del sitio. El registro fotográfico oficial se incorporará con autorización de la Fundación.",
    items: [
      { archivo: "galeria-ciencia-01.svg", titulo: "Órbitas", categoria: "ciencia" },
      { archivo: "galeria-ciencia-02.svg", titulo: "Campos", categoria: "ciencia" },
      { archivo: "galeria-comunidad-01.svg", titulo: "Encuentro", categoria: "comunidad" },
      { archivo: "galeria-comunidad-02.svg", titulo: "Voces", categoria: "comunidad" },
      { archivo: "galeria-territorio-01.svg", titulo: "Montaña", categoria: "territorio" },
      { archivo: "galeria-territorio-02.svg", titulo: "Valle", categoria: "territorio" },
      { archivo: "galeria-talleres-01.svg", titulo: "Taller", categoria: "talleres" },
      { archivo: "galeria-eventos-01.svg", titulo: "Feria", categoria: "eventos" }
    ]
  }
};
