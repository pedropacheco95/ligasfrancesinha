import { useEffect, useState } from "react";

import { absoluteUrl } from "@/lib/site";

/**
 * Copy an article's link, to paste wherever it is going.
 *
 * The URL starts from the published origin — which is what the server renders
 * — and is rewritten after mount to whichever origin the page is actually being
 * read from, so a link copied from a preview deployment points back at it.
 */
export function ShareButtons({
  path,
  tone = "light",
}: {
  path: string;
  /** `dark` sits on the article's own background, `light` on a white card. */
  tone?: "light" | "dark";
}) {
  const [url, setUrl] = useState(() => absoluteUrl(path));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (an insecure origin, a permission
      // prompt turned down); the link is still in the address bar.
    }
  }

  return (
    <div className={`share_buttons share_${tone}`}>
      <button type="button" className="share_button share_copy" onClick={copy}>
        <i className={copied ? "bx bx-check" : "bx bx-link"} aria-hidden="true"></i>
        {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}
