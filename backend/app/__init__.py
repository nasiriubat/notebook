from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from config import Config
from flask_migrate import Migrate
from flask_cors import CORS


app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
# CORS(app, origins=["http://localhost:3000"])

# CORS(app, origins=["http://example.com", "https://example.com"])

db = SQLAlchemy(app)
jwt = JWTManager(app)

migrate=Migrate(app, db)

from app.models.user import User
from app.models.notebook import Notebook
from app.models.source import Source

# Import and register controllers
from app.controllers.auth_controller import register, login, change_password, forgot_password, reset_password, logout, generate_new_token
from app.controllers.notebook_controller import create_notebook, get_notebooks, update_notebook, delete_notebook, get_notebook
from app.controllers.source_controller import add_source, get_sources, update_source, delete_source, get_source

# Auth routes
app.add_url_rule('/register', 'register', register, methods=['POST'])
app.add_url_rule('/login', 'login', login, methods=['POST'])
app.add_url_rule('/change-password', 'change_password', change_password, methods=['POST'])
app.add_url_rule('/forgot-password', 'forgot_password', forgot_password, methods=['POST'])
app.add_url_rule('/reset-password', 'reset_password', reset_password, methods=['POST'])
app.add_url_rule('/generate-new-token', 'generate_new_token', generate_new_token, methods=['POST'])
app.add_url_rule('/logout', 'logout', logout, methods=['POST'])

# Notebook routes
app.add_url_rule('/notebooks', 'create_notebook', create_notebook, methods=['POST'])
app.add_url_rule('/notebooks', 'get_notebooks', get_notebooks, methods=['GET'])
app.add_url_rule('/notebooks/<int:notebook_id>', 'get_notebook', get_notebook, methods=['GET'])
app.add_url_rule('/notebooks/<int:notebook_id>', 'update_notebook', update_notebook, methods=['PUT'])
app.add_url_rule('/notebooks/<int:notebook_id>', 'delete_notebook', delete_notebook, methods=['DELETE'])

# Source routes
app.add_url_rule('/sources', 'add_source', add_source, methods=['POST'])
app.add_url_rule('/sources/<int:notebook_id>', 'get_sources', get_sources, methods=['GET'])
app.add_url_rule('/single-source/<int:source_id>', 'get_source', get_source, methods=['GET'])
app.add_url_rule('/sources/<int:source_id>', 'update_source', update_source, methods=['PUT'])
app.add_url_rule('/sources/<int:source_id>', 'delete_source', delete_source, methods=['DELETE'])
