import functools
import json
import sys
import csv
import os

from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for , current_app , jsonify , render_template_string
from werkzeug.security import check_password_hash, generate_password_hash
import jinja2

from ligasfrancesinha.models import *
from ligasfrancesinha.tools import tools

bp = Blueprint('api', __name__, url_prefix='/api')


@bp.route('/edit/<model>/<id>', methods=('GET', 'POST'))
def edit(model,id):
    if request.method == 'POST':
        model = globals()[model]
        obj = model.query.filter_by(id=id).first()
        form = obj.get_edit_form()
        values = form.set_values(request)
        obj.update_with_dict(values)
        return jsonify(sucess=True)
    return jsonify(sucess=False)

@bp.route('/delete/<model>/<id>', methods=('GET', 'POST'))
def delete(model,id):
    model_name = model
    if request.method == 'POST':
        model = globals()[model]
        obj = model.query.filter_by(id=id).first()
        obj.delete()
        return jsonify(url_for('editor.display_all',model=model_name))
    return jsonify(sucess=False)

@bp.route('/query/<model>', methods=('GET', 'POST'))
def query(model):
    model = globals()[model]
    instances = model.query.all()
    instances = [{'value':instance.id,'name':instance.name} for instance in instances]
    return jsonify(instances)

@bp.route('/remove_relationship', methods=('GET', 'POST'))
def remove_relationship():
    data = request.get_json()

    model_name1 = data.get('model_name1')
    model_name2 = data.get('model_name2')
    field_name = data.get('field_name')
    id1 = int(data.get('id1'))
    id2 = int(data.get('id2'))

    model1 = globals()[model_name1]
    model2 = globals()[model_name2]

    obj1 = model1.query.filter_by(id=id1).first()
    obj2 = model2.query.filter_by(id=id2).first()

    field = getattr(obj1,field_name)
    field.remove(obj2)
    obj1.save()
    return jsonify(sucess=True)

@bp.route('/modal_create_page/<model>', methods=('GET', 'POST'))
def modal_create_page(model):
    model_name = model
    model = globals()[model_name]
    empty_instance = model()
    form = empty_instance.get_basic_create_form()
    if request.method == 'POST':
        values = form.set_values(request)
        empty_instance.update_with_dict(values)
        empty_instance.create()
        response = {'value':empty_instance.id,'name':empty_instance.name}
        return jsonify(response)
    data = empty_instance.get_basic_create_data(form)
    return render_template('editor/modal_create.html',data = data)


@bp.route("/download_csv/<model>", methods =["GET", "POST"])
def download_csv(model):
    model_name = model
    model = globals()[model_name]
    filepath = tools.create_csv_for_model(model)
    return filepath


@bp.route("/upload_csv_to_db/<model>", methods =["GET", "POST"])
def upload_csv_to_db(model):
    model_name = model
    model = globals()[model_name]
    check = tools.upload_csv_to_model(model)
    if check:
        return jsonify(url_for('editor.display_all',model=model_name))
    else:
        return jsonify(sucess=False)

##RETHINK THESE FUNCTIONS  

@bp.route('/choose_new_edition_scores/<view>', methods=('GET', 'POST'))
def choose_new_edition_scores(view):
    if request.method == 'POST':
        edition_name = request.form['edicao']
        edition = Edition.query.filter_by(name=edition_name).first()
        league = League.query.filter_by(id=edition.league_id).first()
        return redirect(url_for('scores.index',view = view ,league_id = league.id, edition_id = edition.id))

    return redirect(url_for('main.index'))

@bp.route('/choose_new_edition_players/<view>/<player_name>', methods=('GET', 'POST'))
def choose_new_edition_players(view,player_name):
    if request.method == 'POST':
        edition_name = request.form['edicao']
        edition = Edition.query.filter_by(name=edition_name).first()
        return redirect(url_for('players.index',view = view ,player_name = player_name, edition_name = edition.name))

    return redirect(url_for('main.index'))

@bp.route('/player_image_url/<id>')
def player_image_url(id):
    if id == 'player_missing':
        return jsonify(url_for('static', filename="images/Players/no_player.png"))
    player = Player.query.filter_by(id=id).first()
    return jsonify(player.full_image_url())

@bp.route('edition/replace_player/<id>', methods=('GET', 'POST'))
def edition_replace_player(id):
    edition = Edition.query.filter_by(id=id).first()
    if request.method == 'POST':
        player_1_id = int(request.form['player_1']) if request.form['player_1'] else None
        player_2_id = int(request.form['player_2']) if request.form['player_2'] else None
        if player_1_id and player_2_id:
            player_1 = Player.query.filter_by(id=player_1_id).first()
            player_2 = Player.query.filter_by(id=player_2_id).first()
            check = edition.replace_players(player_1,player_2)
        else:
            check = False
        if not check:
            players = Player.query.all()
            return render_template('edit/edition_replace_player.html',edition=edition,players=players,error = 'Nao foi possivel alterar os jogadores')
        return render_template('scores/table.html', view='table',league = edition.league, edition = edition)
    players = Player.query.all()
    return render_template('edit/edition_replace_player.html',edition=edition,players=players)

@bp.route('/player_edition_row/<player_id>/<int:team>')
def get_player_row(player_id,team):
    if player_id == 'no_player':
        html = render_template_string('{% from "macros/frontend_creation.html" import create_game_empty_player_input %}{{ create_game_empty_player_input(team) }}', team=team)
        return jsonify({'html': html})
    
    player = Player.query.filter_by(id=int(player_id)).first()
    html = render_template_string('{% from "macros/frontend_creation.html" import create_game_player_input %}{{ create_game_player_input(player,team) }}', player=player,team=team)
    return jsonify({'html': html})