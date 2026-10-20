# Edición Simple

Editor de reels para técnicos de celulares que graban contenido y no quieren perder horas editando ni pagarle a un editor.

La persona sube su video crudo, elige un estilo y la app lo corta (saca errores, muletillas y silencios), le pone subtítulos con palabras destacadas, mete sus recursos (fotos de antes y después, logo, capturas) justo cuando los menciona y suma plantillas como la cajita de preguntas, el precio o un llamado a la acción. Si algo no le gusta, pide cambios y se vuelve a editar.

- **Precio:** $5.000 por video y $2.500 por cada ronda de cambios. Se compra con Mercado Pago en paquetes de 1, 5 o 10 videos. La primera edición es gratis.
- **Formatos:** hablando a cámara, cajita de preguntas, con ejemplos y paso a paso (`lib/formats.ts`). Se combinan con el estilo visual.
- **Referencias:** el usuario sube un reel o una captura que le gusta y elige qué copiar (subtítulos, animación, ritmo) con detalles escritos. Claude mira fotogramas, elige la fuente más parecida del catálogo (`lib/fonts.ts`) y guarda el resultado en «Mis estilos». Es gratis, con un límite de 5 por día.
- **Carpeta de recursos:** lo que suben queda guardado (hasta 1 GB por usuario) para reusarlo en otros reels.
- **Generadores con IA (fal):** el código está, pero apagado. Se prende con `NEXT_PUBLIC_AI_GENERATORS=1`.

## Cómo funciona

```
Navegador ──► Next.js (Vercel) ──► Supabase (login, base de datos, archivos)
                 │                         ▲
                 │ Mercado Pago            │ cola de trabajos
                 ▼                         │
           webhook de pago          Worker (Railway / Fly)
                                     ├─ ElevenLabs Scribe: transcripción palabra por palabra
                                     ├─ Claude: plan de edición (qué se corta, qué se destaca, dónde va cada recurso y plantilla)
                                     ├─ ffmpeg: render 1080×1920 con cortes, zooms, recursos, plantillas y subtítulos
                                     └─ fal (opcional): imágenes y videos generados
```

- **Créditos:** el saldo es la suma de los movimientos de `credit_ledger`; nunca se pisa un número. Crear un trabajo descuenta los créditos en la misma transacción. Si el trabajo falla, se devuelven solos.
- **Pagos:** los créditos se acreditan únicamente cuando llega el webhook de Mercado Pago, con firma válida y con el pago `approved` por el monto correcto. Si el webhook llega dos veces, no se acredita dos veces.
- **Precios:** todo está en `lib/pricing.ts`. 1 crédito = $500; una edición son 10 créditos y los cambios, 5. Una edición cuesta unos US$0,40 (Claude + transcripción + servidor).
- **Plantillas:** `lib/templates.ts` define los campos y `worker/templates.ts` las dibuja con ffmpeg (formas y texto), sin imágenes ni servicios externos.
- **Almacenamiento:** los crudos se borran a los 30 días y los reels editados a los 90 (lo hace el worker). Los recursos de la carpeta quedan hasta que el usuario los borra. Los límites están en `lib/storage-rules.ts`.

## Puesta en marcha

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pegá y ejecutá, en orden, `supabase/migrations/0001_init.sql`, `0002_assets.sql` y `0003_reference_styles.sql`.
3. En **Authentication → URL Configuration**, poné tu dominio en *Site URL* y agregá `https://tu-dominio/auth/callback` a *Redirect URLs* (y `http://localhost:3000/auth/callback` para probar en local).
4. Opcional: activá Google en **Authentication → Providers**.

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
npm test           # tests de créditos, firma de Mercado Pago y línea de tiempo
```

Para que Mercado Pago llegue a tu webhook en local, exponé el puerto con un túnel (por ejemplo `cloudflared tunnel --url localhost:3000`) y poné esa URL en `NEXT_PUBLIC_APP_URL`.

### 6. Publicar

- **Web:** importá el repo en [Vercel](https://vercel.com) y cargá las variables de entorno.
- **Worker:** desplegá `Dockerfile.worker` como *background worker* en Railway, Fly.io o Render, con las mismas variables. Con `WORKER_CONCURRENCY` (2 por defecto) elegís cuántos trabajos procesa a la vez.

## Antes de cobrar de verdad

- Revisá los costos de `lib/pricing.ts` contra tus facturas reales de fal y Anthropic del primer mes, y ajustá el margen.
- Si prendés los generadores con IA, actualizá `ARS_PER_USD` cuando cambie el dólar.
- Pasá de las credenciales de prueba de Mercado Pago a las de producción.
- Emití factura por cada venta (ARCA). Consultalo con tu contador.
- Publicá términos y condiciones, y una política de privacidad: guardás videos de otras personas.

## Próximos pasos posibles

- Estilos con motion graphics (tipo Glass 3D) usando Remotion en el worker.
- Elegir el gancho más fuerte automáticamente y generar 2 o 3 versiones del mismo reel.
- Usar como recurso una imagen o un video generado, sin descargarlo.
- Código de referido o cupones para comunidades.
