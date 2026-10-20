// Datos públicos del negocio. Configurables por variables de entorno para no dejar nada personal en el código.
export const SITE = {
  name: "Edición Simple",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hola@edicionsimple.com.ar",
  // Opcional: un WhatsApp del negocio, con código de país y sin "+" (ej: 5491112345678).
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "",
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "Edición Simple",
  updatedAt: "20 de octubre de 2026",
};

export function whatsappLink(text: string): string | null {
  return SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}` : null;
}
