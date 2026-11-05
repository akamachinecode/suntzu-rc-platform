/** Lines that each carry an opacity (ribs, teeth, vents), grouped by opacity like the kit's `fadedSvg`. */
export function Faded({
  lines,
  tone = "lo",
}: {
  lines: Array<{ d: string; alpha: number }>;
  tone?: "hi" | "mid" | "lo" | "faint";
}) {
  const groups = new Map<number, string>();
  for (const { d, alpha } of lines) {
    if (alpha < 0.02) continue;
    const step = Math.round(alpha * 20) / 20;
    groups.set(step, (groups.get(step) ?? "") + d);
  }
  return (
    <>
      {[...groups].map(([alpha, d]) => (
        <g key={alpha} opacity={alpha}>
          <path className="iso-line" data-tone={tone} d={d} />
        </g>
      ))}
    </>
  );
}
