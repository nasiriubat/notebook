from app.controllers.notebook_controller import get_notebooks, get_notebook, create_notebook, update_notebook, delete_notebook
from app.controllers.source_controller import get_sources, upload_source, delete_source, update_source
from app.controllers.chat_controller import send_chat_message, get_chat_messages, delete_chat_messages
from app.controllers.podcast_controller import generate_podcast

# Podcast routes
api.add_resource(PodcastController, '/api/podcast/generate/<int:notebook_id>') 