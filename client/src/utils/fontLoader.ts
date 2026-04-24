export async function loadFont(url: string, fontFamily: string): Promise<void> {
  try {
    const font = new FontFace(fontFamily, `url(${url})`);
    await font.load();
    document.fonts.add(font);
  } catch (error) {
    console.warn(`Failed to load font ${fontFamily} from ${url}:`, error);
  }
}

export async function loadCriticalFonts(): Promise<void[]> {
  return Promise.all([
    loadFont('/fonts/AbyssinicaSIL-Regular.ttf', 'Abyssinica SIL'),
    loadFont('/fonts/ebrima.ttf', 'Ebrima'),
    loadFont('/fonts/ebrima-bold.ttf', 'Ebrima Bold'),
  ]);
}

export function preloadFont(url: string, as: 'font' = 'font'): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = url;
  if (as === 'font') {
    link.type = 'font/ttf';
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}
