import { Link } from "@tanstack/react-router";

import { formatArticleDate, type Article } from "@/data/news";

import { ShareButtons } from "./ShareButtons";

/** One article on the home page, below the standings. */
export function NewsCard({ article }: { article: Article }) {
  const to = "/noticias/$slug" as const;
  const params = { slug: article.slug };

  return (
    <article className="news_card">
      <Link activeProps={{ className: "" }} to={to} params={params} className="news_card_image">
        <img src={article.image} alt={article.imageAlt} />
      </Link>

      <div className="news_card_body">
        <p className="news_card_kicker">
          {article.kicker} <span>· {formatArticleDate(article.date)}</span>
        </p>
        <h3 className="news_card_title">
          <Link activeProps={{ className: "" }} to={to} params={params}>
            {article.title}
          </Link>
        </h3>
        <p className="news_card_excerpt">{article.excerpt}</p>

        <div className="news_card_actions">
          <Link activeProps={{ className: "" }} to={to} params={params} className="news_card_read">
            Ler o artigo
          </Link>
          <ShareButtons path={`/noticias/${article.slug}`} />
        </div>
      </div>
    </article>
  );
}
