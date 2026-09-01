import "react";

declare module "react" {
  /**
   * The ported Jinja templates use the legacy presentational `width` attribute
   * on `<th>` (and a non-standard `name` used as a data hook), neither of which
   * React's types include. Both render fine; only the typings are missing.
   */
  interface ThHTMLAttributes<T> {
    width?: string | number;
    name?: string;
  }
}
