import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { leagueImageUrl, playersByTeam, BRANQUELAS, MAREGOES, type Game } from "@/lib/domain";
import { pyDate, urlSegment } from "@/lib/format";

/**
 * `macros/frontend.html::games_for_carousel` and the `createCarrousel` widget.
 *
 * The original positions each cell absolutely and shuffles `left`/`z-index` to
 * fake an infinite loop; this keeps the same markup and controls (arrows,
 * indicators, wheel and touch drag, wrap-around) with a single transform.
 */
export function GamesCarousel({ games }: { games: Game[] }) {
  const [index, setIndex] = useState(0);
  const innerRef = useRef<HTMLDivElement>(null);
  const throttled = useRef(false);
  const dragStart = useRef<number | null>(null);

  const total = games.length;
  const step = (direction: number) => {
    if (!total) return;
    setIndex((current) => ((current + direction) % total + total) % total);
  };

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontal) return;
      event.preventDefault();
      if (throttled.current) return;
      throttled.current = true;
      step(event.deltaX > 0 ? 1 : -1);
      setTimeout(() => {
        throttled.current = false;
      }, 1500);
    };

    const onTouchStart = (event: TouchEvent) => {
      dragStart.current = event.touches[0].clientX;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (dragStart.current === null) return;
      const delta = event.touches[0].clientX - dragStart.current;
      if (delta < -10) {
        dragStart.current = null;
        step(1);
      } else if (delta > 10) {
        dragStart.current = null;
        step(-1);
      }
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchmove", onTouchMove);
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [total]);

  return (
    <div className="last_games_container carousel-container">
      <div
        className="last_games_container_inner carousel-inner"
        ref={innerRef}
        style={{ transform: `translateX(calc(50% - ${index * 100}% / ${total || 1} - 50% / ${total || 1}))` }}
      >
        {games.map((game) => (
          <GameCell key={game.id} game={game} />
        ))}
      </div>
      <a className="carousel-control-prev" role="button" onClick={() => step(-1)}>
        <img
          src="/static/svg/left_chevron_filled.svg"
          className="fit_image_chevron"
          alt="Left Chevron"
        />
      </a>
      <a className="carousel-control-next" role="button" onClick={() => step(1)}>
        <img
          src="/static/svg/right_chevron_filled.svg"
          className="fit_image_chevron"
          alt="Left Chevron"
        />
      </a>
      <ol className="carousel-indicators">
        {games.map((game, position) => (
          <li
            key={game.id}
            id={`carousel_indicator_${position}`}
            className={position === index ? "carousel-indicator-active" : undefined}
            onClick={() => setIndex(position)}
          ></li>
        ))}
      </ol>
    </div>
  );
}

function GameCell({ game }: { game: Game }) {
  const teams = playersByTeam(game);
  const league = game.edition?.league ?? null;

  return (
    <div className="last_games_game carousel-cell">
      <div className="item-content">
        <div className="game_content">
          <div className="league_logo_box">
            {league ? <img className="league_logo" src={leagueImageUrl(league)} /> : null}
          </div>
          <div className="details_box">
            Jogo dia {pyDate(game.date)} - {game.edition?.time} - {game.edition?.name}, Jornada{" "}
            {game.matchweek}
          </div>
          <div className="score_box">
            <div className="team-container">
              <img className="team-logo left" src="/static/images/Branquelas.png" />
              <div className="team-banner left">
                <div className="team-name">Branquelas</div>
              </div>
            </div>
            <div className="score">
              <div className="goals score_home">{game.goalsTeam1}</div>
              <div className="score_separator">-</div>
              <div className="goals score_away">{game.goalsTeam2}</div>
            </div>
            <div className="team-container">
              <div className="team-banner right">
                <div className="team-name">Maregões</div>
              </div>
              <img className="team-logo right" src="/static/images/Maregões.png" />
            </div>
          </div>
          <div className="players">
            <div className="players_team_1">
              {teams[BRANQUELAS].map(([relation, player]) => (
                <CarouselPlayer key={relation.id} name={player.name} />
              ))}
            </div>
            <div className="players_team_2">
              {teams[MAREGOES].map(([relation, player]) => (
                <CarouselPlayer key={relation.id} name={player.name} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Multi-word names render the first word in a lighter weight. */
function CarouselPlayer({ name }: { name: string }) {
  const navigate = useNavigate();
  const href = `/player/general/${urlSegment(name)}`;
  const parts = name.split(/\s+/).filter(Boolean);

  return (
    <div
      className="player"
      data-href={href}
      onClick={() => navigate({ to: "/player/general/$playerName", params: { playerName: name } })}
    >
      {parts.map((part, position) => (
        <span
          key={`${part}-${position}`}
          className={position === 0 && parts.length > 1 ? "light_first_name" : undefined}
        >
          {part}
        </span>
      ))}
    </div>
  );
}
