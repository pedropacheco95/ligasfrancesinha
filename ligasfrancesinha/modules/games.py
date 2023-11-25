import functools
import random

from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from ligasfrancesinha.models import Player , Edition , Game , Association_PlayerEdition

bp = Blueprint('games', __name__, url_prefix='/game')

@bp.route('/<id>', methods=('GET', 'POST'))
def general(id):

    game = Game.query.filter_by(id=id).first()
    if not game:
        return redirect(url_for('errors.no_model_with_name', model = 'game',name = id))

    edition = game.edition
    teams = game.players_by_team()

    return render_template('games/games.html', view='general', game = game , edition = edition, teams=teams)
