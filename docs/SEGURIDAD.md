# SEGURIDAD DEL PANEL — Qué protección tiene y por qué (V10)

Preocupación legítima: «cualquier hacker puede sacar esos archivos de manera
fácil y hacer cosas malas». Esta versión ataca exactamente eso. Aquí está el
detalle, en claro y para explicar al profe o al cliente.

---

## 1. La clave ya no viaja ni se guarda en texto plano

**Antes:** la clave vivía en `data/credenciales.json` y en `js/config.js`.
Cualquiera que abriera los archivos (o el repositorio) la leía.

**Ahora:**
- Solo se guarda un **hash scrypt con sal aleatoria de 16 bytes**. scrypt es el
  algoritmo recomendado para claves (resistente a GPU y ataques de diccionario).
- La clave **no está en el código fuente** ni en el HTML que llega al navegador.
- Al cambiar la clave desde el panel, se rota el hash y **se destruyen todas
  las sesiones abiertas** (nadie queda adentro con la puerta vieja).

## 2. Bloqueo anti fuerza bruta

- Contador persistente en la base de datos: **5 intentos fallidos → 15 minutos
  de bloqueo** por dirección IP, aunque reinicies el servidor.
- Cada intento (exitoso o no) queda en la tabla `intentos_login` y en la
  bitácora con fecha e IP.
- El mensaje de error es genérico («Clave incorrecta»): no da pistas.

## 3. Sesiones de verdad, no tokens en la mano

- Al entrar se crea una sesión: el servidor guarda el **SHA-256 del token**
  (nunca el token plano) con su expiración (12 h) e IP/agente.
- El token va en una **cookie HttpOnly + SameSite=Strict**: JavaScript no puede
  leerla, y otros sitios no pueden usarla contra el panel (anti-CSRF de base).
- Toda acción de escritura exige además el **header `x-csrf`** con un token
  aleatorio por sesión: un atacante externo no puede fabricar peticiones
  válidas desde otro sitio ni desde un enlace tramposo.
- Cerrar sesión borra la sesión del servidor, no solo la cookie.

## 4. El panel no se puede embeber ni indexar

Cabeceras en todas las páginas del panel y la API:
`X-Frame-Options: DENY` (no se puede esconder en un iframe),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Cache-Control: no-store`, `X-Robots-Tag: noindex` (Google no lo lista).

## 5. Subida de imágenes endurecida

- Solo imágenes **JPG, PNG o WebP** verificadas por **magia de bytes** (no basta
  con la extensión: un "foto.jpg" que sea un script es rechazado).
- Máximo **5 MB**; nombre **aleatorio generado por el servidor** (nada de
  nombres con rutas trampa `../../`); carpeta dedicada `uploads/`.
- Los archivos internos (`data/credenciales.json`, la base de datos) **no se
  sirven al público**: pedirlos devuelve 403.

## 6. Base de datos siempre parametrizada

Todas las consultas usan **consultas preparadas** (Prisma en el espacio web,
`?` en server.js). No existe la inyección SQL por formulario o buscador.

## 7. Contenido del sitio a prueba de travesuras

- Los textos del formulario se limpian (se cortan caracteres de control) y se
  **escapan al mostrarlos**: nadie puede inyectar HTML/JavaScript mediante el
  formulario (anti-XSS).
- El cuerpo enriquecido de las noticias se **sanitiza en el servidor con una
  lista blanca** de etiquetas: se eliminan `<script>`, `on*`, `javascript:`,
  estilos, iframes y cualquier atributo extraño antes de guardar.
- Formulario con **honeypot** anti-bots y **límite de 5 mensajes por hora por
  IP**.

## 8. Auditoría

Pestaña «Seguridad» del panel: últimas 60 acciones (ingresos, bloqueos,
cambios de clave, subidas, correos) con fecha e IP. Sospechas → se ven al
instante.

---

## Qué NO cubre (y cómo cubrirlo barato)

| Riesgo | Medida |
|---|---|
| Contraseña débil del equipo | Política de 10+ caracteres y aviso hasta cambiar la inicial |
| HTTPS ausente | Certificado gratis Let's Encrypt (ver guía de despliegue) |
| Servidor desactualizado | `apt upgrade` mensual + Node 22 actualizado |
| Pérdida de datos | Copia de las carpetas `data/` y `uploads/` |
| Muchas personas con la clave | Usar una clave por persona/rol y rotarla cuando cambie el equipo |

**Resumen para el profe:** claves con scrypt, sesiones HttpOnly + CSRF, bloqueo
de fuerza bruta persistente, subidas validadas por contenido, carpeta interna
bloqueada, SQL parametrizado, HTML sanitizado por lista blanca y bitácora de
auditoría. Todo sin dependencias externas, corriendo en cualquier Node 22+.

## Llaves de acceso (huella) — V12

Además de la clave escrita (que sigue siendo el respaldo), el panel acepta llaves de
acceso WebAuthn: la huella del celular, el rostro, Windows Hello o una llave USB.

- Se registran solo desde dentro del panel (pestaña Seguridad), con sesión y CSRF válidos.
- El servidor verifica criptográficamente cada ingreso: reto de un solo uso, origen exacto,
  dominio (rpId), presencia del usuario y contador anti-clonación. Firmas ES256/RS256 con
  el crypto nativo de Node, sin dependencias externas.
- Cada llave se guarda en la tabla SQLite `llaves` (nunca la clave, solo su llave pública).
- Entrar con huella queda en la bitácora como `webauthn-login-ok`; los intentos fallidos
  suman al mismo bloqueo de 5 intentos / 15 minutos que la clave.
- Requisito: HTTPS en producción (o localhost en desarrollo). WebAuthn no funciona en http.
- Si se pierde un dispositivo: entrar con la clave y eliminar su llave en Seguridad.
