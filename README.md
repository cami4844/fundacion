# Sitio institucional — Fundación Red Con Ciencia Tunja

> **La ciencia nos conecta, la conciencia nos transforma.**
> Tunja · Boyacá · Colombia

Sitio institucional construido desde cero para la Fundación Red Con Ciencia
Tunja. Arquitectura estática, modular, autónoma (funciona con doble clic en
`index.html`, sin servidor ni CDN) y lista para crecer con el contenido
oficial de la Fundación.

**Versión actual: v4.0.1 — «Móvil serio»**

La v4.0.1 atiende el reporte real en celular («muy bugueado»): elimina el
zoom fantasma de iOS en el formulario, despierta el mapa de Google solo
cuando se le toca (dejaba de hacer scroll la página encima), retira los
flotantes cuando estorban, compacta el aviso de cookies y quita los
blurs costosos en móviles. QA móvil: 5 perfiles táctiles + CPU 6×, 76
verificaciones OK, 0 fallas; escritorio sin regresiones.

La v4.0 pule la base v3.0 sin reconstruirla: fondo vivo con los 5 SVG
del proyecto reaccionando con suavidad a mouse, scroll y secciones;
cascadas y máscaras de entrada; microinteracciones en botones, tarjetas
y canales; barra de progreso de lectura; y dos bugs heredados de v3
corregidos (menú móvil aplastado y botón «volver arriba» sin respuesta).
Detalle completo en `CHANGELOG.md` y evidencia en `docs/QA.md`.

**Versión anterior: v3.0.0 — «Creatividad madura»**

La v3.0 aplica la corrección profunda de diseño sobre la v2.0 «Observatorio
Andino»: proporciones reales de interfaz web, cursor nativo del sistema,
paleta controlada, mapa real de Colombia (cartografía geoBoundaries) y mapa
real de Google con Tunja, menú y botones con estados completos, móvil como
composición propia y cero datos inventados.

---

## Información confirmada de la Fundación

| Dato | Valor | Estado |
|---|---|---|
| Nombre | Fundación Red Con Ciencia Tunja | Confirmado |
| Lema | "La ciencia nos conecta, la conciencia nos transforma." | Confirmado |
| Ubicación general | Tunja, Boyacá, Colombia | Confirmado |
| Teléfono / WhatsApp | 321 9359764 | Confirmado |

Todo lo demás (misión, visión, historia, programas, equipo, sedes, cifras,
aliados) permanece marcado como **Por confirmar** en la interfaz. Este sitio
no inventa información institucional.

## Cómo abrirlo

1. **Sin instalar nada:** descomprimir el ZIP y hacer doble clic en
   `index.html`. Todo funciona en local (fuentes, datos y mapas incluidos).
2. **Con servidor local (opcional):** `python -m http.server 8000` dentro de
   la carpeta y abrir `http://localhost:8000`.

## Cómo actualizar el contenido

Toda la información vive en `data/contenido.js` (fuente única de verdad).
Al confirmarse un dato (misión, programas, municipios, dirección de la
sede) se edita ese archivo y la interfaz lo incorpora sin rehacer nada.
Guía paso a paso en `docs/GUIA_CONTENIDO.md`.

## Estructura

```
Fundacion_Red_Con_Ciencia/
  index.html            Estructura semántica completa
  css/
    fonts.css           Fuentes auto-alojadas (woff2, sin CDN)
    main.css            Sistema de diseño, secciones y revelados
    components.css      Cabecera, botones, modal, luzbox, cookies, pie
    responsive.css      Móvil como composición propia (320 → 1920)
  js/
    main.js             Arranque, gate de FX, reloj de Tunja, huevo de pascua
    fondo.js            Fondo vivo: 5 capas SVG, mouse/scroll/zonas, pausas
    navigation.js       Cabecera, menú móvil, sección activa, barra de progreso
    animations.js       Revelados por IntersectionObserver + API Revelar
    interactions.js     Escenas canvas, mapa de Colombia, fichas, luzbox, count-up
    forms.js            Formulario honesto que compone el WhatsApp
    cookies.js          Aviso funcional (solo guarda la decisión)
    mapa-colombia.js    Cartografía REAL generada (NO editar a mano)
  assets/
    logo/               Logo oficial (intacto) + variante transparente + isotipo + favicon
    icons/              Los 4 SVG de contacto entregados
    images/galeria/     Composiciones visuales propias
    backgrounds/        Fondos SVG disponibles
    fonts/              Woff2 auto-alojados
  data/
    contenido.js        Fuente única de verdad del contenido
  docs/
    ARQUITECTURA.md     Decisiones técnicas
    GUIA_CONTENIDO.md   Cómo integrar el contenido oficial
    QA.md               Evidencia de las rondas de prueba
  README.md
  CHANGELOG.md
  robots.txt
  sitemap.xml
```

## Decisiones de diseño (v4.0)

- **La base manda:** nada se reconstruyó; se pulió. Escala tipográfica
  y proporciones de la v3 intactas.
- **Fondo vivo con jerarquía:** FONDO (movimiento lento) por debajo de
  las microinteracciones, por debajo del contenido (estable y legible).
  Solo `transform` y `opacity`; capas dormidas con pestaña oculta,
  fuera de viewport y con `prefers-reduced-motion`.
- **Cristal estratégico:** cabecera, menú móvil y cookies (con el
  desenfoque en pseudo-elemento para no romper el cajón fijo).
- **Colores controlados:** noche #0B1626 / papel #F7F9FB con acentos del
  logo (azul #1570B8, teal #029C9A, verde #7CB236) usados para destacar.
- **Mapas reales:** cartografía de Colombia por departamentos (geoBoundaries,
  licencia ODbL) y embed real de Google Maps con Tunja. Nada dibujado a mano.
- **Autonomía total:** sin CDN, sin fetch, sin rutas absolutas; funciona con
  doble clic bajo `file://` (lecciones CHACOQUIRA 7.39-7.40).

## Créditos de cartografía

Departamentos de Colombia: geoBoundaries (gbOpen COL ADM1, Open Data Commons
Open Database License) — https://www.geoboundaries.org — proyectados y
simplificados para la web. Tunja marcada en coordenadas reales.
