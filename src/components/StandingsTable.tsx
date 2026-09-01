import {
  getNumberOfPlayers,
  playersRelationsClassification,
  type Edition,
} from "@/lib/domain";
import { pyFloat } from "@/lib/format";

import { PlayerNameForm } from "./PlayerLink";

/**
 * Row tint by standing, from `scores/table.html`. First place is blue, last is
 * red, and the rest split on the halfway mark — note the `<=` comparison runs
 * against a float, so an odd squad puts the middle player in the top half.
 */
function rowStyle(place: number | null, numberOfPlayers: number) {
  if (place === 1) return { backgroundColor: "rgba(0, 88, 252, 0.308)" };
  if (place === numberOfPlayers) return { backgroundColor: "rgba(255, 0, 0, 0.288)" };
  if ((place ?? 0) <= numberOfPlayers / 2) return { backgroundColor: "rgba(0, 153, 255, 0.2)" };
  return { backgroundColor: "rgba(228, 120, 120, 0.2)" };
}

/** Shared by `scores/table.html` and the tables embedded on the index page. */
export function StandingsTable({
  edition,
  descriptive = false,
}: {
  edition: Edition;
  /** The index page splits each header into big/small description variants. */
  descriptive?: boolean;
}) {
  const relations = playersRelationsClassification(edition);
  const numberOfPlayers = getNumberOfPlayers(edition);

  return (
    <table
      cellSpacing={0}
      cellPadding={0}
      style={{ backgroundColor: "rgba(255, 255, 255, 1)", width: "100%" }}
    >
      <thead>
        <tr>
          <th width="5%"></th>
          <th className="text"></th>
          <th width="12%" className="not_optional" name="Pontos">
            {descriptive ? (
              <>
                <div className="big_discription">Pontos</div>
                <div className="small_discription">P</div>
              </>
            ) : (
              "Pontos"
            )}
          </th>
          <th width="6%" className="optional">
            Presenças
          </th>
          <th width="6%" className="not_optional" name="Golos">
            {descriptive ? (
              <>
                <div className="big_discription">Golos</div>
                <div className="small_discription">G</div>
              </>
            ) : (
              "Golos"
            )}
          </th>
          <th width="12%" className="optional">
            % Presenças
          </th>
          <th width="6%">V</th>
          <th width="6%" className="optional">
            E
          </th>
          <th width="6%">D</th>
          <th width="6%" className="optional">
            GM
          </th>
          <th width="6%" className="optional">
            GS
          </th>
          <th width="6%" className="optional">
            DG
          </th>
          <th width="6%" className="optional"></th>
        </tr>
      </thead>
      <tbody>
        {relations.map((relation) => (
          <tr key={relation.id} style={rowStyle(relation.place, numberOfPlayers)}>
            <td>{relation.place}</td>
            <td className="text">
              <PlayerNameForm
                playerName={relation.player?.name ?? ""}
                editionName={edition.name}
              />
            </td>
            <td>
              <strong>{pyFloat(relation.points)}</strong>
            </td>
            <td className="optional">{relation.appearances}</td>
            <td>{relation.goals}</td>
            <td className="optional">{pyFloat(relation.percentageOfAppearances)}</td>
            <td>{relation.wins}</td>
            <td className="optional">{relation.draws}</td>
            <td>{relation.losts}</td>
            <td className="optional">{relation.goalsScoredByTeam}</td>
            <td className="optional">{relation.goalsSufferedByTeam}</td>
            <td className="optional">
              {(relation.goalsScoredByTeam ?? 0) - (relation.goalsSufferedByTeam ?? 0)}
            </td>
            <td className="optional"></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
