/**
 * The news articles.
 *
 * An article is a self-contained HTML page written outside the app and brought
 * in with `node scripts/import-article.mjs <file.html> <slug>`, which splits it
 * into the markup imported below and a stylesheet scoped to `.news-article`.
 * Add the entry here and the card appears on the home page and the page at
 * `/noticias/<slug>` starts working.
 */

import estatutosBody from "@/content/news/estatutos-da-master-league.html?raw";
import estatutosCss from "@/content/news/estatutos-da-master-league.css?url";
import ficheirosBody from "@/content/news/ficheiros-da-francesinha.html?raw";
import ficheirosCss from "@/content/news/ficheiros-da-francesinha.css?url";

export interface Article {
  slug: string;
  /** Card headline. The article's own markup carries its display title. */
  title: string;
  /** The line above the headline: what kind of piece this is. */
  kicker: string;
  /** ISO date — sorts the list and prints under the headline. */
  date: string;
  excerpt: string;
  /** Card thumbnail, and the image a shared link previews with. */
  image: string;
  imageAlt: string;
  body: string;
  /** The article's own stylesheet, scoped to `.news-article` on import. */
  styles: string;
  /**
   * The Google Fonts URL this article is set in. `import-article.mjs` drops
   * everything above the stylesheet, so an article's own font `<link>` does not
   * survive the import and has to be named here instead. Falls back to the
   * families the first article established.
   */
  fonts?: string;
}

/** Oswald, Newsreader and IBM Plex Mono — what an article gets if it asks for nothing. */
export const DEFAULT_FONTS =
  "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700" +
  "&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400" +
  "&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

export const ARTICLES: Article[] = [
  {
    slug: "estatutos-da-master-league",
    title: "Estatutos da Master League",
    kicker: "Regulamento \u00b7 para ler e votar",
    date: "2026-09-03",
    excerpt:
      "Combin\u00e1mos escrever isto cinco vezes em quatro anos e nunca escrevemos. Aqui est\u00e3o as 50 " +
      "regras que regem a liga, cada uma com a data e a frase em que ficou fixada \u2014 o que j\u00e1 est\u00e1 " +
      "decidido, os tr\u00eas pontos que faltam votar e os cinco que precisam de uma proposta.",
    image: "/static/images/news/estatutos-da-master-league.jpg",
    imageAlt:
      "Capa dos estatutos da Master League sobre fundo verde-relvado, com as quatro partes do documento.",
    body: estatutosBody,
    styles: estatutosCss,
    fonts:
      "https://fonts.googleapis.com/css2?family=Bitter:wght@500;600;700" +
      "&family=Karla:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap",
  },
  {
    slug: "ficheiros-da-francesinha",
    title: "Os Ficheiros da Francesinha",
    kicker: "Análise · MasterLeague e o grupo",
    date: "2026-09-02",
    excerpt:
      "Duzentos e quatro jogos, 3.216 golos e as 28.312 mensagens do grupo, tudo passado pelo mesmo " +
      "crivo. Quem ganha jogos não é quem os marca, o livro de recordes estava errado, há 22 golos " +
      "que não são de ninguém — e o Tagarela-Mor tem nome.",
    image: "/static/images/news/ficheiros-da-francesinha.jpg",
    imageAlt: "O campo da Torrinha ao fim da tarde, com o título do artigo por cima.",
    body: ficheirosBody,
    styles: ficheirosCss,
  },
];

/** Newest first — the order the home page lists them in. */
export const articles: Article[] = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date));

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** `2026-09-02` → `2 de Setembro de 2026`. Parsed by hand to stay in local time. */
export function formatArticleDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}
