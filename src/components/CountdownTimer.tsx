import { useEffect, useState } from "react";

/**
 * `macros/frontend.html::countdown_timer` plus the `createCountdown` ticker
 * from `static/js/animations.js`. The original starts at 00 and fills in on the
 * first tick a second later; once the target passes it replaces the whole
 * widget's text with "Countdown finished".
 */
export function CountdownTimer({ targetDatetime }: { targetDatetime: string | null }) {
  const [parts, setParts] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  } | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!targetDatetime) return;
    const target = new Date(targetDatetime);

    const tick = () => {
      const difference = target.getTime() - Date.now();
      if (difference <= 0) {
        setFinished(true);
        return;
      }
      const pad = (value: number) => String(value).padStart(2, "0");
      setParts({
        days: pad(Math.floor(difference / (1000 * 60 * 60 * 24))),
        hours: pad(Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
        minutes: pad(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))),
        seconds: pad(Math.floor((difference % (1000 * 60)) / 1000)),
      });
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDatetime]);

  if (finished) {
    return (
      <div className="countdown-timer" data-target-datetime={targetDatetime ?? undefined}>
        Countdown finished
      </div>
    );
  }

  return (
    <div className="countdown-timer" data-target-datetime={targetDatetime ?? undefined}>
      <div className="countdown-timer-values-container">
        <div className="days_container">
          Dias<div className="time_value_box">{parts?.days ?? "00"}</div>
        </div>
        <div className="hours_container">
          Horas<div className="time_value_box">{parts?.hours ?? "00"}</div>
        </div>
        <div className="minutes">
          Minutos<div className="time_value_box">{parts?.minutes ?? "00"}</div>
        </div>
        <div className="seconds_container">
          Segundos<div className="time_value_box">{parts?.seconds ?? "00"}</div>
        </div>
      </div>
      <div className="countdown-timer-description">Próximo jogo</div>
    </div>
  );
}
