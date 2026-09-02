import { useEffect, useState } from "react";

import { absoluteUrl } from "@/lib/site";

/**
 * Send an article to the group.
 *
 * The WhatsApp link is a real anchor rather than a click handler so that
 * middle-click, "open in new tab" and "copy link address" all behave. Its href
 * starts from the published origin — which is what the server renders — and is
 * rewritten after mount to whichever origin the page is actually being read
 * from, so a link shared from a preview deployment points back at that one.
 */
export function ShareButtons({
  title,
  path,
  tone = "light",
}: {
  title: string;
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
      // prompt turned down). The WhatsApp button still works.
    }
  }

  return (
    <div className={`share_buttons share_${tone}`}>
      <a
        className="share_button share_whatsapp"
        href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`}
        target="_blank"
        rel="noreferrer"
      >
        <i className="bx bxl-whatsapp" aria-hidden="true"></i>
        Enviar por WhatsApp
      </a>
      <button type="button" className="share_button share_copy" onClick={copy}>
        <i className={copied ? "bx bx-check" : "bx bx-link"} aria-hidden="true"></i>
        {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}
