---
name: add-game
description: Record a weekly Ligas Francesinha result from the message the group sends (team lines like "brancos 6" followed by scorers). Use whenever the user pastes a result, asks to add a game, enter a score, or log the week's match.
---

# Adding a week's result

The result arrives as a message like this:

```
brancos 6
Pacheco 2
Ferna 0
Fragoso 3
Nuno 1
Vinhas 0

pretos 11
Afonso 2
Zé SF 3
Bernardo Q 1
Fanuca
```

`brancos` is Branquelas, `pretos` is Maregões, and the number beside each is that
side's final score. Under it, one line per player who actually played, with the
goals they scored — a name with no number scored none. **Only the players listed
turned up**; everyone else in the edition simply did not play that week and must
not appear in the game.

## How to do it

Save the message verbatim to a file, then preview:

```sh
npm run add-game -- /tmp/result.txt
```

That prints which edition and matchweek it resolved to, both line-ups with the
names it matched, and any goals unaccounted for. **It writes nothing.** Show that
preview to the user, then save it:

```sh
npm run add-game -- /tmp/result.txt --commit
```

Committing inserts the game and its line-up, then recalculates that edition's
standings using the app's own logic.

## What it works out for itself

- **Which edition.** It tries every running edition and picks the one whose
  roster matches every name. The two leagues have almost disjoint squads, so this
  is normally unambiguous.
- **The matchweek**, as one past the edition's highest.
- **The date**, as the most recent matchday for that league (Thursday for
  MasterLeague, Tuesday for TuesdayLeague). Override with `--date=2026-09-03`.

## When it stops

It never guesses a name. If one is ambiguous or unrecognised it prints the
candidates and exits without writing:

```
Pacheco: ambiguous — could be Pedro Pacheco, Tomás Pacheco, Jaime
```

**Ask the user which they meant** and put the fuller name in the message, then
re-run. Do not pick one yourself — the wrong choice silently credits goals and an
appearance to the wrong person and shifts the standings.

`--edition=12` forces an edition if the roster genuinely cannot decide.

## Worth telling the user

If the scorers do not add up to the team's total, the preview says so, for
example `note: 5 goal(s) unattributed`. That is often fine — nobody remembers
every scorer — but mention it, in case a scorer was dropped from the message.

## Afterwards

The standings update immediately, and everyone sees them: the app reads a hosted
database, not the browser. Check the edition's table if you want to confirm.
