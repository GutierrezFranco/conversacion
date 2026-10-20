import { LegalPage } from "@/components/LegalPage";
import { WithdrawalForm } from "@/components/WithdrawalForm";

export const metadata = { title: "Botón de arrepentimiento" };

export default function WithdrawalPage() {
  return (
    <LegalPage title="Botón de arrepentimiento">
      <p>
        Si compraste créditos en los últimos 10 días corridos y todavía no los usaste, podés arrepentirte de la compra y te devolvemos
        el dinero por el mismo medio de pago (Ley 24.240 y Resolución 424/2020).
      </p>
      <WithdrawalForm />
    </LegalPage>
  );
}
