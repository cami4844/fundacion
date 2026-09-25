## V15 "Taller de ciencia" (2026-09-25)

- REDISEÑO TOTAL otra vez, y ahora MULTI-PÁGINA. Se borró el diseño V14 entero
  (css/estilos.css y js/ruta.js) y el sitio se DIVIDIÓ en páginas propias para que
  ningún archivo cargue con todo: index.html (inicio), nosotros.html, programas.html,
  territorio.html, noticias.html, contacto.html y 404.html. El CSS también quedó
  dividido: css/base.css (compartido), css/inicio.css y css/paginas.css.
- Concepto nuevo: un TALLER DE CIENCIA. Fondo hueso con papel cuadriculado, tarjetas
  blancas de borde grueso con sombra dura, cintas adhesivas (washi) sobre las fotos,
  sellos-sticker, números grandes y bloques de color (verde #0E6F7A, rojo #C0402A,
  amarillo sol #F0B429). Nada de papel crema ni láminas: paleta y piezas nuevas.
- MOMENTO FIRMA NUEVO: "Poner en marcha el taller" (js/taller.js). La consola bajo
  la ventana de Redito enciende uno a uno los cuatro componentes (enchufes), gira el
  dial, prende los LEDs, pone a Redito feliz y suelta la frase "¡Taller en marcha!".
  El botón alterna a "Apagar el taller". reduced-motion queda instantáneo.
- Cada página tiene su cabecera con migas, su color y su contenido: Nosotros une
  misión/visión/origen/valores y el equipo; Programas muestra el itinerario con
  acordeones; Territorio lleva el mapa oscuro de Colombia y Google Maps bajo
  consentimiento; Noticias lee de la base de datos; Contacto tiene canales y
  formulario. Redito y su física viven en el inicio; el mapa y las noticias cargan
  solo en sus páginas (los scripts se auto-desactivan si su elemento no existe).
- Limpieza: fuera PROMPT-REDISENO.md y data/schema.sql (viejo) del proyecto;
  PROMPT-MD-DE-CHAT.md se movió a Descargas. sitemap.xml ahora lista las 6 páginas.
- Versión 15.0.0 (cache-bust v=15.0). QA multi-página: 7 páginas cargan con su
  título y su enlace activo, sin errores de consola ni imágenes rotas; sin scroll
  horizontal (verificado con scrollX real); momento firma, acordeón, mapa con 33
  departamentos, noticias y formulario verificados por sonda; panel admin responde.

## V14 "Carta" (2026-09-25) — diseño RETIRADO (sus archivos ya no existen)

- REDISEÑO TOTAL DESDE CERO. Se BORRARON las cinco capas de diseño anteriores
  (css/styles.css, css/secciones.css, css/v11.css, css/v13.css, css/hero-robot.css
  y js/red-viva.js). Ahora hay un único sistema visual: css/estilos.css.
- Concepto nuevo: la web como una CARTA de la Fundación sobre papel de cuaderno
  científico. Retícula de puntos fija, curvas topográficas dibujadas a mano en la
  portada, láminas foliadas ("Lámina 01…08"), fichas con cruz de registro, retratos
  con marco de placa, itinerary de programa como paradas de un trazado y mapa en
  hoja oscura. Tinta #15181C, papel #EDE9DF, verde #0E6F7A, rojo #C0402A, ámbar #B9801F.
- Tipografía local (Sora + JetBrains Mono) y cero dependencias nuevas.
- MOMENTO FIRMA PROPIO: botón "Trazar la ruta" — dibuja con stroke-dashoffset la
  ruta que va de los cuatro componentes reales a Tunja y Colombia, un marcador rojo
  la recorre con getPointAtLength, aparecen las seis paradas escalonadas y se estampa
  el sello "Red Con Ciencia · Tunja · Boyacá". Se puede borrar. En móvil (≤980 px)
  degrada a una rejilla de paradas legible. Archivo nuevo: js/ruta.js.
- Redito mantiene su física y su silencio de 15 piezas, con el nuevo color; la
  burbuja ya no puede salirse de su caja y el indicador "desplázate" quedó sobre la
  escena, no sobre la banda de la ruta.
- Contenido intacto: mismos textos, mismas imágenes, mismas personas, mismas
  cifras, mismo CMS, misma seguridad V12 (llaves de acceso). Solo el diseño.
- Versión 14.0.0 (cache-bust v=14.0). QA sin desbordes a 360/390/768/1000/1200/1440,
  sin errores de consola, sin imágenes rotas.

## V13 "Diario de campo" (2026-09-25) — designing RETIRADO (sus archivos ya no existen)

- REDISEÑO DE CONCEPTO: se retira el look anterior y entra uno propio —
  papel crema de cuaderno científico con retícula de puntos, tinta azul,
  fichas editoriales de filete fino, sellos de goma para estados y
  polaroids con cinta para las fotos flotantes.
- El hero es ahora una PLACA DE TINTA incrustada en el papel (panel redondeado
  donde vive Redito con su escena orbital).
- MOMENTO FIRMA: botón "Enciende la red" — dibuja la red de conocimiento
  nodo a nodo sobre la placa (líneas que se trazan solas + nodos que brotan),
  queda encendida respirando y se puede apagar. prefers-reduced-motion respetado.
- Botones de tinta plana, kicker como etiqueta de laboratorio, subrayados
  irregulares en los títulos. css/v13.css va al final y reemplaza el acabado
  anterior sin tocar contenido, CMS ni seguridad.
- Versión 13.0.0. PROMPT-REDISEÑO.md: el prompt maestro de diseño, mejorado.

## V12 "Huella" (2026-09-24)

- Panel con LLAVES DE ACCESO (WebAuthn): huella del celular, rostro o Windows Hello.
  Se registran en Seguridad tras entrar con la clave; la clave sigue como respaldo.
  Verificación criptográfica completa en el servidor, sin dependencias nuevas (llaves-webauthn.js).
- El panel funciona igual en el dominio real: https://tudominio.com/admin/ (cookie Secure
  automática con HTTPS; guía ampliada en docs/DESPLIEGUE-HOSTINGER).
- ROBOT REDITO 2.0 desde cero: acabado plastilina, ojos con iris expresivos, expresiones
  (feliz / sorpresa / dormido tras 30 s), electrones-satélite y la pista "¡tócame!" se
  retira para siempre tras el primer saludo. Misma física acotada y accesibilidad.
- Arreglado: el botón "Ver la sede en Google Maps" desaparece al oprimirlo (antes quedaba
  flotando sobre el mapa) y ya no se apilan avisos repetidos sin cookies.
- Programas expandibles: "¿Cómo va este programa?" despliega estado real + acciones
  "Quiero participar / Quiero apoyar" por WhatsApp. Cinta de momentos con inclinación 3D.
- Confeti secreto: cinco toques al logo del pie.
- Versión 12.0.0 (cache-bust v=12.0). PROMPT-MD-DE-CHAT.md: prompt reutilizable para
  documentar cualquier chat en un .md.

## V11 "Plastilina" (2026-09-24)

- Acabado claymorphism: tarjetas, botones con grosor y prensa elástica de juguete, inputs con profundidad.
- Fondos con vida por escena (lavados de color precompuestos, sin filtros caros) + decoración flotante
  (moléculas, átomos, destellos y fotos en chips de arcilla) ubicada en carriles libres: nunca sobre el contenido.
- Pie de página: chips sociales en píldora ordenadas con punto "en línea" pulsante; corregido el salto
  del logo de WhatsApp (el chip ya no se levanta; reacción solo con cursor real).
- Montón de animaciones variadas (solo transform/opacity): reveals con muelle, fotos del equipo que flotan,
  iconos que se mecen, halo del botón de WhatsApp, doodles girando. prefers-reduced-motion respetado.
- En móvil se aligera: menos masa en movimiento, doodles ocultos en pantallas pequeñas, fotos solo desde 1440px.
- Versión 11.0.0 (cache-bust v=11.0). Seguridad, CMS, bandeja y correo de la V10 sin cambios.

# Fundación Red Con Ciencia — Sitio web (V10 "Fortaleza")

Versión 10: el sitio completo + panel del equipo blindado, correos,
editor de noticias con imágenes y documentación lista para entregar.

## Qué cambió en V10

- **Panel blindado contra hackers** (lo que pedías):
  · La clave ya NO vive en texto plano: se guarda cifrada con **scrypt**
    (salt aleatoria). Ver los archivos no revela la clave.
  · **Bloqueo anti fuerza bruta**: 5 intentos fallidos → 15 minutos de
    espera, con registro de cada intento (IP y fecha).
  · **Sesiones reales**: cookie HttpOnly + SameSite=Strict, token guardado
    solo como SHA-256, verificación **CSRF** en cada acción del panel.
  · **Subida de imágenes endurecida**: se valida la "magia" real del archivo
    (JPG/PNG/WebP), máximo 5 MB, nombre aleatorio generado por el servidor.
  · **Auditoría**: pestaña «Seguridad» con los últimos 60 eventos.
  · **La clave del panel no está escrita en ningún archivo**: ni en el
    código, ni en la documentación, ni en la base de datos. Solo se
    guarda su hash scrypt. En la primera arrancada la terminal la
    muestra una sola vez. Para restablecerla: `node cambiar-clave.js`.
- **Aviso por correo** (como dijo el profe): cada mensaje del formulario
  llega a la bandeja Y a un correo. Se configura desde el panel (Web3Forms,
  gratis), se prueba con tu correo y luego se cambia al oficial.
- **CMS de noticias con editor enriquecido**: títulos, listas, citas,
  enlaces, imágenes dentro del texto y de portada; tipos Noticia/Evento/
  Convocatoria/Taller; borradores; lector «Leer la publicación completa»
  en el sitio público. Todo saneado en el servidor (lista blanca).
- **Formulario con honeypot anti-bots** y límite de 5 mensajes/hora por IP.
- **Documentación** en `docs/`:
  · MANUAL-DEL-EQUIPO.md — para las administradoras, sin tecnicismos
  · DESPLIEGUE-HOSTINGER.md — dominio, VPS, https, correos
  · SEGURIDAD.md — qué protege al panel y cómo explicarlo
  · data/esquema.sql — esquema completo de la base de datos
- Pulido visual: brillo en botones, elevación de tarjetas, foco suave en
  formularios, lector de noticias a pantalla completa.

## Cómo usarlo

1. Instala **Node.js 22+** (nodejs.org).
2. Doble clic a `iniciar-servidor.bat` (Windows) o `./iniciar-servidor.sh`
   (Mac/Linux). También: `node server.js`.
3. Abre `http://localhost:8787`.
4. **Panel del equipo**: `http://localhost:8787/admin/`
   · En la primera arrancada, la terminal muestra la clave del panel
     **una sola vez**: anótala y cámbiala al entrar.
   · Si se te olvida: `node cambiar-clave.js` (con el servidor detenido).

## Estructura

```
server.js              → servidor todo-en-uno (sin dependencias)
index.html …           → el sitio público
admin/index.html       → panel del equipo (noticias, mensajes, correo, seguridad)
css/ js/ assets/       → diseño y funcionalidad
docs/                  → manuales (equipo, despliegue, seguridad)
data/                  → base de datos + hash de clave (se crea al arrancar)
uploads/               → imágenes subidas desde el panel (se crea al arrancar)
```

## Publicar en internet

Guía completa en `docs/DESPLIEGUE-HOSTINGER.md` (VPS de Hostinger + dominio
+ https + arranque automático). El sitio también funciona sin servidor
(GitHub Pages) en "modo archivo", pero el panel con bandeja, correos y
noticias guardadas requiere Node.js (VPS).

## Configuración rápida

`js/config.js`: WhatsApp oficial, redes sociales, versión.
El correo y la clave del panel se gestionan DENTRO del panel (no hay claves
en archivos editables).
