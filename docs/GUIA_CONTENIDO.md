# GUÍA DE CONTENIDO — cómo integrar lo oficial

Todo el contenido vive en **`data/contenido.js`**. Ningún cambio de
contenido requiere tocar HTML, CSS ni JS.

## 1. Misión y visión (cuando la Fundación las apruebe)

En `index.html`, sección `#nosotros`, cada tarjeta «Por confirmar» tiene un
`<h3>` y un `<p>`. Sustituir:

```html
<h3>Por confirmar</h3>
<p>El texto oficial de la misión se incorporará aquí…</p>
```

por el texto oficial. La clase `tarjeta-mv` mantiene la composición
editorial (Misión = Propósito, Visión = Horizonte).

## 2. Programas y proyectos

`data/contenido.js → programas.fichas`. Cada ficha:

```js
{ titulo: "Nombre oficial del programa", eje: "red | investigacion | desarrollo | derechos | territorio" }
```

El filtro y el modal se regeneran solos. Cuando existan galerías o
detalles por programa, ampliar el objeto de la ficha y el modal en
`interactions.js → programas()` (un solo lugar).

## 3. Municipios confirmados en el mapa

`js/mapa-colombia.js` trae los 33 departamentos con sus nombres reales.
Para destacar presencia confirmada, en `interactions.js → mapaColombia()`
añadir el nombre del departamento a la lista de destacados:

```js
var CONFIRMADOS = ["Boyacá"]; // + los que confirme la Fundación
```

(Extraer la lista a `data/contenido.js → territorio.presenciaConfirmada`
al ampliar). Municipios por debajo del nivel departamental se agregan como
marcadores con sus coordenadas reales — nunca aproximadas.

## 4. Dirección física de la sede (Google Maps)

`data/contenido.js → territorio.mapsEmbed`. Reemplazar la URL del embed
por la del lugar exacto:

```
https://maps.google.com/maps?q=DIRECCION%20ESCRAPEADA&z=17&output=embed
```

Y actualizar la nota «Dirección física de la sede: por confirmar» en
`index.html` (sección `#territorio`).

## 5. Galería fotográfica oficial

Reemplazar los archivos en `assets/images/galeria/` por el material
autorizado (mismos nombres o actualizar `data/contenido.js → galeria.items`).
Cada ítem: `{ archivo, titulo, categoria }`. Las categorías alimentan la
navegación del luzbox.

## 6. Contacto

`data/contenido.js → contacto`. WhatsApp y teléfono ya son el número
confirmado (321 9359764 → wa.me/573219359764). Si llega correo oficial,
añadir un canal nuevo en `index.html` copiando la estructura `.canal`.

## Regla de oro

**Nada se publica como oficial sin aprobación de la Fundación.** Mientras
un dato no llegue, su lugar se mantiene marcado «Por confirmar» — eso es
honestidad, no un vacío.
