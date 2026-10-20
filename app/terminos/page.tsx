import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { CREDIT_PRICE_ARS, EDIT_CREDITS, ITERATION_CREDITS, PREMIUM_EDIT_CREDITS, formatArs } from "@/lib/pricing";
import { RAW_RETENTION_DAYS, OUTPUT_RETENTION_DAYS } from "@/lib/storage-rules";
import { SITE } from "@/lib/site";

export const metadata = { title: "Términos y condiciones" };

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updated={SITE.updatedAt}>
      <p>
        Estos términos regulan el uso de {SITE.name} (el «Servicio»), una herramienta online que edita videos de forma automática. Al
        crear una cuenta o usar el Servicio aceptás estos términos.
      </p>

      <h2>1. Qué ofrece el Servicio</h2>
      <p>
        Subís un video y el Servicio lo edita automáticamente: corta partes, agrega subtítulos, recursos, carteles y música según el
        estilo y las indicaciones que elijas. La edición la hace un sistema automático con inteligencia artificial, por lo que el
        resultado puede no ser perfecto. Podés pedir cambios sobre una edición, con el costo indicado en la app.
      </p>

      <h2>2. Cuenta</h2>
      <p>
        Para usar el Servicio necesitás una cuenta con un mail válido. Sos responsable de lo que se haga desde tu cuenta. Podemos
        suspender cuentas que usen el Servicio de forma abusiva o contraria a estos términos.
      </p>

      <h2>3. Créditos y precios</h2>
      <ul>
        <li>
          El Servicio funciona con créditos. Hoy, cada crédito equivale a {formatArs(CREDIT_PRICE_ARS)}: una edición cuesta{" "}
          {EDIT_CREDITS} créditos, una edición con estilo premium {PREMIUM_EDIT_CREDITS} y cada ronda de cambios {ITERATION_CREDITS}.
          Los precios vigentes se muestran siempre en la app antes de confirmar.
        </li>
        <li>Los pagos se procesan con Mercado Pago. No guardamos los datos de tu tarjeta.</li>
        <li>Los créditos no vencen, son personales y no se pueden transferir ni canjear por dinero.</li>
        <li>Si una edición falla por un problema del Servicio, los créditos usados se devuelven automáticamente a tu cuenta.</li>
        <li>Podemos cambiar los precios a futuro; los créditos que ya compraste mantienen su valor en créditos.</li>
      </ul>

      <h2>4. Derecho de arrepentimiento</h2>
      <p>
        Según la Ley 24.240 de Defensa del Consumidor, podés arrepentirte de una compra dentro de los 10 días corridos desde que la
        hiciste, siempre que no hayas usado los créditos comprados. Podés pedirlo desde el{" "}
        <Link href="/arrepentimiento">botón de arrepentimiento</Link>.
      </p>

      <h2>5. Tu contenido</h2>
      <ul>
        <li>Los videos, imágenes y música que subís siguen siendo tuyos.</li>
        <li>
          Nos das permiso para procesarlos con el único fin de prestarte el Servicio (transcribirlos, analizarlos y generar la edición).
        </li>
        <li>
          Declarás que tenés derecho a usar todo lo que subís, incluida la música. Si usás música con derechos de autor, las redes
          sociales pueden silenciar o bajar tu video; eso no es responsabilidad del Servicio.
        </li>
        <li>No podés subir contenido ilegal, que viole derechos de terceros o que muestre a otras personas sin su consentimiento.</li>
      </ul>

      <h2>6. Cuánto tiempo guardamos los archivos</h2>
      <p>
        Los videos originales se borran automáticamente a los {RAW_RETENTION_DAYS} días y los reels editados a los{" "}
        {OUTPUT_RETENTION_DAYS} días. Descargá tus reels cuando estén listos. Los recursos de tu carpeta quedan guardados hasta que
        los borres o cierres tu cuenta.
      </p>

      <h2>7. Disponibilidad y responsabilidad</h2>
      <p>
        Hacemos lo posible para que el Servicio funcione siempre, pero puede tener interrupciones o demoras. El Servicio se ofrece
        «tal cual»: no garantizamos resultados en redes sociales (alcance, ventas o seguidores). En ningún caso nuestra
        responsabilidad supera lo que pagaste en los últimos 3 meses.
      </p>

      <h2>8. Cambios en estos términos</h2>
      <p>Podemos actualizar estos términos. Si el cambio es importante, te avisamos por mail o dentro de la app.</p>

      <h2>9. Contacto</h2>
      <p>
        Por cualquier consulta escribinos a <a href={`mailto:${SITE.email}`}>{SITE.email}</a> o desde la página de{" "}
        <Link href="/contacto">ayuda y contacto</Link>.
      </p>
    </LegalPage>
  );
}
