# MANUAL DEL EQUIPO — Fundación Red Con Ciencia (V10)

Guía sencilla para las administradoras y administradores de la página.
No necesitas saber de programación: todo se hace desde el panel del equipo.

---

## 1. Cómo ingresar al panel

1. Arranca el servidor (doble clic en `iniciar-servidor.bat` o `node server.js`).
2. Abre en el navegador: **http://localhost:8787/admin/** (o `https://tudominio.com/admin/` cuando esté publicado).
3. Escribe la **clave del equipo** y pulsa «Entrar al panel».

> La clave **no está escrita en ningún archivo** del proyecto: solo existe su
> hash. Si es la primera vez que arrancas, la terminal te la muestra una sola vez
> en un recuadro: anótala. El propio panel te avisará para cambiarla después.

### Si olvidas la clave
1. Detén el servidor (en su terminal, `Ctrl + C`).
2. En la carpeta del proyecto ejecuta: `node cambiar-clave.js`
3. Escribe la clave nueva (no se ve al escribir) y confirma.
4. Vuelve a arrancar el servidor.

Ningún archivo del proyecto contiene la clave en texto plano: ni el código, ni
los documentos, ni la base de datos. Solo su huella criptográfica.

---

## 2. Publicar noticias, eventos, convocatorias y talleres

Pestaña **«Noticias y eventos»** → botón «+ Nueva noticia o evento»:

| Campo | Para qué sirve |
|---|---|
| Título | El encabezado de la publicación |
| Fecha | La que quieras mostrar (hoy por defecto) |
| Tipo | Noticia · Evento · Convocatoria · Taller (colorea la etiqueta en el sitio) |
| Estado | **Publicada** (se ve ya) o **Borrador** (solo el equipo la ve) |
| Etiqueta | Palabra corta opcional: «gratuito», «cupos limitados»… |
| Resumen corto | Dos o tres líneas: es lo primero que se lee |
| Imagen de portada | Sube un JPG, PNG o WebP de máximo 5 MB |
| Contenido | El texto completo, con títulos, listas, citas, enlaces e imágenes |

Pulsa **«Guardar publicación»** y aparece al instante en la página pública.
Las publicaciones con contenido completo muestran el enlace
«Leer la publicación completa» que abre un lector cómodo en pantalla.

**Consejos de imagen:** fotos horizontales (tipo 1000 × 600) se ven mejor como
portada; el servidor renombra las imágenes con un nombre seguro y rechaza
archivos que no sean imágenes reales.

---

## 3. Leer y responder los mensajes

Pestaña **«Mensajes»**: todo lo que la gente envía por «Escríbenos» queda
guardado ahí para todo el equipo. Los mensajes nuevos aparecen marcados con
«nuevo» y un punto ámbar en la pestaña.

- **Responder**: si la persona dejó su correo, el botón «Responder» abre tu
  aplicación de correo con el destino ya escrito.
- **Marcar leído / Eliminar**: cada mensaje tiene sus botones.

---

## 4. Activar el aviso por correo (2 minutos, gratis)

Pestaña **«Correo»**. Cuando alguien escribe, el mensaje llega a la bandeja
**y además a un correo electrónico** (para enterarte al instante en el celular).

1. Marca la casilla «Enviar copia de cada mensaje al correo».
2. Escribe el correo que recibirá los mensajes.
3. Consigue la clave gratuita de **web3forms.com** (te llega al correo en
   segundos) y pégala en el campo correspondiente.
4. Pulsa **«Guardar configuración»** y luego **«Enviar correo de prueba»**.

**Recomendación (como dijo el profe):** primero prueba con **tu propio correo**,
envía mensajes de prueba desde la página hasta confirmar que todo llega bien, y
solo entonces cambia al **correo oficial de la fundación** y guarda. El cambio
es inmediato, no hay que tocar nada más.

---

## 5. Seguridad: lo que ya está hecho y lo que te toca

Hecho por el sistema (no tienes que hacer nada):

- La clave **no se guarda en texto plano**: se cifra con scrypt en la base de
  datos. Ver el código o los archivos no revela la clave.
- **Bloqueo anti fuerza bruta**: 5 intentos fallidos de clave → 15 minutos de
  espera. Los intentos quedan registrados.
- Sesiones con **cookie HttpOnly** (el token no lo puede leer JavaScript) y
  **verificación CSRF** en cada acción del panel.
- Las imágenes subidas se validan **por contenido real**, se renombran y se
  limitan a 5 MB. Las carpetas internas (`data/`) no se sirven al público.
- Todo evento importante queda en el **registro de actividad** (pestaña
  «Seguridad»): ingresos, cambios, bloqueos, correos.

Tu responsabilidad como equipo:

1. **Cambiar la clave inicial** el primer día (pestaña «Seguridad»).
2. Usar una clave larga (mínimo 10 caracteres, letras y números; mejor una
   frase como `redconciencia2026tunja`).
3. Compartir la clave **solo con el equipo autorizado** y cambiarla si alguien
   sale del equipo.
4. Entrar siempre desde el candado 🔒 del navegador (https) cuando esté
   publicado.

---

## 6. Copias de seguridad

Toda la información vive en la carpeta `data/` (base de datos) y `uploads/`
(imágenes). Copia esas dos carpetas de vez en cuando a un USB o a la nube:
con eso puedes reconstruir todo en cualquier equipo.
