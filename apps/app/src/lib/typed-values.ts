/**
 * What the person typed, to give back to the form after an error: React 19 resets a form once its
 * action finishes, so without this every field empties when one of them is wrong. Leaves out the
 * Turnstile token, Next.js's own fields and files. A name sent more than once (a group of
 * checkboxes) keeps every value, one per line.
 */
export function typedValues(formData: FormData): Partial<Record<string, string>> {
  const values: Partial<Record<string, string>> = {};
  for (const [name, value] of formData) {
    if (typeof value !== "string" || name.startsWith("$") || name.startsWith("cf-turnstile")) {
      continue;
    }
    values[name] = name in values ? `${values[name]}\n${value}` : value;
  }
  return values;
}
