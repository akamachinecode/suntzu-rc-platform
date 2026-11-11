import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlate, PLATES, type PlateName } from "./draw";

// The Learn page shows three of the guides' figures as SVG files (docs/DECISIONS.md, 2026-11-11).
// They must match the figures they come from: after changing a figure, run
// `pnpm --filter @workspace/app covers` to redraw them.
describe("learn plates", () => {
  for (const name of Object.keys(PLATES) as PlateName[]) {
    it(`${name}.svg is the current drawing of its figure`, () => {
      const file = new URL(`./${name}.svg`, import.meta.url);
      const drawn = drawPlate(name);
      if (process.env.UPDATE_COVERS) writeFileSync(file, drawn);
      expect(
        readFileSync(file, "utf8") === drawn,
        `${name}.svg is out of date: run pnpm --filter @workspace/app covers`,
      ).toBe(true);
    });

    it(`${name}.svg has no comment a browser would refuse`, () => {
      // "--" inside an XML comment makes the file invalid, and the image shows as broken.
      const comments = drawPlate(name).match(/<!--[\s\S]*?-->/g) ?? [];
      expect(comments.every((comment) => !comment.slice(4, -3).includes("--"))).toBe(true);
    });
  }
});
