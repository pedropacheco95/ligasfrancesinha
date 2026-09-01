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
turned up**; everyone else in the edition did not play that week and must not
appear in the game.

## The loop

Save the message verbatim to a file and preview it:

```sh
npm run add-game -- /tmp/result.txt
```

Nothing is written. Show the preview to the user, then save:

```sh
npm run add-game -- /tmp/result.txt --commit
```

If the script stops on a name, **that is your job, not the user's** — read the
next section, decide, and re-run with the decision pinned:

```sh
npm run add-game -- /tmp/result.txt --resolve="Pacheco=1"
```

Only involve the user when the reasoning below genuinely does not settle it.

## Resolving a name the script would not guess

The script matches loosely (any part of what was typed must prefix part of a
player's name or full name) and eliminates candidates already claimed by another
line in the same message. So `Pacheco` alongside `Tomás P` is already decided.
What reaches you is what survived that.

The report gives you each candidate's id, full name, and appearances that
edition, plus who else in the squad went unmentioned. Reason over it:

- **The group's naming is self-disambiguating.** People write the shortest thing
  that is unambiguous *to them*. A bare `Pacheco` in an edition with three
  Pachecos means the one everybody just calls Pacheco — normally the one whose
  registered name is closest to what was typed, and who plays most. If they had
  meant one of the others they would have written `Tomás P` or `Jaime`, as they
  do elsewhere in the same message.
- **Prefer the plain name over a full-name coincidence.** `Pacheco` matching
  Jaime only because his full name is Jaime Pacheco is far weaker than it
  matching Pedro Pacheco, who is *called* Pacheco.
- **Appearances break near-ties.** Someone with 15 appearances is likelier than
  someone with 2.
- **Check the unmentioned list.** If a strong candidate is not otherwise in the
  message and the squad is otherwise fully accounted for, that supports them.

State your reasoning in one line when you show the preview, so the user can
correct you: *"Read `Pacheco` as Pedro Pacheco — Tomás and Jaime are named
separately in this message."*

Ask the user only when two candidates are genuinely equally plausible. Never
pick silently: a wrong choice credits a goal and an appearance to someone who
was not there and shifts the standings.

## What it works out for itself

- **Which edition**, by which running squad every name fits.
- **The matchweek**, as one past that edition's highest.
- **The date**, as the most recent matchday for the league (Thursday for
  MasterLeague, Tuesday for TuesdayLeague). Override with `--date=2026-09-03`.
- `--edition=12` forces an edition if both somehow fit.

## Worth telling the user

If the scorers do not add up to the team's total the preview says so, e.g.
`note: 5 goal(s) unattributed`. Usually fine — nobody remembers every scorer —
but mention it in case a name was dropped from the message.

## Afterwards

Committing inserts the game and its line-up, then recalculates that edition's
standings with the app's own logic. The app reads the hosted database, so
everyone sees the change immediately.
