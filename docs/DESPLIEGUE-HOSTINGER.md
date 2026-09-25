# GUÍA DE DESPLIEGUE — Publicar la página en internet (V10)

Esta guía explica, paso a paso, cómo llevar la página de tu computador a
internet con dominio propio. Está pensada para **Hostinger**, que es la opción
recomendada (buena relación precio/calidad y soporte en español).

---

## Opción A (recomendada): VPS de Hostinger

El sitio necesita Node.js 22+ porque trae panel de administración con base de
datos. Eso funciona en un **VPS** (un "computador en la nube" que solo usa la
fundación).

### Paso 1 — Contratar
1. En Hostinger elige el plan **VPS** (el más básico alcanza de sobra).
2. Registra (o conecta) el **dominio .com**: por ejemplo
   `redconciencia.org` o `fundacionredconciencia.com`.
   Consejo: si el exacto está ocupado, `.org` queda perfecto para una fundación.

### Paso 2 — Preparar el servidor
1. En el panel de Hostinger, instala el sistema operativo **Ubuntu 24.04**
   (la plantilla «Node.js» también sirve).
2. Conéctate por SSH (Hostinger te muestra el comando y la clave).
3. Instala Node.js 22:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo apt-get install -y nginx certbot python3-certbot-nginx
   ```

### Paso 3 — Subir el sitio
1. Sube la carpeta descomprimida del ZIP al servidor, por ejemplo con
   FileZilla (SFTP) a `/home/fundacion/web`.
2. Prueba que arranca:
   ```bash
   cd /home/fundacion/web
   node server.js
   ```
   Con eso la página vive en el puerto 8787. Detenla con Ctrl+C.

### Paso 4 — Arranque automático (pm2)
```bash
sudo npm install -g pm2
cd /home/fundacion/web
pm2 start server.js --name fundacion
pm2 save && pm2 startup   # sigue las instrucciones que imprime
```

### Paso 5 — Conectar el dominio (nginx + https)
1. En el panel DNS de Hostinger apunta el dominio a la IP del VPS (registro A).
2. Crea el archivo `/etc/nginx/sites-available/fundacion`:
   ```nginx
   server {
     listen 80;
     server_name tudominio.com www.tudominio.com;
     location / {
       proxy_pass http://127.0.0.1:8787;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       client_max_body_size 8m;
     }
   }
   ```
3. Actívalo y pon el candado (https gratis de Let's Encrypt):
   ```bash
   sudo ln -s /etc/nginx/sites-available/fundacion /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d tudominio.com -d www.tudominio.com
   ```

**Listo:** `https://tudominio.com` es la página; el panel queda en
`https://tudominio.com/admin/`.

### Correos: recuerda
El aviso de mensajes usa **Web3Forms** (HTTP). Funciona en cualquier hosting,
no necesita abrir el puerto 25 ni configurar SMTP. Configúralo desde el panel
(pestaña «Correo») con el correo oficial de la fundación.

### Mantenimiento mínimo
- `pm2 restart fundacion` tras subir archivos nuevos.
- Copia de seguridad: comprime las carpetas `data/` y `uploads/`.
- `sudo apt update && sudo apt upgrade` de vez en cuando.

---

## Opción B: si contratan hosting compartido (sin Node)

Los planes compartidos de Hostinger solo ejecutan PHP. En ese caso hay dos
caminos:

1. **La parte visible se puede publicar como archivos estáticos** (sube todo
   menos `server.js`): el sitio se ve completo, las noticias se muestran desde
   `js/data/noticias.js` y el formulario envía por WhatsApp. Es el "modo
   archivo" que ya trae el sitio.
2. **El panel con base de datos, bandeja y correos requiere la Opción A**
   (VPS) o un hosting con Node.js. Es lo recomendado si la fundación va a
   publicar noticias sola, que es justo lo que piden.

Si la fundación ya pagó un plan compartido, diles con confianza: «la página ya
está lista; para que ustedes mismos publiquen noticias necesitamos el plan VPS»
— el costo es bajo y es lo correcto para esta versión.

---

## Opción C: demostración local (gratis, para presentaciones)

Para mostrar la página en un computador sin internet:
1. Descarga Node.js en nodejs.org e instálalo.
2. Doble clic a `iniciar-servidor.bat` (Windows) o `iniciar-servidor.sh`.
3. Abre `http://localhost:8787` — página completa, panel incluido.

---

## Lista de chequeo antes de entregar

- [ ] Clave inicial cambiada desde el panel (pestaña «Seguridad»)
- [ ] Correo de prueba enviado y recibido
- [ ] Correo definitivo de la fundación configurado
- [ ] Primera noticia publicada de verdad
- [ ] WhatsApp funcionando (botón y formulario)
- [ ] Mapa con la sede de Tunja visible
- [ ] Copia de seguridad de `data/` y `uploads/` hecha

## El panel en el dominio real (V12)

Cuando la página esté en tu dominio, el panel NO se maneja desde localhost:

- El panel queda en `https://tudominio.com/admin/` (mismo panel, misma clave que cambiaste).
- No existe "localhost" en producción: quien administre la página entra desde cualquier
  navegador del mundo con esa dirección. La clave viaja cifrada por HTTPS.
- **Llaves de acceso (huella):** funcionan en el dominio SOLO con HTTPS activo (la guía ya
  incluye certbot/Let's Encrypt). Cada persona registra su huella desde SU dispositivo
  entrando una vez con la clave; después entra con la huella sin escribirla.
  Una huella registrada en localhost no sirve en el dominio (WebAuthn es por dominio):
  se registra de nuevo ahí, una sola vez.
- La configuración nginx del paso 5 debe reenviar el protocolo real (agregar una línea):

```
proxy_set_header X-Forwarded-Proto $scheme;
```

  Con eso la cookie de sesión se marca `Secure` automáticamente en producción.
- Al entregar a la fundación: cambia la clave, borra llaves de prueba y deja la de ellas.
