from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import app, db
from app.models.chat import Chat
from app.models.notebook import Notebook
from app.models.source import Source
from app.helper.ai_generate import get_conversation_with_chunks, openai_generate
from app.utils.rag_utils import search_across_indices
import traceback

def verify_notebook_access(notebook_id: int, user_id: int) -> tuple[Notebook, tuple]:
    """Verify notebook exists and belongs to user."""
    notebook = Notebook.query.filter_by(id=notebook_id, user_id=user_id).first()
    if not notebook:
        return None, (jsonify(error="Notebook not found or unauthorized access"), 403)
    return notebook, None

def handle_error(e: Exception, operation: str) -> tuple:
    """Handle errors consistently across endpoints."""
    db.session.rollback()
    print(f"Error in {operation}: {str(e)}")
    print(traceback.format_exc())
    return jsonify(error=str(e)), 500

@jwt_required()
def send_chat_message():
    data = request.get_json()
    query = data.get("query")
    notebook_id = data.get("notebook_id")
    source_ids = data.get("source_ids", [])
    language = data.get("language", "en")
    
    if not query or not notebook_id:
        return jsonify(error="Query and notebook ID are required"), 400
        
    try:
        current_user_id = get_jwt_identity()
        notebook, error = verify_notebook_access(notebook_id, current_user_id)
        if error:
            return error
            
        # Process sources and get context
        used_source_titles = []
        
        if source_ids:
            sources = Source.query.filter(
                Source.id.in_(source_ids),
                Source.notebook_id == notebook_id
            ).all()
            
            if sources:
                file_ids = [source.file_id for source in sources if source.file_id]
                
                if file_ids:
                    search_results = search_across_indices(query, file_ids, top_k=5)
                    
                    if search_results:
                        chunks = [
                            {
                                'source': next(s.title for s in sources if s.file_id == result['file_id']),
                                'text': result['chunk']
                            }
                            for result in search_results
                        ]
                        reply = get_conversation_with_chunks(query, chunks, language)
                        used_source_titles = [source.title for source in sources 
                                            if source.file_id in {r["file_id"] for r in search_results}]
                    else:
                        reply = openai_generate(
                            f"Context: {'\n\n'.join(f'Summary of {s.title}:\n{s.description}' for s in sources)}\n\n"
                            f"Question: {query}\n\nPlease respond in {language} language."
                        )
                        used_source_titles = [source.title for source in sources]
                else:
                    reply = openai_generate(
                        f"Context: {'\n\n'.join(f'Summary of {s.title}:\n{s.description}' for s in sources)}\n\n"
                        f"Question: {query}\n\nPlease respond in {language} language."
                    )
                    used_source_titles = [source.title for source in sources]
            else:
                reply = openai_generate(f"Question: {query}\n\nPlease respond in {language} language.")
        else:
            reply = openai_generate(f"Question: {query}\n\nPlease respond in {language} language.")
        
        # Save messages
        db.session.add_all([
            Chat(notebook_id=notebook_id, message=query, role="user", sources=[]),
            Chat(notebook_id=notebook_id, message=reply, role="assistant", sources=used_source_titles)
        ])
        db.session.commit()
        
        return jsonify({
            "reply": reply,
            "message_id": Chat.query.filter_by(notebook_id=notebook_id).order_by(Chat.id.desc()).first().id,
            "sources": used_source_titles,
            "warning": "Some selected sources were deleted" if source_ids and not sources else None
        }), 200
        
    except Exception as e:
        return handle_error(e, "send_chat_message")

@jwt_required()
def get_chat_messages(notebook_id):
    try:
        current_user_id = get_jwt_identity()
        notebook, error = verify_notebook_access(notebook_id, current_user_id)
        if error:
            return error
            
        messages = [
            {
                "role": msg.role,
                "content": msg.message,
                "sources": msg.sources if msg.role == "assistant" and msg.sources else []
            }
            for msg in Chat.query.filter_by(notebook_id=notebook_id).order_by(Chat.created_at.asc()).all()
        ]
        
        return jsonify(messages=messages), 200
        
    except Exception as e:
        return handle_error(e, "get_chat_messages")

@jwt_required()
def delete_chat_message(notebook_id):
    try:
        current_user_id = get_jwt_identity()
        notebook, error = verify_notebook_access(notebook_id, current_user_id)
        if error:
            return error
            
        Chat.query.filter_by(notebook_id=notebook_id).delete()
        db.session.commit()
        
        return jsonify(message="Chat messages deleted successfully"), 200
        
    except Exception as e:
        return handle_error(e, "delete_chat_message")
    
    