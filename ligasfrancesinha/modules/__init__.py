from . import main
from . import api
from . import editor
from . import auth
from . import games
from . import players
from . import scores
from . import create

# Register Blueprints
def register_blueprints(app):
    app.register_blueprint(main.bp)
    app.register_blueprint(api.bp)
    app.register_blueprint(editor.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(games.bp)
    app.register_blueprint(players.bp)
    app.register_blueprint(scores.bp)
    app.register_blueprint(create.bp)
    return True