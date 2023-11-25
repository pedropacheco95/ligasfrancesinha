import functools
import random
import datetime

from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from ligasfrancesinha.models import Player , Edition , League , Association_PlayerEdition

bp = Blueprint('players', __name__, url_prefix='/player')

@bp.route('/', methods=('GET', 'POST'))
@bp.route('/<view>/<player_name>/<edition_name>', methods=('GET', 'POST'))
def index(view,player_name,edition_name):
    if view == 'general':
        return redirect(url_for('players.general',player_name = player_name, edition_name = edition_name))
    elif view == 'games_played':
        return redirect(url_for('players.general',player_name = player_name))
    elif view == 'all_editions':
        return redirect(url_for('players.general',player_name = player_name))
    return render_template('index.html')

@bp.route('/general/<player_name>', methods=('GET', 'POST'))
@bp.route('/general/<player_name>/<edition_name>', methods=('GET', 'POST'))
def general(player_name,edition_name=None):

    player = Player.query.filter_by(name=player_name).first()
    if not player:
        return redirect(url_for('errors.no_model_with_name', model = 'player',name = player_name))
    if not edition_name:
        return redirect(url_for('players.general',player_name = player_name, edition_name = player.editions_relations[-1].edition.name))
    edition = Edition.query.filter_by(name = edition_name).first()
    editions = player.editions()

    association = Association_PlayerEdition.query.filter_by(player_id = player.id, edition_id = edition.id).first()

    games = player.games_played_on_edition(edition)

    return render_template('players/general.html', view='general', player = player , edition = edition , editions = editions, games = games , association= association)

@bp.route('/games_played/<player_name>', methods=('GET', 'POST'))
def games_played(player_name):

    player = Player.query.filter_by(name=player_name).first()
    if not player:
        return redirect(url_for('errors.no_model_with_name', model = 'player',name = player_name))

    games = player.games_played()

    return render_template('players/games_played.html', view='games_played', player = player , games = games)

@bp.route('/all_editions/<player_name>', methods=('GET', 'POST'))
def all_editions(player_name,edition_name=None):

    player = Player.query.filter_by(name=player_name).first()
    if not player:
        return redirect(url_for('errors.no_model_with_name', model = 'player',name = player_name))
    return render_template('players/all_editions.html', view='all_editions', player = player)