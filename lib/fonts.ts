// Tipografías que el worker tiene instaladas (ver Dockerfile.worker). Cuando la IA analiza una
// referencia, elige la más parecida de esta lista: no puede usar una fuente que no esté acá.

export type Font = {
  ass: string; // nombre que usa ffmpeg/libass
  italic?: boolean;
  file: string; // ruta dentro de github.com/google/fonts
  css: { family: string; weight: number; italic?: boolean }; // para la vista previa en la web
  looks: string; // descripción para que la IA la reconozca
  // libass mide el tamaño de letra incluyendo el espacio vertical reservado de la fuente
  // ((usWinAscent + usWinDescent) / unitsPerEm). Multiplicar por esto da el mismo tamaño
  // visual que en CSS. Medido con fontTools sobre cada .ttf.
  assScale: number;
};

export const FONTS: Font[] = [
  { ass: "Poppins Medium", file: "ofl/poppins/Poppins-Medium.ttf", css: { family: "Poppins", weight: 500 }, looks: "sans geométrica redondeada, peso medio, limpia", assScale: 1.762 },
  { ass: "Poppins SemiBold", file: "ofl/poppins/Poppins-SemiBold.ttf", css: { family: "Poppins", weight: 600 }, looks: "sans geométrica redondeada, semi negrita", assScale: 1.762 },
  { ass: "Poppins Bold", file: "ofl/poppins/Poppins-Bold.ttf", css: { family: "Poppins", weight: 700 }, looks: "sans geométrica redondeada, negrita, la típica de subtítulos de reels", assScale: 1.762 },
  { ass: "Poppins ExtraBold", file: "ofl/poppins/Poppins-ExtraBold.ttf", css: { family: "Poppins", weight: 800 }, looks: "sans geométrica muy gruesa, tipo Montserrat Black", assScale: 1.762 },
  { ass: "Anton", file: "ofl/anton/Anton-Regular.ttf", css: { family: "Anton", weight: 400 }, looks: "condensada alta e impactante, tipo Impact", assScale: 1.733 },
  { ass: "Bebas Neue", file: "ofl/bebasneue/BebasNeue-Regular.ttf", css: { family: "Bebas Neue", weight: 400 }, looks: "condensada, solo mayúsculas, fina y alta", assScale: 1.3 },
  { ass: "Archivo Black", file: "ofl/archivoblack/ArchivoBlack-Regular.ttf", css: { family: "Archivo Black", weight: 400 }, looks: "grotesca ancha y muy pesada, tipo Helvetica Black", assScale: 1.347 },
  { ass: "Kanit Bold", file: "ofl/kanit/Kanit-Bold.ttf", css: { family: "Kanit", weight: 700 }, looks: "sans moderna algo cuadrada, negrita", assScale: 1.58 },
  { ass: "Kanit ExtraBold", italic: true, file: "ofl/kanit/Kanit-ExtraBoldItalic.ttf", css: { family: "Kanit", weight: 800, italic: true }, looks: "sans gruesa en itálica, deportiva y con energía", assScale: 1.58 },
  { ass: "Bangers", file: "ofl/bangers/Bangers-Regular.ttf", css: { family: "Bangers", weight: 400 }, looks: "de cómic, inclinada, estilo historieta", assScale: 1.757 },
  { ass: "Lilita One", file: "ofl/lilitaone/LilitaOne-Regular.ttf", css: { family: "Lilita One", weight: 400 }, looks: "redondeada, gruesa y amigable", assScale: 1.143 },
  { ass: "Titan One", file: "ofl/titanone/TitanOne-Regular.ttf", css: { family: "Titan One", weight: 400 }, looks: "redonda, muy gruesa e inflada, divertida", assScale: 1.145 },
  { ass: "Permanent Marker", file: "apache/permanentmarker/PermanentMarker-Regular.ttf", css: { family: "Permanent Marker", weight: 400 }, looks: "escrita a mano con marcador", assScale: 1.427 },
  { ass: "Caveat Brush", file: "ofl/caveatbrush/CaveatBrush-Regular.ttf", css: { family: "Caveat Brush", weight: 400 }, looks: "manuscrita con pincel, casual", assScale: 1.26 },
  { ass: "DM Serif Display", file: "ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf", css: { family: "DM Serif Display", weight: 400 }, looks: "con serifa, elegante, editorial", assScale: 1.371 },
];

export function getFont(ass: string): Font | undefined {
  return FONTS.find((f) => f.ass === ass);
}

// Hoja de Google Fonts para mostrar las vistas previas con la tipografía real.
export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bangers&family=Bebas+Neue&family=Caveat+Brush&family=DM+Serif+Display&family=Kanit:ital,wght@0,700;1,800&family=Lilita+One&family=Permanent+Marker&family=Poppins:wght@500;600;700;800&family=Titan+One&display=swap";
