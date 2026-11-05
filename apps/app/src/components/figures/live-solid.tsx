import type { SolidPaths, Tone } from "@/components/iso/iso-kit";

/**
 * A solid whose paths are rewritten every frame by a figure's live code: the same layers as
 * the kit's `Solid`, each tagged so `paint` can find it.
 */
export function LiveSolid({
  node,
  paths,
  tone = "hi",
  crease = "lo",
  lit = false,
}: {
  node: string;
  paths?: SolidPaths;
  tone?: Tone;
  crease?: Tone | "none";
  lit?: boolean;
}) {
  return (
    <g
      data-node={node}
      className="iso-solid"
      data-lit={lit ? "" : undefined}
      data-seamless={paths?.seamless ? "" : undefined}
    >
      <path data-k="fill" className="iso-fill" d={paths?.fill ?? ""} />
      {[0, 1, 2, 3].map((shade) => (
        <path
          key={shade}
          data-k={`s${shade}`}
          className="iso-shade"
          data-shade={shade}
          d={paths?.shades[shade] ?? ""}
        />
      ))}
      <path data-k="top" className="iso-top" d={paths?.top ?? ""} />
      {crease === "none" ? null : (
        <path
          data-k="crease"
          className="iso-line iso-crease"
          data-tone={crease}
          d={paths?.crease ?? ""}
        />
      )}
      <path
        data-k="outline"
        className="iso-line iso-edge"
        data-tone={tone}
        d={paths?.outline ?? ""}
      />
    </g>
  );
}

const EMPTY: SolidPaths = { fill: "", outline: "", crease: "", top: "", shades: ["", "", "", ""] };

/** Writes a solid's paths into its LiveSolid; `null` empties it. */
export function paint(node: Element | null | undefined, paths: SolidPaths | null) {
  if (!node) return;
  const p = paths ?? EMPTY;
  for (const child of Array.from(node.children)) {
    const key = child.getAttribute("data-k");
    const d =
      key === "fill"
        ? p.fill
        : key === "top"
          ? p.top
          : key === "crease"
            ? p.crease
            : key === "outline"
              ? p.outline
              : key?.startsWith("s")
                ? (p.shades[Number(key.slice(1))] ?? "")
                : null;
    if (d !== null && child.getAttribute("d") !== d) child.setAttribute("d", d);
  }
  if (p.seamless) node.setAttribute("data-seamless", "");
  else node.removeAttribute("data-seamless");
}
