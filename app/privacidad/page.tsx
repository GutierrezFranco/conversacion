import { LegalPage } from "@/components/LegalPage";
import { OUTPUT_RETENTION_DAYS, RAW_RETENTION_DAYS } from "@/lib/storage-rules";
import { SITE } from "@/lib/site";

export const metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updated={SITE.updatedAt}>
      <p>
        En {SITE.name} cuidamos tus datos. Acá te contamos qué datos usamos, para qué y cómo podés controlarlos, de acuerdo con la Ley
        25.326 de Protección de Datos Personales.
      </p>

      <h2>Qué datos usamos</h2>
      <ul>
        <li>
          <b>Tu cuenta:</b> tu mail (y tu nombre si entrás con Google).
        </li>
        <li>
          <b>Tu contenido:</b> los videos, imágenes y música que subís, y los reels que se generan.
        </li>
        <li>
          <b>Tus compras:</b> el paquete que compraste, el monto y el estado del pago. Los datos de tu tarjeta los maneja Mercado Pago:
          nosotros no los vemos ni los guardamos.
        </li>
        <li>
          <b>Uso:</b> qué ediciones pediste y cuántos créditos usaste.
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Para editar tus videos y mostrártelos.</li>
        <li>Para manejar tus créditos y tus compras.</li>
        <li>Para darte soporte y avisarte de cambios importantes del Servicio.</li>
      </ul>
      <p>No vendemos tus datos ni usamos tus videos para publicidad.</p>

      <h2>Con quién los compartimos</h2>
      <p>Para funcionar usamos proveedores que procesan los datos solo para prestar el Servicio:</p>
      <ul>
        <li>Alojamiento, base de datos y archivos (Vercel, Supabase y Cloudflare).</li>
        <li>Transcripción y análisis del video con inteligencia artificial (Anthropic y ElevenLabs, o un sistema propio).</li>
        <li>Pagos (Mercado Pago).</li>
      </ul>
      <p>Algunos de estos proveedores pueden almacenar datos fuera de Argentina.</p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Los videos originales se borran a los {RAW_RETENTION_DAYS} días y los reels editados a los {OUTPUT_RETENTION_DAYS}. Los
        recursos de tu carpeta y los datos de tu cuenta se guardan mientras tengas la cuenta. Los datos de compras se guardan el
        tiempo que exige la ley.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir acceder a tus datos, corregirlos o borrarlos (incluida tu cuenta) escribiendo a{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Te respondemos dentro de los plazos de la ley.
      </p>
      <p className="muted small">
        La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326, tiene la atribución de
        atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas
        vigentes en materia de protección de datos personales.
      </p>
    </LegalPage>
  );
}
