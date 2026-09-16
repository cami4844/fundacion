# CHANGELOG — Fundación Red Con Ciencia Tunja

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado [SemVer](https://semver.org/lang/es/).

---

## [4.0.1] — 2026-09-16 · «Móvil serio»

Reporte real de campo (Cami: «está muy bugueado en celular») convertido en
ronda de QA móvil profunda + correcciones. Nada de la base v4 cambia: esta
versión solo quita del camino lo que estorbaba en un teléfono.

### Corregido (móvil)

- **Zoom fantasma de iOS:** los campos del formulario usaban 14,72 px;
  Safari móvil hace zoom automático al tocar cualquier input con fuente
  menor a 16 px y la página quedaba «rostizada» hasta acercar a mano.
  Ahora 1 rem (16 px) en móvil. Causa raíz del «se ve roto» al escribir.
- **El mapa de Google se tragaba el scroll:** al pasar el dedo sobre el
  iframe, el mapa se movía en vez de la página. Ahora el iframe nace
  dormido bajo un velo institucional («tocar para activar el mapa»);
  al tocarlo despierta y funciona igual que siempre. En escritorio no
  cambia nada.
- **Flotantes estorbando:** el botón flotante de WhatsApp tapaba el
  botón «Abrir en WhatsApp» del formulario y la flecha «volver arriba»
  pisaba el área de mensaje. Ahora ambos se retiran con cortesía cuando
  mandan menos: con el menú o un diálogo abierto, con el aviso de
  cookies visible y en la zona de contacto/pie (donde ya viven los
  botones de contacto).
- **Aviso de cookies como pared:** en móvil ocupaba casi media pantalla
  con texto grande y tapaba las acciones del héroe. Rediseño compacto:
  tipografía menor, menos relleno, botones en fila. Sigue siendo el
  mismo aviso honesto.
- **Tirones de scroll en gama media:** el desenfoque de vidrio de la
  cabecera, el cajón del menú y el aviso repintaban cada fotograma.
  En móvil (≤ 640 px) quedan fondos sólidos sin `backdrop-filter`;
  visualmente idénticos, el scroll vuela.
- **El fondo se movía detrás del menú (iOS):** el bloqueo con
  `overflow: hidden` no frena a Safari. Bloqueo honesto para iOS
  (posición fija del cuerpo + retorno exacto al punto de lectura)
  para menú, modal y luzbox.

### Añadido (móvil)

- **Gesto de arrastre en la galería:** el visor ahora cambia de imagen
  deslizando el dedo, como se espera en un teléfono.
- **Áreas seguras:** los flotantes y el aviso respetan
  `env(safe-area-inset-*)` (sin pelear con el indicador de inicio).
- **Sin destello gris al tocar:** `tap-highlight` transparente y
  `touch-action: manipulation` en lo interactivo; la respuesta táctil
  es la de los estados `:active` del propio sitio.
- **Tooltip del mapa se retira solo en toque** (1,6 s), porque en un
  dedo no existe el «sacar el cursor».
- **Reservas de compatibilidad:** `100vh` antes de `100svh` y
  `overflow-x: hidden` antes de `clip`, para navegadores algo más
  viejos que degradan con elegancia.

### QA

- Nueva ronda móvil (scripts/qa_movil_v401.py): 5 perfiles táctiles
  (iPhone 13, iPhone SE 3.ª gen, Pixel 7, Galaxy S24, Moto G4) + CPU
  emulada 6× (gama media): **76 verificaciones OK, 0 fallas** — consola
  limpia, 0 scroll horizontal, menú por toque, anclas, modal, luzbox,
  filtros, formulario, cookies, mapa 33/33, count-up, flotantes
  retirados en el pie, capturas revisadas a ojo.
- Regresión de escritorio completa (scripts/qa_v4.py): **sin fallas**
  en sus 5 rondas (humo, 10 anchos, interacciones, reduced-motion,
  file://).

---

## [4.0.0] — 2026-09-16 · «La base viva»

Pulido final sobre la base v3.0: interacción, movimiento y profundidad
sin reconstruir nada. La arquitectura, las proporciones y los contenidos
se conservan tal cual; ahora la página responde.

### Añadido

- **Fondo vivo:** los 5 fondos SVG del proyecto (topografía, malla,
  red de nodos, partículas y ondas) trabajando en capas fijas detrás de
  todo el contenido. Reaccionan con suavidad al mouse (desplazamiento
  diferencial por capa), al scroll (parallax ligero de topografía y
  micro-escala de la malla) y a la entrada de cada sección (crossfade
  de zona clara/oscura). Sin capturar eventos; se duerme con la pestaña
  oculta y con `prefers-reduced-motion`; en móvil solo 3 capas y menos
  opacidad.
- **Scroll con vida:** cascadas de entrada en ejes, fichas, repisas y
  mosaico (con retiro del retraso al terminar, para hovers instantáneos);
  revelado por máscara en imágenes; línea que se conecta bajo cada
  kicker; línea punteada y icono del libro que se dibujan en la
  biblioteca; cifras de territorio con count-up en formato es-CO;
  filtros con reentrada suave de fichas.
- **Barra de progreso de lectura** (2 px, degradado institucional) que
  responde al scroll, pintada en rAF.
- **Microinteracciones:** botones con elevación, borde e icono que
  transicionan, feedback inmediato al pulsar y respuesta táctil
  equivalente en móvil; tarjetas con borde activo, flecha que se desliza
  en «Ver ficha» y número que gana color; logo con hover sutil (el
  archivo no se toca); WhatsApp flotante con anillo de pulso lento;
  iconos de canales con reacciones propias (escala, giro del teléfono,
  reacción del WhatsApp).
- **Profundidad:** franja topográfica en el héroe con parallax ligero,
  lavados semitransparentes por sección para que el fondo respire,
  sombras ya existentes conservadas.

### Corregido (auditoría funcional)

- **Menú móvil aplastado (crítico, venía de v3):** el `backdrop-filter`
  de la cabecera la convertía en bloque contenedor del cajón
  `position: fixed` y lo reducía a los 64 px de la barra. El desenfoque
  vive ahora en `.cabecera::before`; el cajón ocupa el viewport completo
  (verificado con rect y captura).
- **«Volver arriba» sin respuesta (venía de v3):** `pointer-events:
  none` permanente porque la clase `.visible` nunca se añadía. Ahora
  aparece, responde y desaparece correctamente.
- **Error latente en la estantería** (índice no entregado al `forEach`)
  detectado y corregido antes de publicar.

### Técnico

- Solo `transform` y `opacity` en movimiento continuo; un único listener
  de scroll pasivo; rAF solo con datos nuevos; IntersectionObserver en
  toda la coreografía; capas dormidas fuera de vista y con la pestaña
  oculta.
- Jerarquía de animación documentada: FONDO lento < microinteracciones <
  contenido estable. Nada rebota, nada compite con la lectura.
- QA en navegador real (protocolo Secc 17): humo + fondo, 10 anchos
  (320→1920, 0 scroll horizontal, 0 errores), interacciones reales,
  reduced-motion y `file://` desde copia limpia. Evidencia en `docs/QA.md`.

---

## [3.0.0] — 2026-09-16 · «Creatividad madura»

Corrección profunda de diseño aplicada a la v2.0 «Observatorio Andino»:
la creatividad se controla, no se destruye.

### Corregido

- **Proporciones de interfaz web real:** escala tipográfica profesional;
  el título del héroe baja de ~120 px a un máximo de ~36 px. Nada ocupa media
  pantalla; jerarquía en lugar de gigantismo.
- **Cursor nativo del sistema:** eliminado el cursor propio (punto + anillo
  con inercia) y toda sustitución del cursor del usuario.
- **Cabecera:** el menú y el botón de WhatsApp ya no se envuelven ni pisan
  el borde; logo claramente visible y clic hacia `#inicio` verificado.
- **Colores controlados:** acentos vivos solo para destacar; el contenido
  siempre gana a los fondos.
- **Cristal estratégico:** únicamente cabecera, menú móvil y cookies.
- **Secciones:** cada una con personalidad dentro del mismo sistema visual
  (héroe red, nosotros editorial, ejes interacción, territorio mapa,
  programas fichas, conocimiento biblioteca, galería mosaico, contacto CTA).

### Añadido

- **Mapa real de Colombia por departamentos** (33 geometrías reales de
  geoBoundaries, ODbL) con Boyacá destacada y nodo de Tunja en coordenadas
  reales; tooltip con el nombre de cada departamento. Nada inventado.
- **Mapa real de Google** con la ubicación de Tunja (embed sin clave de API)
  y nota honesta: dirección física de la sede por confirmar.
- **Programas con arquitectura completa:** filtros por eje, fichas y modal
  explicativo. Los títulos son provisionales y lo dicen.
- **Formulario honesto** que valida en el navegador y compone el mensaje
  para WhatsApp (sin backend fingido). Los 4 SVG de contacto entregados se
  usan en canales y formulario.
- **Fuentes auto-alojadas** (woff2 subset latin): cero dependencia de CDN.
- **Accesibilidad:** enlace de salto, focus visible, aria en menú, modal,
  luzbox y acordeón; navegación por teclado (ESC, flechas).
- **Huevo de pascua:** escribir «ciencia» dispara cometas discretas.

### Eliminado

- Cursor personalizado, cinta cinética inclinada, marquesina, scroll-jack
  del estante de programas, velo de carga pesado, cifras monumentales
  decorativas y demás efectos que no mejoraban la experiencia.

### Técnico

- Escenas canvas que **duermen fuera de vista** (IntersectionObserver +
  visibilitychange); pulso del mapa con SMIL (sin rAF).
- Patrón GATE `html.js` + failsafe de revelados a 4 s (lecciones 7.42).
- `data/contenido.js` como fuente única de verdad (sin `fetch`, seguro bajo
  `file://`).
- QA en navegador real con capturas revisadas (protocolo Secc 17): rondas de
  estructura, responsive, dirección de arte, animaciones y pulido. Evidencia
  en `docs/QA.md`.

---

## [2.0.0] — 2026-09-16 · «OBSERVATORIO ANDINO»

Reconstrucción creativa total (historial completo en el ZIP v2.0).

## [1.0.0] — 2026-09-15

Construcción inicial desde cero: arquitectura modular, identidad derivada
del logo oficial, secciones institucionales y estados «Por confirmar».
