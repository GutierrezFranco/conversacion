// Tipografías que el worker tiene instaladas (ver Dockerfile.worker). Cuando la IA analiza una
// referencia, elige la más parecida de esta lista: no puede usar una fuente que no esté acá.

export type Font = {
  ass: string; // nombre que usa ffmpeg/libass
  italic?: boolean;
  file: string; // ruta dentro de github.com/google/fonts
  css: { family: string; weight: number; italic?: boolean }; // para la vista previa en la web
  looks: string; // descripción para que la IA la reconozca
};

export const FONTS: Font[] = [
  { ass: "Poppins Medium", file: "ofl/poppins/Poppins-Medium.ttf", css: { family: "Poppins", weight: 500 }, looks: "sans geométrica redondeada, peso medio, limpia" },
  { ass: "Poppins SemiBold", file: "ofl/poppins/Poppins-SemiBold.ttf", css: { family: "Poppins", weight: 600 }, looks: "sans geométrica redondeada, semi negrita" },
  { ass: "Poppins Bold", file: "ofl/poppins/Poppins-Bold.ttf", css: { family: "Poppins", weight: 700 }, looks: "sans geométrica redondeada, negrita, la típica de subtítulos de reels" },
  { ass: "Poppins ExtraBold", file: "ofl/poppins/Poppins-ExtraBold.ttf", css: { family: "Poppins", weight: 800 }, looks: "sans geométrica muy gruesa, tipo Montserrat Black" },
  { ass: "Anton", file: "ofl/anton/Anton-Regular.ttf", css: { family: "Anton", weight: 400 }, looks: "condensada alta e impactante, tipo Impact" },
  { ass: "Bebas Neue", file: "ofl/bebasneue/BebasNeue-Regular.ttf", css: { family: "Bebas Neue", weight: 400 }, looks: "condensada, solo mayúsculas, fina y alta" },
  { ass: "Archivo Black", file: "ofl/archivoblack/ArchivoBlack-Regular.ttf", css: { family: "Archivo Black", weight: 400 }, looks: "grotesca ancha y muy pesada, tipo Helvetica Black" },
  { ass: "Kanit Bold", file: "ofl/kanit/Kanit-Bold.ttf", css: { family: "Kanit", weight: 700 }, looks: "sans moderna algo cuadrada, negrita" },
  { ass: "Kanit ExtraBold", italic: true, file: "ofl/kanit/Kanit-ExtraBoldItalic.ttf", css: { family: "Kanit", weight: 800, italic: true }, looks: "sans gruesa en itálica, deportiva y con energía" },
  { ass: "Bangers", file: "ofl/bangers/Bangers-Regular.ttf", css: { family: "Bangers", weight: 400 }, looks: "de cómic, inclinada, estilo historieta" },
  { ass: "Lilita One", file: "ofl/lilitaone/LilitaOne-Regular.ttf", css: { family: "Lilita One", weight: 400 }, looks: "redondeada, gruesa y amigable" },
  { ass: "Titan One", file: "ofl/titanone/TitanOne-Regular.ttf", css: { family: "Titan One", weight: 400 }, looks: "redonda, muy gruesa e inflada, divertida" },
  { ass: "Permanent Marker", file: "apache/permanentmarker/PermanentMarker-Regular.ttf", css: { family: "Permanent Marker", weight: 400 }, looks: "escrita a mano con marcador" },
  { ass: "Caveat Brush", file: "ofl/caveatbrush/CaveatBrush-Regular.ttf", css: { family: "Caveat Brush", weight: 400 }, looks: "manuscrita con pincel, casual" },
  { ass: "DM Serif Display", file: "ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf", css: { family: "DM Serif Display", weight: 400 }, looks: "con serifa, elegante, editorial" },
];

export function getFont(ass: string): Font | undefined {
  return FONTS.find((f) => f.ass === ass);
}

// Hoja de Google Fonts para mostrar las vistas previas con la tipografía real.
export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bangers&family=Bebas+Neue&family=Caveat+Brush&family=DM+Serif+Display&family=Kanit:ital,wght@0,700;1,800&family=Lilita+One&family=Permanent+Marker&family=Poppins:wght@500;600;700;800&family=Titan+One&display=swap";
