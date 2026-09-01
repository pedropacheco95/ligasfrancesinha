import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import {
  leagueImageUrl,
  playersByTeam,
  teamImageUrl,
  BRANQUELAS,
  MAREGOES,
  type Game,
} from "@/lib/domain";
import { pyDate, urlSegment } from "@/lib/format";

/**
 * `macros/frontend.html::games_for_carousel` and the `createCarrousel` widget
 * from `static/js/animations.js`.
 *
 * The stylesheet absolutely-positions every `.carousel-cell` at `left: 0`, so
 * the cells only fan out once JavaScript assigns each one a `left`. The
 * original computes a `ratio` of cell width to viewport width and drives an
 * infinite loop by shuffling `left` and `z-index` as the index moves.
 *
 * This keeps that layout model but derives it from a single unbounded
 * `position` counter: each cell sits at the multiple of `ratio` congruent to
 * its index that is nearest the current position. Cells therefore always
 * surround the active one, wrapping in both directions, and the cell that
 * moves to the far side is off-screen when its `left` changes.
 */
export function GamesCarousel({ games }: { games: Game[] }) {
  const [position, setPosition] = useState(0);
  const [ratio, setRatio] = useState<number | null>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const throttled = useRef(false);
  const dragStart = useRef<number | null>(null);

  const total = games.length;
  const index = total ? ((position % total) + total) % total : 0;

  const step = (direction: number) => {
    if (!total) return;
    setPosition((current) => current + direction);
  };

  // `ratio` is the cell's share of the viewport, as the original computes it.
  useEffect(() => {
    const node = innerRef.current;
    if (!node || !node.children.length) return;
    const measure = () => {
      const cell = node.children[0] as HTMLElement;
      setRatio((cell.offsetWidth / window.innerWidth) * 100);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [total]);

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

  /** The multiple of `total` congruent to `cellIndex` nearest the current position. */
  const slotFor = (cellIndex: number) =>
    cellIndex + total * Math.round((position - cellIndex) / total);

  return (
    <div className="last_games_container carousel-container">
      <div
        className="last_games_container_inner carousel-inner"
        ref={innerRef}
        style={
          ratio === null
            ? undefined
            : {
                transform: `translateX(${(100 - ratio) / 2 - position * ratio}%)`,
                transition: "transform 0.35s ease",
              }
        }
      >
        {games.map((game, cellIndex) => (
          <GameCell
            key={game.id}
            game={game}
            left={ratio === null ? undefined : `${ratio * slotFor(cellIndex)}%`}
          />
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
        {games.map((game, cellIndex) => (
          <li
            key={game.id}
            id={`carousel_indicator_${cellIndex}`}
            className={cellIndex === index ? "carousel-indicator-active" : undefined}
            onClick={() => setPosition(cellIndex)}
          ></li>
        ))}
      </ol>
    </div>
  );
}

function GameCell({ game, left }: { game: Game; left?: string }) {
  const teams = playersByTeam(game);
  const league = game.edition?.league ?? null;

  return (
    <div
      className="last_games_game carousel-cell"
      style={left === undefined ? undefined : { left }}
    >
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
              <img className="team-logo left" src={teamImageUrl(BRANQUELAS)} />
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
              <img className="team-logo right" src={teamImageUrl(MAREGOES)} />
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
