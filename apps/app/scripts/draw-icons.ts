// Draws the app icons in apps/app/public/icons from the wordmark (spec 0010, slice 9): the site's
// own Archivo, wide and black, on XT60 yellow, like the decal on a body shell.
//
//   pnpm dev                                        (the site must be running, for the font)
//   node apps/app/scripts/draw-icons.ts              from the repository root
//
// Writes app-192.png, app-512.png (any purpose), app-maskable-512.png (Android crops it to a
// circle or a squircle, so the letters sit inside the middle 80%) and apple-touch-180.png.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const SITE = process.env.SITE ?? "http://localhost:3000";
const OUT = new URL("../public/icons/", import.meta.url);
const YELLOW = "#ffc629"; // --primary
const INK = "#000000"; // --foreground

/** The icon as a page: the word stacked, "suntzu" over a large "rc". `scale` shrinks it into the safe zone. */
const html = (size: number, scale: number) => `
    <div style="position:fixed;inset:0 auto auto 0;width:${size}px;height:${size}px;background:${YELLOW};display:grid;place-items:center;">
      <div style="font-family:Archivo;font-stretch:125%;font-weight:900;color:${INK};text-transform:lowercase;line-height:0.8;text-align:center;letter-spacing:-0.02em;transform:scale(${scale})">
        <div style="font-size:${size * 0.2}px">suntzu</div>
        <div style="font-size:${size * 0.5}px">rc</div>
      </div>
    </div>`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

// Archivo as the site loads it (next/font): its @font-face rules, read from the home page.
await page.goto(SITE);
const fontFaces = await page.evaluate(() =>
  [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter(
      (rule) => rule instanceof CSSFontFaceRule && /^"?Archivo"?$/.test(rule.style.fontFamily),
    )
    // The font files are relative to the stylesheet ("../media/…"): make them absolute.
    .map((rule) =>
      rule.cssText.replace(/url\("([^"]+)"\)/g, (_, url: string) => {
        return `url("${new URL(url, rule.parentStyleSheet?.href ?? location.href)}")`;
      }),
    )
    .join("\n"),
);
if (!fontFaces) throw new Error("Archivo's @font-face not found: is the site running?");

// A plain page on the same origin (the health check), so React doesn't redraw it.
await page.goto(`${SITE}/api/health`);
for (const [file, size, scale] of [
  ["app-512.png", 512, 1],
  ["app-192.png", 192, 1],
  ["apple-touch-180.png", 180, 0.92],
  ["app-maskable-512.png", 512, 0.72],
] as const) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><style>${fontFaces} body{margin:0}</style>${html(size, scale)}`,
    { waitUntil: "load" },
  );
  await page.evaluate(() => document.fonts.ready);
  const archivo = await page.evaluate(() => document.fonts.check('900 50px "Archivo"'));
  if (!archivo) throw new Error("Archivo didn't load");
  await page.screenshot({
    path: new URL(file, OUT).pathname,
    clip: { x: 0, y: 0, width: size, height: size },
  });
  console.log("wrote", file);
}
await browser.close();
