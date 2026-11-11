/**
 * "Then and now" in a guide: a model of the past and one you could buy today, aspect by aspect.
 * A table from `sm` up; on a phone, one card per aspect with then above now, so nothing hides
 * off the side of the screen.
 */
export function ThenNow({
  then,
  caption,
  rows,
}: {
  /** The heading of the old column: "1970s", "Around 1980". */
  then: string;
  caption: string;
  rows: readonly (readonly [aspect: string, then: string, now: string])[];
}) {
  const label = "text-xs font-black tracking-[0.2em] uppercase";
  return (
    <>
      <div className="overflow-x-auto rounded-xl border-2 border-foreground bg-panel shadow-hard-lg max-sm:hidden">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b-2 border-foreground">
              <th scope="col" className="p-4 font-semibold">
                <span className="sr-only">Aspect</span>
              </th>
              <th scope="col" className="p-4 text-xl font-black font-wide">
                {then}
              </th>
              <th scope="col" className="bg-primary p-4 text-xl font-black font-wide">
                Today
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([aspect, past, now]) => (
              <tr key={aspect} className="border-b-2 border-foreground last:border-b-0">
                <th scope="row" className="p-4 align-top font-bold">
                  {aspect}
                </th>
                <td className="p-4 align-top text-pretty">{past}</td>
                <td className="bg-primary/25 p-4 align-top text-pretty">{now}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label={caption} className="grid gap-4 sm:hidden">
        {rows.map(([aspect, past, now]) => (
          <li
            key={aspect}
            className="overflow-hidden rounded-xl border-2 border-foreground bg-panel shadow-hard"
          >
            <h3 className="border-b-2 border-foreground px-4 py-3 text-lg font-bold">{aspect}</h3>
            <dl>
              <div className="px-4 py-3">
                <dt className={`${label} text-muted-foreground`}>{then}</dt>
                <dd className="mt-1 text-pretty">{past}</dd>
              </div>
              <div className="border-t-2 border-foreground bg-primary/25 px-4 py-3">
                <dt className={label}>Today</dt>
                <dd className="mt-1 text-pretty">{now}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
