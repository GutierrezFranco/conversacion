// Los generadores de imágenes y videos con IA (fal) quedan apagados hasta que los quieras sumar.
// Para prenderlos: NEXT_PUBLIC_AI_GENERATORS=1 en la web y FAL_KEY en el worker.
export const AI_GENERATORS = process.env.NEXT_PUBLIC_AI_GENERATORS === "1";
