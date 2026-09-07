---
name: draw-teams
description: Draw the teams for a Ligas Francesinha matchday, exactly as the site's "Fazer Equipas" button does, and save the draw so the site keeps it. Use whenever the user asks to sortear as equipas, fazer o sorteio, draw or make the teams for today's game, or asks who is playing with whom this week.
---

# Drawing the week's teams

```sh
npm run draw-teams                    # preview, writes nothing
npm run draw-teams -- --commit        # save it
npm run draw-teams -- --whatsapp      # also print the message for the group
```

The draw is the app's own `makeTeams` (`src/lib/domain.ts`), run against the
cloud database, and `--commit` performs the same write as the button. Preview
first, show the user, then commit.

## Save it

**A draw you announce but do not save is not the draw.** Until the week's result
is entered, the site replays the saved draw instead of rolling a new one — so if
nothing is saved, the next person to press "Fazer Equipas" gets different teams
from the ones the group was just sent. Commit unless the user only wanted to see
what a draw might look like.

Committing writes `last_team` and `number_of_teams_made` on the edition, and
updates `src/data/editions.json` to match — the export the site serves on first
render. Commit that file too; it is the only file the draw touches.

## Once it stands

Re-running then replays the saved draw and says so, writing nothing. That is the
site's behaviour, not a quirk of the script, and it is what you should tell a
user who asks whether another draw would change the teams: it would not, until
the result of the week is entered with `add-game`.

To genuinely redo it — someone dropped out, the group asked for another — pass
`--redraw`. It rolls new teams over the same squad and leaves the counter alone,
since the week still had one draw. Only do this when the user has asked for it:
whoever already saw the old teams will not hear about the new ones.

## Worth telling the user

- **It draws the whole squad of the edition, not who confirmed for tonight.**
  Absences are sorted out at the pavilion, not here — say so when you hand over
  the teams.
- **MasterLeague is genuinely random** (the standings are shuffled first).
  TuesdayLeague is not: it snakes down the table, so the same standings always
  give the same teams.
- The script picks the running edition whose final game is still ahead. If more
  than one qualifies it stops and lists them; pass `--edition=<id>`.

## The message for the group

`--whatsapp` prints it ready to paste — the two squads under `*BRANQUELAS*` and
`*MAREGÕES*`, which WhatsApp shows in bold. Give it in a code block so it can be
copied verbatim, and keep it to the teams: the group wants the line-up, not an
explanation of how it was drawn.
