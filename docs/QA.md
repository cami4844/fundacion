# QA — Fundación Red Con Ciencia

Protocolo: navegador real + capturas revisadas con ojos (capturar → leer →
arreglar → recapturar la misma vista). Herramienta: Playwright Chromium.
Capturas guardadas fuera del entregable (`qa_shots/`, `qa_shots_v4/`,
`qa_shots_movil/`).

---

# v4.0.1 — «Móvil serio» (2026-09-16)

Origen: reporte real de Cami («está muy bugueado en celular»).

## Hallazgos confirmados con evidencia

| Hallazgo | Evidencia | Corrección |
|---|---|---|
| Inputs a 14,72 px → iOS hace zoom al tocar el formulario | `getComputedStyle(input).fontSize < 16` en los 5 perfiles | `font-size: 1rem` en ≤ 860 px |
| El iframe de Google Maps atrapa el gesto y la página «no baja» | patrón conocido + iframe sin interceptor | velo «tocar para activar el mapa» (desktop intacto) |
| Flotante WhatsApp tapa «Abrir en WhatsApp» y la flecha pisa el mensaje | capturas `iphone13_w_06_contacto` (v4.0.0) | flotantes se retiran en zona de contacto/pie y con diálogos/aviso abiertos |
| Aviso de cookies ≈ media pantalla en móvil, con botón asomando detrás | capturas `*_01_hero` (v4.0.0) | aviso compacto (≤ 640 px) + flotantes retirados mientras es visible |
| Cabecera/cajón/aviso con `backdrop-filter` repintando cada frame | medición de frames con CPU 6× | fondos sólidos sin blur en ≤ 640 px |
| `overflow: hidden` no frena el scroll de fondo en iOS | comportamiento conocido de Safari | bloqueo por posición fija del cuerpo, solo iOS, con retorno exacto |

## Ronda móvil (scripts/qa_movil_v401.py) — 76 OK, 0 fallas

- Perfiles: iPhone 13, iPhone SE (3.ª gen), Pixel 7, Galaxy S24, Moto G4
  (emulación táctil, es-CO) + Pixel 7 con CPU 6×.
- Por perfil: consola 0 errores · 0 peticiones fallidas · 0 scroll
  horizontal · inputs ≥ 16 px · menú abre por toque y bloquea fondo ·
  enlace del menú navega · cookies aceptan · mapa 33/33 · count-up
  2.820/1539 · modal y luzbox con toque · filtros · formulario compone
  WhatsApp · flotantes retirados en el pie · capturas 7 por perfil
  revisadas a ojo (héroe, menú, territorio, modal, luzbox, contacto, pie).
- Mapa de Google: velo presente, cubre, pista legible, activación por
  toque verificada (`velo_gmaps*.png`).

## Regresión de escritorio

- scripts/qa_v4.py completo: **sin fallas** (humo, 10 anchos,
  interacciones, reduced-motion, file://).

---

# v4.0.0 — «La base viva» (2026-09-16)

## Ronda A — Humo + fondo vivo (1440, consola limpia)

| Prueba | Resultado |
|---|---|
| 5 capas del fondo vivo presentes y detrás del contenido | SUPERADA |
| Zona inicial «oscura» y crossfade de zona con el scroll | SUPERADA |
| Barra de progreso en 0 al inicio y responde al scroll | SUPERADA |
| Mapa se construye: 33/33 departamentos visibles en cascada | SUPERADA |
| Count-up: 2.820 con formato es-CO; 1539 sin separador; coords intactas | SUPERADA |
| Cascadas: 4 fichas, 4 repisas, mosaico y ejes revelados | SUPERADA |
| Delays de entrada retirados tras revelar (hover sin lag) | SUPERADA |
| 0 errores de consola | SUPERADA |

## Ronda B — Responsive (320/360/390/412/480/768/1024/1280/1440/1920)

- Scroll horizontal real: 0 px en los 10 anchos (intento de scroll verificado).
- 0 errores de consola en los 10 anchos.
- Capturas full-page revisadas: sin textos superpuestos ni botones fuera
  de lugar. Móvil conserva composición propia (fondo vivo reducido a 3
  capas y opacidad 0.32).

## Ronda C — Interacciones reales (clics con Playwright)

| Prueba | Resultado |
|---|---|
| Logo → `#inicio` (scroll a 0) | SUPERADA |
| Navegación marca sección activa | SUPERADA |
| Acordeón abre con `aria-expanded` correcto | SUPERADA |
| Filtro «Desarrollo» deja exactamente 1 ficha; reentrada animada | SUPERADA |
| Ficha abre modal; ESC lo cierra | SUPERADA |
| Luzbox abre; flecha navega; ESC cierra | SUPERADA |
| Formulario: vacío → «Revisa los campos»; lleno → compone WhatsApp | SUPERADA |
| Cookies aparecen y guardan decisión | SUPERADA |
| «Volver arriba» sube de verdad | SUPERADA |
| 0 errores de consola | SUPERADA |

## Ronda D — Movimiento y reduced-motion (emulación nativa)

- Capas del fondo vivo sin animación; contenido visible al instante;
  mapa completo sin cascada (33/33). 0 errores.

## Ronda E — Autonomía file:// (copia limpia)

- Doble clic a `index.html`: 0 errores, 7 fuentes locales registradas,
  fondo vivo, revelados y mapas funcionando.

## Hallazgos y correcciones de la v4

1. **Menú móvil aplastado (crítico, venía de v3):** el
   `backdrop-filter` de la cabecera la convertía en bloque contenedor
   del cajón `position: fixed` → el menú quedaba dentro de los 64 px de
   la barra. Corregido moviendo el desenfoque a `.cabecera::before`.
   Verificación: rect del cajón = viewport completo (0→844) y captura
   revisada.
2. **«Volver arriba» sin respuesta (venía de v3):** el botón llevaba
   `pointer-events: none` permanente porque la clase `.visible` nunca se
   añadía (solo se alternaba `hidden`, que era anulado por
   `display: grid`). Corregido: clase + atributo sincronizados y regla
   `[hidden] { display: none }`.
3. **Índice faltante en estantería:** la cascada de repisas usaba un
   índice que el `forEach` no entregaba (hubiera lanzado ReferenceError
   en strict mode). Corregido antes de llegar a producción.

---

# v3.0.0 — «Creatividad madura» (2026-09-16)

## Ronda 1 — Estructura y funcionalidad

| Prueba | Resultado |
|---|---|
| Carga en 6 anchos (320/375/390/412/768/1440) sin errores de consola | SUPERADA |
| Sin scroll horizontal real (scrollX = 0 tras intento) en los 6 anchos | SUPERADA |
| Logo de cabecera visible (52 px) y clic devuelve a `#inicio` | SUPERADA |
| Acordeón: abre/cierra con clic real, canvas de firma con tamaño | SUPERADA |
| Mapa de Colombia: 33 departamentos renderizados | SUPERADA |
| Filtros de programas: filtro «Territorio» deja exactamente 1 ficha | SUPERADA |
| Modal de ficha abre y cierra con ESC | SUPERADA |
| Luzbox abre, navega con flechas del teclado, cierra con ESC | SUPERADA |
| Formulario: validación con campos vacíos y composición de WhatsApp | SUPERADA |
| Menú móvil (390): abre, navega y se cierra solo | SUPERADA |
| Google Maps embed presente | SUPERADA |

Hallazgo y corrección: el pulso del mapa usaba el motor de canvas sobre un
elemento SVG (`getContext` no existe) y abortaba el módulo de interacciones
→ las fichas y el mosaico no se renderizaban. Corregido con animación SMIL
nativa. Recaptura: todas las pruebas pasan.

## Ronda 2 — Responsive (móvil como composición propia)

Capturas full-page con scroll honesto previo (los revelados se disparan como
en uso real) en 320 / 375 / 390 / 412 / 768 / 1024 / 1440.

- 320: fichas y estantería a 1 columna; datos del territorio en filas;
  sin texto cortado ni desbordes.
- 390: mosaico propio de 2 columnas con pieza principal doble; formularios
  a ancho completo; CTAs apilados.
- 768: rejillas híbridas; mapa y panel en columna.
- 1440: composición amplia con márgenes centrados.

Hallazgo y corrección: el botón de WhatsApp de la cabecera se envolvía a
una segunda línea y pisaba el borde (1440 y 1024) → `.menu` ahora es fila
flex en escritorio y columna en el cajón móvil. Recaptura: una sola línea.

## Ronda 3 — Dirección de arte

Revisión visual de capturas por sección:

- Héroe: logo grande y legible, mensaje y lema en jerarquía, CTAs normales.
- Territorio: mapa real con Boyacá destacada, datos en tarjetas sobrias,
  Google Maps real de Tunja.
- Galería: mosaico con bordes definidos (corregido: estaba plano sobre el
  fondo oscuro).
- Contacto: canales con los SVG entregados y formulario honesto.

## Ronda 4 — Animaciones e interacción

- Revelados escalonados por IntersectionObserver con failsafe de 4 s.
- Constelación del héroe: gravita hacia el puntero, cometas espontáneas,
  opacidad contenida (no compite con el contenido).
- Escenas de los ejes: solo corren con el eje abierto y visible.
- Pulso de Tunja con SMIL (0 JS).
- `prefers-reduced-motion` respetado en CSS y JS (revelados instantáneos,
  escenas no arrancan).

## Ronda 5 — Pulido y QA final

- **Autonomía file://:** doble clic a `index.html` sin servidor — fuentes
  locales cargadas, contenido, mapa (33), fichas (4), repisas (4), mosaico
  (8), logo visible. 0 errores de consola. 0 peticiones fallidas.
- **Estabilidad 60 s:** 57 ciclos de navegación continua por las 7 secciones
  con interacciones repetidas; DOM plano (484 nodos, sin crecimiento),
  heap 10 MB, 0 errores.
- **Limpieza:** sin texto técnico en la interfaz, sin secretos, sin docs
  internas dentro de la experiencia.
