import functools
import datetime

from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from ligasfrancesinha.tools import auth_tools

from ligasfrancesinha.models import Player , Edition , League , Association_PlayerEdition , Game , Association_PlayerGame

bp = Blueprint('create', __name__, url_prefix='/create')

@bp.route('/choose_edition/<view>', methods=('GET', 'POST'))
def choose_edition(view):
    editions = Edition.query.all()
    if request.method == 'POST':
        edition_name = request.form.get('edition_name')
        url = 'create.' + view
        return redirect(url_for(url,edition_name=edition_name))

    return render_template('create/choose_edition.html', editions = editions)

@auth_tools.admin_required
@bp.route('/game', methods=('GET', 'POST'))
@bp.route('/game/<edition_name>', methods=('GET', 'POST'))
def game(edition_name=None):
    edition = Edition.query.filter_by(name=edition_name).first()
    if not edition:
        return redirect(url_for('create.choose_edition' , view='game'))
    if request.method == 'POST':
        error = None
        goals_team1 = [int(goals) for goals in request.form.getlist('goals_team1') if goals]
        goals_team2 = [int(goals) for goals in request.form.getlist('goals_team2') if goals]
        if not goals_team1 or not goals_team2:
            error = 'Uma das equipas não tem um numero de golos definido'


        player_team1_ids = [int(id) for id in request.form.getlist('player_team_1') if id and id != -1]
        players_team1 = Player.query.filter(Player.id.in_(tuple(player_team1_ids))).all()
        player_team2_ids = [int(id) for id in request.form.getlist('player_team_2') if id and id != 'player_missing']
        players_team2 = Player.query.filter(Player.id.in_(tuple(player_team2_ids))).all()

        if list(set(players_team1).intersection(players_team2)):
            error = 'Houve um jogador posto nas duas equipas'
        if not error:
            goals_team1 = goals_team1[0]
            goals_team2 = goals_team2[0]
            winner = 1 if goals_team1 > goals_team2 else -1 if goals_team1 < goals_team2 else 0
            date = datetime.datetime.strptime(request.form.get('game_date'), '%Y-%m-%d')
            matchweek = max([game.matchweek for game in edition.games]) + 1 if [game.matchweek for game in edition.games] else 1
            game = Game(goals_team1=goals_team1,goals_team2=goals_team2,winner=winner,edition_id=edition.id,matchweek = matchweek,date=date)
            game.create()

            for player in players_team1:
                goals_string = request.form.get('goals_{id}'.format(id=player.id))
                goals = int(goals_string) if goals_string else 0
                team = 'Branquelas'
                association = Association_PlayerGame(player_id= player.id, game_id = game.id,team = team,goals=goals)
                association.create()

            for player in players_team2:
                goals_string = request.form.get('goals_{id}'.format(id=player.id))
                goals = int(goals_string) if goals_string else 0
                team = 'Maregões'
                association = Association_PlayerGame(player_id= player.id, game_id = game.id,team = team,goals=goals)
                association.create()

            return redirect(url_for('scores.table',league_id = edition.league.id,edition_id=edition.id,recalculate=True))
        flash(error)

    default_day = datetime.date.today()
    if edition.league.name == 'MasterLeague':
        offset = (default_day.weekday() - 3) % 7
        default_day -= datetime.timedelta(days=offset)
    elif edition.league.name == 'TuesdayLeague':
        offset = (default_day.weekday() - 1) % 7
        default_day -= datetime.timedelta(days=offset)

    player_ids = edition.players_ids_last_team()
    players = [Player.query.filter_by(id=player_id).first() for player_id in player_ids] 

    edition_players = [rel.player for rel in edition.players_relations]

    return render_template('create/game.html', edition=edition , default_day=default_day,players=players,edition_players=edition_players)
