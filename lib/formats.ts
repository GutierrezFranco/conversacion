// Formatos de video: qué tipo de reel es. Se combinan con el estilo visual.

export type Format = {
  id: string;
  name: string;
  description: string;
  direction: string; // indicaciones para Claude
  suggests?: "pregunta"; // plantilla que se agrega sola al elegirlo
  autoLabels?: boolean; // Claude puede escribir etiquetas cortas por su cuenta
  wantsResources?: boolean;
};

export const FORMATS: Format[] = [
  {
    id: "camara",
    name: "Hablando a cámara",
    description: "Vos explicando algo a cámara. Cortes limpios, zooms para remarcar y subtítulos.",
    direction:
      "Formato hablando a cámara: el protagonista es la persona. Usá zooms leves para remarcar las frases importantes y pocos recursos encima de la cara.",
  },
  {
    id: "pregunta",
    name: "Cajita de preguntas",
    description: "Respondés una pregunta de un cliente. Arranca con la cajita y después tu respuesta.",
    direction:
      "Formato respuesta a una pregunta: la cajita de preguntas abre el video y queda mientras se presenta la pregunta. Después, la respuesta directa, sin vueltas.",
    suggests: "pregunta",
  },
  {
    id: "ejemplos",
    name: "Con ejemplos",
    description: "Explicás y mostrás: tus fotos y videos aparecen en pantalla completa cuando los nombrás.",
    direction:
      "Formato con ejemplos: cada vez que se menciona algo que coincide con un recurso, mostralo en pantalla completa (layout full) el tiempo que dura la explicación. Que se vea más el ejemplo que la persona.",
    wantsResources: true,
  },
  {
    id: "pasos",
    name: "Paso a paso",
    description: "Una reparación o un truco en pasos. Le sumamos carteles «PASO 1», «PASO 2»…",
    direction:
      "Formato paso a paso: identificá los pasos de la explicación y agregá una etiqueta corta en mayúsculas al empezar cada uno (por ejemplo «PASO 1», «PASO 2», o el nombre del paso en 1 a 3 palabras).",
    autoLabels: true,
  },
];

export function getFormat(id: string): Format | undefined {
  return FORMATS.find((f) => f.id === id);
}
