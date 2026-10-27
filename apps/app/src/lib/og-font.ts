import "server-only";

/**
 * Archivo (the site's typeface) for share images: next/og needs the font file itself. Google Fonts
 * returns a TrueType file subset to the characters drawn; without the network the image falls
 * back to the default font.
 */
export async function archivo(
  text: string,
  { weight, wide }: { weight: 600 | 900; wide: boolean },
): Promise<ArrayBuffer | undefined> {
  const family = wide ? `Archivo:wdth,wght@125,${weight}` : `Archivo:wght@${weight}`;
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`,
        { next: { revalidate: 86_400 } },
      )
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return undefined;
    return await (await fetch(url, { next: { revalidate: 86_400 } })).arrayBuffer();
  } catch {
    return undefined;
  }
}
