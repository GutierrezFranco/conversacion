# Edición Simple

Editor de reels para técnicos de celulares que graban contenido y no quieren perder horas editando ni pagarle a un editor.

La persona sube su video crudo, elige un estilo y la app lo corta (saca errores, muletillas y silencios), le pone subtítulos con palabras destacadas, mete sus recursos (fotos de antes y después, logo, capturas) justo cuando los menciona y suma plantillas como la cajita de preguntas, el precio o un llamado a la acción. Si algo no le gusta, pide cambios y se vuelve a editar.

- **Precio:** $5.000 por video ($7.000 con un estilo premium) y $2.500 por cada ronda de cambios. Se compra con Mercado Pago en paquetes de 1, 5 o 10 videos. La primera edición es gratis.
- **Dos motores:** los estilos normales se dibujan con ffmpeg (rápido y barato). Los premium y los copiados de una referencia, con [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML + GSAP renderizado con Chrome): mismas medidas, pero con animaciones.
- **Formatos:** hablando a cámara, cajita de preguntas, con ejemplos y paso a paso (`lib/formats.ts`). Se combinan con el estilo visual.
- **Referencias:** el usuario sube un reel o una captura que le gusta y elige qué copiar (subtítulos, animación, ritmo) con detalles escritos. Claude mira fotogramas, elige la fuente más parecida del catálogo (`lib/fonts.ts`) y guarda el resultado en «Mis estilos». Es gratis, con un límite de 5 por día.
- **Cajitas y comentarios:** generador propio (`lib/stickers.ts`) de la burbuja de «responder comentario» de TikTok, la cajita de preguntas de Instagram y el comentario de Instagram. Corre en el navegador, sin costo: descarga un PNG transparente o lo guarda en la carpeta. También existe como plantilla «Responder comentario» dentro del video.
- **Música de fondo:** el usuario sube su tema a la carpeta y elige el volumen. ffmpeg la repite si es corta, la baja automáticamente cuando hay voz (ducking) y la apaga al final.
- **Carpeta de recursos:** lo que suben queda guardado (hasta 1 GB por usuario) para reusarlo en otros reels.
- **Generadores con IA (fal):** el código está, pero apagado. Se prende con `NEXT_PUBLIC_AI_GENERATORS=1`.

## Cómo funciona

```
Navegador ──► Next.js (Vercel/Netlify) ──► Supabase (login, base de datos) + Supabase Storage o Cloudflare R2 (archivos)
                 │                         ▲
                 │ Mercado Pago            │ cola de trabajos
                 ▼                         │
           webhook de pago          Worker (Railway / Fly)
                                     ├─ ElevenLabs Scribe o Whisper: transcripción palabra por palabra
                                     ├─ Claude: plan de edición (qué se corta, qué se destaca, dónde va cada recurso y plantilla)
                                     ├─ ffmpeg: render 1080×1920 con cortes, zooms, recursos, música, plantillas y subtítulos
                                     ├─ HyperFrames (premium): subtítulos y plantillas animados encima del video cortado
                                     └─ fal (opcional): imágenes y videos generados
```

- **Créditos:** el saldo es la suma de los movimientos de `credit_ledger`; nunca se pisa un número. Crear un trabajo descuenta los créditos en la misma transacción. Si el trabajo falla, se devuelven solos.
- **Pagos:** los créditos se acreditan únicamente cuando llega el webhook de Mercado Pago, con firma válida y con el pago `approved` por el monto correcto. Si el webhook llega dos veces, no se acredita dos veces.
- **Precios:** todo está en `lib/pricing.ts`. 1 crédito = $500; una edición son 10 créditos (14 premium) y los cambios, 5. Una edición cuesta unos US$0,15 a 0,30 (sobre todo Claude); el render premium suma centavos.
- **Plantillas:** `lib/templates.ts` define los campos y `worker/templates.ts` las dibuja con ffmpeg (formas y texto), sin imágenes ni servicios externos.
- **Almacenamiento:** los crudos se borran a los 30 días y los reels editados a los 90 (lo hace el worker). Los recursos de la carpeta quedan hasta que el usuario los borra. Los límites están en `lib/storage-rules.ts`.

## Puesta en marcha

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pegá y ejecutá, en orden, los archivos de `supabase/migrations/` (del `0001` al `0005`). Podés probarlos antes en tu máquina con `npm run test:db`.
3. En **Authentication → URL Configuration**, poné tu dominio en *Site URL* y agregá `https://tu-dominio/auth/callback` a *Redirect URLs* (y `http://localhost:3000/auth/callback` para probar en local).
4. En **Storage → Settings**, subí el límite de tamaño por archivo a 1 GB (los crudos pesan cientos de MB). En el plan gratis el máximo es bajo: para la prueba con alumnos conviene el plan Pro.
5. Opcional: activá Google en **Authentication → Providers**.

### 2. Mercado Pago

1. En [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app), creá una aplicación de **Checkout Pro**.
2. Copiá el **Access Token**. Arrancá con el de prueba y usá usuarios de prueba para pagar.
3. En **Webhooks**, configurá la URL `https://tu-dominio/api/webhooks/mercadopago`, marcá el evento **Pagos** y copiá la **clave secreta** (`MP_WEBHOOK_SECRET`).

### 3. IA

- `ANTHROPIC_API_KEY`: de [platform.claude.com](https://platform.claude.com).
- `ELEVENLABS_API_KEY`: de [elevenlabs.io](https://elevenlabs.io) (sección API Keys), para la transcripción.
- `FAL_KEY` (opcional): solo si prendés los generadores con IA.

### 4. Variables de entorno

Copiá `.env.example` a `.env.local` y completalo. La web y el worker usan las mismas variables.

### 5. Correr en local

```bash
npm install
npm run dev        # la web en http://localhost:3000
npm run worker     # en otra terminal; necesita ffmpeg instalado
npm test           # tests de créditos, firma de Mercado Pago, línea de tiempo y plantillas
npm run test:db    # corre las migraciones SQL en un Postgres en memoria y prueba la lógica de créditos
```

Para que Mercado Pago llegue a tu webhook en local, exponé el puerto con un túnel (por ejemplo `cloudflared tunnel --url localhost:3000`) y poné esa URL en `NEXT_PUBLIC_APP_URL`.

### 6. Publicar

- **Web:** importá el repo en [Vercel](https://vercel.com) y cargá las variables de entorno.
- **Worker:** desplegá `Dockerfile.worker` como *background worker* en Railway, Fly.io o Render, con las mismas variables. Trae ffmpeg, Chromium (para el motor premium) y las tipografías. Con `WORKER_CONCURRENCY` (2 por defecto) elegís cuántos trabajos procesa a la vez; para el motor premium conviene una máquina de 4 vCPU y 4 GB de RAM.
- En local, el motor premium necesita Chrome: si no lo encuentra, corré `npx hyperframes browser ensure` o poné la ruta en `HYPERFRAMES_BROWSER_PATH`.

## Versión sin costos fijos

Para arrancar sin pagar nada por mes (solo Claude por cada video, que sale del precio que cobrás):

| Parte | Gratis | Cómo |
|---|---|---|
| Web | Netlify (plan gratis) o Vercel Hobby mientras no cobres | Importar el repo y cargar las variables. Vercel Hobby no permite uso comercial. |
| Base y login | Supabase (plan gratis) | Igual que arriba. Con el worker andando, el proyecto no se pausa por inactividad. |
| Videos y recursos | Cloudflare R2 (10 GB gratis, sin cargo por descargas) | `STORAGE_PROVIDER=r2` y las variables `R2_*`. El plan gratis de Supabase no acepta archivos de más de 50 MB. |
| Transcripción | Whisper dentro del worker | `TRANSCRIBER=whisper`. Ya viene compilado en `Dockerfile.worker` con el modelo `small`. |
| Mails del login | Resend (unos 3.000 por mes gratis) | Supabase → Authentication → SMTP. El envío por defecto de Supabase tiene un límite muy bajo por hora. |
| Worker | Una notebook que no uses, o un servidor gratis/barato | Ver abajo. |

**Cloudflare R2:** creá un bucket (por ejemplo `edicion-simple`); en **R2 → Manage API tokens** creá un token con permiso *Object Read & Write* para ese bucket y copiá *Access Key ID*, *Secret Access Key* y tu *Account ID*. En el bucket, **Settings → CORS policy**, permití que el navegador suba archivos:

```json
[{ "AllowedOrigins": ["https://tu-dominio"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
```

**Dónde correr el worker:**
- **Una notebook que no uses:** instalá Docker, cloná el repo y corré `docker build -f Dockerfile.worker -t edicion-worker . && docker run -d --restart=always --env-file .env edicion-worker`. Dejala enchufada y con la suspensión desactivada. Con 4 núcleos y 8 GB de RAM anda bien; con menos, poné `WORKER_CONCURRENCY=1`. Si se apaga, los videos esperan en la cola y se editan cuando vuelve.
- **Un VPS chico** (por ejemplo Hetzner, desde unos US$5 a 8 por mes con 2 a 4 núcleos): siempre prendido, mismos comandos.
- **Oracle Cloud Always Free:** un servidor ARM de 4 núcleos gratis para siempre; el registro pide tarjeta y a veces no hay cupo.

## Salir a probar con alumnos

1. Publicá web y worker (pasos de arriba) con las credenciales **de prueba** de Mercado Pago.
2. Creá tu cuenta en la app y editá 10 o 15 crudos tuyos de distintos tipos (hablando a cámara, cajita de preguntas, paso a paso, con fotos). Anotá qué cortes o carteles no te convencen: se ajustan en `worker/plan.ts` (indicaciones a Claude), `lib/styles.ts` y `lib/templates.ts`.
3. Probá una compra con un usuario de prueba de Mercado Pago y fijate que los créditos se acrediten solos.
4. Creá un código de regalo para los alumnos de la prueba desde el SQL Editor:
   ```sql
   insert into public.promo_codes (code, credits, max_uses) values ('MDM-PRUEBA', 30, 20);
   ```
   (30 créditos = 3 videos normales o 2 premium, para 20 personas). Lo canjean en **Créditos → ¿Tenés un código de regalo?**.
5. Mirá cómo va en Supabase: la tabla `jobs` muestra cada edición (estado, error, costo) y `credit_ledger` cada movimiento de créditos.
6. Con lo que digan, ajustá precios y estilos, pasá Mercado Pago a producción y lanzá.

## Antes de cobrar de verdad

- Revisá los costos de `lib/pricing.ts` contra tus facturas reales de Anthropic y ElevenLabs del primer mes, y ajustá el margen.
- Si prendés los generadores con IA, actualizá `ARS_PER_USD` cuando cambie el dólar.
- Pasá de las credenciales de prueba de Mercado Pago a las de producción.
- Emití factura por cada venta (ARCA). Consultalo con tu contador.
- Publicá términos y condiciones, y una política de privacidad: guardás videos de otras personas.

## Próximos pasos posibles

- Más estilos premium y que Claude escriba el HTML de un estilo copiado de una referencia (hoy elige entre parámetros fijos).
- Elegir el gancho más fuerte automáticamente y generar 2 o 3 versiones del mismo reel.
- Usar como recurso una imagen o un video generado, sin descargarlo.
- Código de referido para que los técnicos recomienden la app.
