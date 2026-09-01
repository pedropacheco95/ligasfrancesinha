/**
 * Rendering helpers that reproduce how Jinja/Python stringifies values.
 *
 * The Flask templates interpolate SQLAlchemy column values directly, so a Float
 * column holding 100 renders as "100.0" while an Integer column holding 100
 * renders as "100". JavaScript collapses both to "100", so every float-backed
 * value has to go through `pyFloat`.
 */

/** Python `repr` of a float: integral values keep a trailing ".0". */
export function pyFloat(value: number | null | undefined): string {
  if (value === null || value === undefined) return "None";
  if (!Number.isFinite(value)) return String(value);
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

/** Python `str` of an int column. Null renders as "None" like Jinja does. */
export function pyInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "None";
  return String(value);
}

/** Python's round(): half-to-even, unlike JS's half-away-from-zero Math.round. */
export function pyRound(value: number, digits = 0): number {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;

  let rounded: number;
  if (diff > 0.5) rounded = floor + 1;
  else if (diff < 0.5) rounded = floor;
  else rounded = floor % 2 === 0 ? floor : floor + 1;

  return rounded / factor;
}

/**
 * Jinja's `|round(n)` filter. Its default method is "common", which despite the
 * name delegates to Python's built-in `round()` — so it is half-to-even, and
 * `(13/8)|round(2)` is 1.62, not 1.63.
 */
export function jinjaRound(value: number, digits = 0): number {
  return pyRound(value, digits);
}

/** ISO date strings live in the JSON seed exactly as SQLite stored them. */
export type IsoDate = string | null;

/** Python `str(date)` — what `{{ game.date }}` emits. */
export function pyDate(value: IsoDate): string {
  return value ?? "None";
}

/** `date.strftime('%d/%m/%y')`. */
export function strftimeShort(value: IsoDate): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

/** `date.strftime('%Y-%m-%d')` for a JS Date in local time. */
export function isoLocalDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Python's `date.weekday()`: Monday is 0. JS `getDay()` puts Sunday at 0. */
export function pyWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Werkzeug's `url_for` percent-encoding for a path segment. Spaces become %20
 * (not "+"), which is what `encodeURIComponent` already does.
 */
export function urlSegment(value: string): string {
  return encodeURIComponent(value);
}

/** Names reach us from route params; normalise so accents compare equal. */
export function sameText(a: string, b: string): boolean {
  return a.normalize("NFC") === b.normalize("NFC");
}
