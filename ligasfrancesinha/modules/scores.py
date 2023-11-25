import functools
import random
from click import edit

from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from ligasfrancesinha.models import Player , Edition , League , Association_PlayerEdition

bp = Blueprint('scores', __name__, url_prefix='/scores')

#WHY???
@bp.route('/', methods=('GET', 'POST'))
@bp.route('/<view>/<league_id>', methods=('GET', 'POST'))
@bp.route('/<view>/<league_id>/<edition_id>', methods=('GET', 'POST'))
def index(view,league_id,edition_id):
    if view == 'table':
        return redirect(url_for('scores.table',league_id = league_id, edition_id = edition_id))
    elif view == 'games':
        return redirect(url_for('scores.games',league_id = league_id, edition_id = edition_id))
    elif view == 'scorers':
        return redirect(url_for('scores.scorers',league_id = league_id, edition_id = edition_id))
    elif view == 'create_teams':
        return redirect(url_for('scores.create_teams',league_id = league_id, edition_id = edition_id))
    return render_template('index.html')

@bp.route('/table/<league_id>', methods=('GET', 'POST'))
@bp.route('/table/<league_id>/<edition_id>', methods=('GET', 'POST'))
@bp.route('/table/<league_id>/<edition_id>/<recalculate>', methods=('GET', 'POST'))
def table(league_id,edition_id=None,recalculate=None):

    league = League.query.filter_by(id=league_id).first()
    if not league:
        return redirect(url_for('errors.no_model_with_name', model = 'league',name = 'league_name'))
    if not edition_id:
        return redirect(url_for('scores.table', league_id = league_id, edition_id = league.editions[-1].id))
    edition = Edition.query.filter_by(id=edition_id).first()
    if recalculate:
        edition.update_table(force_update=True)

    return render_template('scores/table.html', view='table',league = league, edition = edition)

@bp.route('/games/<league_id>', methods=('GET', 'POST'))
@bp.route('/games/<league_id>/<edition_id>', methods=('GET', 'POST'))
def games(league_id,edition_id=None):

    league = League.query.filter_by(id=league_id).first()
    if not league:
        return redirect(url_for('errors.no_model_with_name', model = 'league',name = 'league_name'))
    if not edition_id:
        return redirect(url_for('scores.games',league_id = league_id, edition_id = league.editions[-1].id))
    edition = Edition.query.filter_by(id=edition_id).first()

    games = edition.games
    return render_template('scores/games.html', view='games',games=games,league = league, edition = edition)

@bp.route('/scorers/<league_id>', methods=('GET', 'POST'))
@bp.route('/scorers/<league_id>/<edition_id>', methods=('GET', 'POST'))
def scorers(league_id,edition_id=None):

    league = League.query.filter_by(id=league_id).first()
    if not league:
        return redirect(url_for('errors.no_model_with_name', model = 'league',name = 'league_name'))
    if not edition_id:
        return redirect(url_for('scores.scorers',league_id = league_id, edition_id = league.editions[-1].id))
    edition = Edition.query.filter_by(id=edition_id).first()

    return render_template('scores/scorers.html', view='scorers',league = league, edition = edition)

@bp.route('/create_teams/<league_id>', methods=('GET', 'POST'))
@bp.route('/create_teams/<league_id>/<edition_id>', methods=('GET', 'POST'))
def create_teams(league_id,edition_id=None):

    league = League.query.filter_by(id=league_id).first()
    if not league:
        return redirect(url_for('errors.no_model_with_name', model = 'league',name = 'league_name'))
    if not edition_id:
        return redirect(url_for('scores.create_teams',league_id = league_id, edition_id = league.editions[-1].id))
    edition = Edition.query.filter_by(id=edition_id).first()

    if request.method == 'POST':
        teams = edition.make_teams()
        return render_template('scores/create_teams.html', view='create_teams', show = True, teams=teams,league = league, edition = edition)

    return render_template('scores/create_teams.html', view='create_teams', show = False,league = league, edition = edition)
