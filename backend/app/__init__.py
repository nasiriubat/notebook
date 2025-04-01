from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from config import Config
from flask_migrate import Migrate
from flask_cors import CORS


app = Flask(__name__)
app.config.from_object(Config)

# Configure CORS with specific settings
# CORS(app, resources={
#     r"/*": {
#         "origins": ["http://localhost:5173"],
#         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#         "allow_headers": ["Content-Type", "Authorization"]
#     }
# })

# Enable CORS for all routes and origins (for development purposes only)
CORS(app, supports_credentials=True)


db = SQLAlchemy(app)
jwt = JWTManager(app)

migrate=Migrate(app, db)

from app.models.user import User
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.chat import Chat

# Import and register controllers
from app.controllers.auth_controller import register, login, change_password, forgot_password, reset_password, logout, generate_new_token
from app.controllers.notebook_controller import create_notebook, get_notebooks, update_notebook, delete_notebook, get_notebook
from app.controllers.source_controller import add_source, get_sources, update_source, delete_source, get_source
from app.controllers.chat_controller import send_chat_message, get_chat_messages, delete_chat_message

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

# Chat routes
app.add_url_rule('/chat', 'send_chat_message', send_chat_message, methods=['POST'])
app.add_url_rule('/chat/<int:notebook_id>', 'get_chat_messages', get_chat_messages, methods=['GET'])
app.add_url_rule('/chat/<int:notebook_id>', 'delete_chat_message', delete_chat_message, methods=['DELETE'])
