import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { Layout } from "@/components/Layout";
import { ShareButtons } from "@/components/ShareButtons";
import { DEFAULT_FONTS, findArticle } from "@/data/news";
import { absoluteUrl } from "@/lib/site";

import newsCss from "@/styles/news.css?url";

export const Route = createFileRoute("/noticias/$slug")({
  beforeLoad: ({ params }) => {
    if (!findArticle(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const article = findArticle(params.slug);
    if (!article) return {};

    const url = absoluteUrl(`/noticias/${article.slug}`);
    const image = absoluteUrl(article.image);

    return {
      meta: [
        { title: `${article.title} · Ligas Francesinha` },
        { name: "description", content: article.excerpt },
        // Absolute URLs throughout: a link preview is built by a crawler that
        // fetches this HTML on its own, with no page to resolve them against.
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: "Ligas Francesinha" },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.excerpt },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:secure_url", content: image },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: article.imageAlt },
        { property: "article:published_time", content: article.date },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: article.title },
        { name: "twitter:description", content: article.excerpt },
        { name: "twitter:image", content: image },
      ],
      links: [
        { rel: "canonical", href: url },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        // Each article is set in its own typefaces, so the families come from
        // the article rather than from a list shared by all of them.
        { rel: "stylesheet", href: article.fonts ?? DEFAULT_FONTS },
        { rel: "stylesheet", href: newsCss },
        { rel: "stylesheet", href: article.styles },
      ],
    };
  },
  component: ArticlePage,
});

/**
 * One article, in its own visual world.
 *
 * The markup comes in as a string because it is written and reviewed as a
 * standalone page; `scripts/import-article.mjs` splits it from its stylesheet
 * and scopes every selector to `.news-article`, so nothing here leaks into the
 * rest of the site and Bootstrap's element rules do not leak in.
 */
function ArticlePage() {
  const { slug } = Route.useParams();
  const article = findArticle(slug);
  if (!article) return null;

  return (
    <Layout>
      <div className="article_page">
        <div className="article_bar">
          <Link activeProps={{ className: "" }} to="/" className="article_back">
            <i className="bx bx-left-arrow-alt" aria-hidden="true"></i> Voltar
          </Link>
          <ShareButtons path={`/noticias/${article.slug}`} tone="dark" />
        </div>

        <div className="news-article" dangerouslySetInnerHTML={{ __html: article.body }} />

        <div className="article_share_end">
          <p>Manda isto para o grupo</p>
          <ShareButtons path={`/noticias/${article.slug}`} tone="dark" />
        </div>
      </div>
    </Layout>
  );
}
