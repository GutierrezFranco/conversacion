// Plantillas gráficas que se dibujan encima del video, sin IA generativa: el usuario escribe
// el texto y Claude decide en qué momento aparece.

export type TemplateField = { key: string; label: string; placeholder: string; maxLength: number; optional?: boolean; default?: string };

export type Template = {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
  // Dónde va si Claude no encuentra un mejor momento.
  placement: "start" | "end" | "mention";
  defaultSeconds: number;
  // Cómo tiene que usarla Claude.
  hint: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "pregunta",
    name: "Cajita de preguntas",
    description: "Como la de las historias de Instagram. Ideal para responder lo que te preguntan los clientes.",
    fields: [
      { key: "titulo", label: "Título", placeholder: "Me preguntaron", maxLength: 30, optional: true, default: "Me preguntaron" },
      { key: "pregunta", label: "Pregunta", placeholder: "¿Conviene cambiar el módulo o comprar otro celular?", maxLength: 110 },
    ],
    placement: "start",
    defaultSeconds: 3.5,
    hint: "Mostrala cuando se presenta o se lee la pregunta (casi siempre al principio). Dejala hasta que empieza la respuesta.",
  },
  {
    id: "gancho",
    name: "Título gancho",
    description: "Una frase grande arriba durante los primeros segundos para que no pasen de largo.",
    fields: [{ key: "texto", label: "Texto", placeholder: "Esto le pasa al 90% de los iPhone", maxLength: 60 }],
    placement: "start",
    defaultSeconds: 3,
    hint: "Va en los primeros segundos del video, desde la primera palabra que queda.",
  },
  {
    id: "precio",
    name: "Precio o presupuesto",
    description: "Tarjeta con el servicio y el precio, para cuando lo nombrás.",
    fields: [
      { key: "servicio", label: "Servicio", placeholder: "Cambio de módulo iPhone 13", maxLength: 40 },
      { key: "precio", label: "Precio", placeholder: "$85.000", maxLength: 20 },
    ],
    placement: "mention",
    defaultSeconds: 3,
    hint: "Mostrala cuando se menciona el precio o el servicio.",
  },
  {
    id: "etiqueta",
    name: "Etiqueta",
    description: "Un cartel corto: ANTES, DESPUÉS, PASO 1, OJO… Podés sumar varias.",
    fields: [{ key: "texto", label: "Texto", placeholder: "ANTES", maxLength: 24 }],
    placement: "mention",
    defaultSeconds: 2.5,
    hint: "Mostrala en el momento que indica la nota del usuario, o cuando se dice esa palabra o idea.",
  },
  {
    id: "cta",
    name: "Llamado a la acción",
    description: "Cierre con lo que querés que hagan: escribirte, seguirte, comentar.",
    fields: [
      { key: "texto", label: "Texto", placeholder: "Escribime por WhatsApp", maxLength: 40 },
      { key: "detalle", label: "Detalle", placeholder: "Link en mi perfil", maxLength: 40, optional: true },
    ],
    placement: "end",
    defaultSeconds: 3.5,
    hint: "Va al final, cuando se dice el llamado a la acción o en los últimos segundos.",
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export type TemplateInstance = { templateId: string; values: Record<string, string>; note: string };

// Valores con los opcionales completados por defecto, o un error para mostrar al usuario.
export function normalizeInstance(i: TemplateInstance): TemplateInstance {
  const t = getTemplate(i.templateId);
  if (!t) throw new Error("Esa plantilla no existe.");
  const values: Record<string, string> = {};
  for (const f of t.fields) {
    const v = (i.values[f.key] ?? "").trim().slice(0, f.maxLength);
    if (!v && !f.optional) throw new Error(`Completá "${f.label}" en la plantilla ${t.name}.`);
    values[f.key] = v || f.default || "";
  }
  return { templateId: t.id, values, note: i.note.trim().slice(0, 300) };
}
