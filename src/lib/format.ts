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

/**
 * Python's `round()`: half-to-even, applied to the double's *exact* value.
 *
 * Scaling by a power of ten first would be wrong. `1 / 40` is a hair above
 * 0.025, so Python rounds it up to 0.03, but multiplying by 100 lands exactly
 * on 12.5 and the half-to-even rule then rounds it down to 0.02. So this works
 * from the decimal expansion instead: `toFixed` is correctly rounded, and 18
 * digits past the target is far more than a double's precision, so a genuine
 * tie is distinguishable from a value that merely looks like one.
 */
export function pyRound(value: number, digits = 0): number {
  if (!Number.isFinite(value)) return value;
  if (Math.abs(value) >= 1e21) return value; // toFixed goes exponential up here

  const negative = value < 0;
  const [whole, fraction = ""] = Math.abs(value)
    .toFixed(Math.min(100, digits + 18))
    .split(".");

  const kept = fraction.slice(0, digits).padEnd(digits, "0");
  const dropped = fraction.slice(digits);

  let scaled = BigInt(`${whole}${kept}`);
  const first = dropped.charCodeAt(0);
  if (first > 53 || (first === 53 && /[1-9]/.test(dropped.slice(1)))) {
    scaled += 1n; // above the halfway point
  } else if (first === 53 && scaled % 2n === 1n) {
    scaled += 1n; // exactly halfway: round to even
  }

  const rounded = Number(scaled) / 10 ** digits;
  return negative ? -rounded : rounded;
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
