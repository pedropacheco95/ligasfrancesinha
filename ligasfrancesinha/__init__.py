import os

from flask import Flask , session
from tempfile import mkdtemp
from flask_session import Session
from flask_assets import Environment, Bundle
from flask_login import LoginManager

from . import sql_db
from . import modules

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)

    database_path = 'sqlite:///' + app.root_path + '/database.db'

    app.config['SECRET_KEY'] = 'hjshjhdjah kjshkjdhjs'
    app.config['SQLALCHEMY_DATABASE_URI'] = database_path
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config["TEMPLATES_AUTO_RELOAD"] = True

    # Ensure responses aren't cached
    @app.after_request
    def after_request(response):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Expires"] = 0
        response.headers["Pragma"] = "no-cache"
        return response

    # Configure session to use filesystem (instead of signed cookies)
    app.config["SESSION_FILE_DIR"] = mkdtemp()
    app.config["SESSION_PERMANENT"] = False
    app.config["SESSION_TYPE"] = "filesystem"
    Session(app)

    if test_config is None:
        # Load the instance config when not testing
        app.config.from_pyfile('config.py',silent=True)
    else:
        # Load the test config
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    modules.register_blueprints(app)

    assets = Environment(app)

    scss_bundle_backend = Bundle('style/scss/main_backend.scss', filters='pyscss', depends='style/scss/*.scss',output='style/styles_backend.css')
    scss_bundle_frontend = Bundle('style/scss/main_frontend.scss', filters='pyscss', depends='style/scss/*.scss',output='style/styles_frontend.css')
    assets.register('scss_backend', scss_bundle_backend)
    assets.register('scss_frontend', scss_bundle_frontend)

    login_manager = LoginManager(app)

    from .auth import setup_login_manager
    setup_login_manager(login_manager)

    app.login_manager = login_manager

    with app.app_context():
        sql_db.init_db(app)

    return app