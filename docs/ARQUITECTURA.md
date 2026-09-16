# ARQUITECTURA — v4.0

## Principios

1. **Estático y autónomo:** HTML + CSS + JS planos. Doble clic a
   `index.html` bajo `file://` funciona completo (sin CDN, sin fetch,
   sin rutas absolutas). Lecciones CHACOQUIRA 7.39-7.40.
2. **Fuente única de verdad:** `data/contenido.js` (window.CONTENIDO).
   Editar contenido = editar ese archivo. El HTML renderiza las rejillas
   desde ahí (ejes, fichas, estantería, mosaico).
3. **Progresivo y a prueba de fallos:** patrón GATE — `html.js` se añade
   al arrancar; los revelados solo se ocultan con JS activo; failsafe de
   4 s hace visible cualquier elemento atascado. Sin JS: todo visible.
4. **Escenas dormidas:** los canvas (héroe y ejes) usan rAF solo mientras
   están en viewport y la pestaña está visible (IntersectionObserver +
   visibilitychange). El pulso del mapa es SMIL (cero JS).
5. **Móvil como composición propia:** breakpoints de composición
   (320/380/640/860/1024/1440), no una escala del escritorio.
6. **Jerarquía de animación (v4):** FONDO (movimiento lento) por debajo
   de SECUNDARIAS (microinteracciones) por debajo del CONTENIDO
   (estable y legible). Nunca más de una animación protagonista por
   sección. Solo `transform` y `opacity` en movimiento continuo.

## Fondo vivo (v4)

`js/fondo.js` gestiona 5 capas SVG fijas detrás de todo el contenido
(`assets/backgrounds/`: topografía, malla, red-nodos, partículas, ondas):

- **Mouse:** desplazamiento diferencial por capa (2-14 px según capa) con
  inercia corta; variables CSS `--mx/--my` escritas en rAF solo mientras
  hay novedad. Solo con puntero fino (`hover: hover and pointer: fine`).
- **Scroll:** topografía con parallax ligero acotado (±42 px); la malla
  micro-escala con la velocidad y vuelve a reposo sola (300 ms).
- **Zonas:** un IntersectionObserver con banda central (-45 %) marca
  `body[data-zona="clara|oscura"]` y el fondo hace crossfade de opacidad
  (0.38 / 0.6) en 1.4 s.
- **Derivas:** las capas de nodos, partículas y ondas tienen keyframes
  CSS de 30-58 s (cero JS).
- **Pausas:** `visibilitychange` añade `.dormida` (animation-play-state:
  paused); `prefers-reduced-motion` congela todo el fondo (CSS) y el JS
  no registra listeners de movimiento.
- **Móvil (≤640):** solo 3 capas, opacidad 0.32, sin reacción al puntero.

Las secciones pintan sobre el fondo con lavados semitransparentes
(0.84-0.94) que conservan su identidad clara/oscura; el contenido siempre
gana. `main > section` y `.pie` llevan `z-index: 1` para quedar por
encima de la capa fija.

## Coreografía de entrada (v4)

- `animations.js` expone `window.Revelar.observar(el, alRevelar)`: el
  contenido creado por JS (ejes, fichas, repisas, mosaico) entra en la
  misma coreografía que el HTML estático, con retraso escalonado inline
  que se retira al completarse (los hovers quedan al instante).
- Imágenes (`nosotros-registro`, mosaico) con revelado por máscara
  (`data-rev-mask`, clip-path con esquinas redondeadas).
- Kickers con línea que se conecta; línea punteada de las repisas que se
  dibuja; icono del libro que se traza (stroke-dashoffset).
- Mapa: `espera → construido` con cascada de 12 ms por departamento y
  failsafe a 3.5 s; los retrasos inline se retiran al terminar para no
  lagar el hover del `fill`.
- Cifras de territorio con count-up (1.3 s, ease-out cúbico) respetando
  el formato es-CO (2.820 con separador; 1539 sin él; coordenadas
  intactas).
- Filtros de programas: reentrada suave de fichas (45 ms escalonadas).
- Barra de progreso de lectura (2 px, degradado institucional) pintada
  en rAF desde el único listener de scroll de `navigation.js`.

## Lección v4: backdrop-filter y bloques contenedores

Un `backdrop-filter` en `.cabecera` convertía la barra en el bloque
contenedor del menú móvil (`position: fixed`) y lo aplastaba dentro de
sus 64 px. El desenfoque vive ahora en `.cabecera::before` (z-index -1):
mismo cristal, cero efectos secundarios. Regla: **backdrop-filter nunca
en un ancestro de elementos fixed**.

## Mapa real de Colombia

`js/mapa-colombia.js` (generado, no editar a mano) contiene los 33
departamentos con geometrías reales de geoBoundaries (gbOpen COL ADM1,
licencia ODbL), proyectados con equirectangular corregida (lat0 8,2° N) y
simplificados con Douglas-Peucker (ε 0,15 unidades ≈ 1,3 km) a 56 KB.
Tunja va en coordenadas reales (5,5353° N, 73,3622° O). Regeneración:
`scripts/colombia_svg.py` en el entorno de desarrollo.

`interactions.js` pinta los paths con clases: `.depto` (base),
`.depto-depto-confirmado` (Boyacá). El tooltip muestra el nombre real del
departamento; NO marca presencia de la Fundación fuera de lo confirmado.
Google Maps real (embed sin clave) queda preparado para actualizar la
consulta cuando la Fundación confirme la dirección exacta de la sede.

## Escala tipográfica

| Rol | Valor |
|---|---|
| Héroe (mensaje) | clamp(1.5rem, 3vw, 2.25rem) |
| H2 | clamp(1.4rem, 2.3vw, 1.9rem) |
| H3 | clamp(1.05rem, 1.4vw, 1.2rem) |
| Cuerpo | 1rem / 1.65 |
| Mono etiquetas | 0.72rem, tracking 0.12em |

## Capas JS

| Archivo | Responsabilidad |
|---|---|
| main.js | Gate `.js`, objeto FX (reduced-motion), registro de escenas, reloj America/Bogota, huevo de pascua |
| fondo.js | Fondo vivo: 5 capas SVG, mouse/scroll/zonas, pausas (v4) |
| navigation.js | Cabecera elevada, cajón móvil accesible, sección activa, volver arriba, barra de progreso |
| animations.js | IO de revelados + failsafe + API Revelar para contenido dinámico |
| interactions.js | Constelación del héroe, acordeón con firmas canvas, mapa Colombia (cascada), fichas/filtros/modal, estantería, mosaico/luzbox, count-up |
| forms.js | Validación + composición `wa.me` |
| cookies.js | Aviso con decisión persistente (única clave: rcc-cookies) |

## Accesibilidad

- Enlace «Saltar al contenido»; landmarks semánticos.
- `aria-expanded`/`aria-controls` en menú y acordeón; `role="dialog"` en
  modal y luzbox; foco visible con offset; ESC y flechas.
- Contraste AA en texto sobre noche y papel; los acentos no portan texto
  crítico.
- `prefers-reduced-motion` apagado completo de escenas, fondo vivo,
  cascadas y transiciones (CSS y JS).
- Nada depende solo del hover: en pantalla táctil cada tarjeta y botón
  tiene respuesta `:active` equivalente.
