from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import app, db
from openai import OpenAI
from app.models.chat import Chat
from app.models.notebook import Notebook
from app.models.source import Source
from app.helper.ai_generate import openai_generate,ollama32_generate


@jwt_required()
def send_chat_message():
    data = request.get_json()
    query = data.get("query")
    context = data.get("context", "")
    is_regenerate = data.get("regenerate", False)
    notebook_id = data.get("notebook_id")
    source_ids = data.get("source_ids", [])
    
    if not query:
        return jsonify(error="Query is required"), 400
        
    if not notebook_id:
        return jsonify(error="Notebook ID is required"), 400
        
    try:
        # Get current user ID from JWT token
        current_user_id = get_jwt_identity()
        
        # Verify notebook exists and belongs to user
        notebook = Notebook.query.filter_by(id=notebook_id, user_id=current_user_id).first()
        if not notebook:
            return jsonify(error="Notebook not found or unauthorized access"), 403
            
        # Verify sources exist and belong to the notebook
        source_titles = []
        if source_ids:
            sources = Source.query.filter(
                Source.id.in_(source_ids),
                Source.notebook_id == notebook_id
            ).all()
            
            # If some sources were deleted, we'll still proceed with the available ones
            if sources:
                source_titles = [source.title for source in sources]
            else:
                # If all sources were deleted, we'll use an empty context
                context = ""
        
        # Save user message first
        user_message = Chat(
            notebook_id=notebook_id,
            message=query,
            role="user",
            sources=[]  # User messages don't have sources
        )
        db.session.add(user_message)
        
        # Prepare the messages for OpenAI
        
        prompt= f"Context: {context}\n\nQuestion: {query}"
        
        # Extract the assistant's response
        reply = openai_generate(prompt,is_regenerate)
        # reply = ollama32_generate(prompt,is_regenerate)
        
        # Save assistant message
        assistant_message = Chat(
            notebook_id=notebook_id,
            message=reply,
            role="assistant",
            sources=source_titles  # Store only the titles
        )
        db.session.add(assistant_message)
        db.session.commit()
        
        return jsonify({
            "reply": reply,
            "message_id": assistant_message.id,
            "sources": source_titles,  # Return only the titles
            "warning": "Some selected sources were deleted" if source_ids and not sources else None
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify(error=str(e)), 500

@jwt_required()
def get_chat_messages(notebook_id):
    try:
        # Get current user ID from JWT token
        current_user_id = get_jwt_identity()
        
        # Verify notebook exists and belongs to user
        notebook = Notebook.query.filter_by(id=notebook_id, user_id=current_user_id).first()
        if not notebook:
            return jsonify(error="Notebook not found or unauthorized access"), 403
            
        # Get all chat messages for the notebook
        chat_messages = Chat.query.filter_by(notebook_id=notebook_id).order_by(Chat.created_at.asc()).all()
        
        # Convert messages to dictionary format
        messages = []
        for msg in chat_messages:
            message_dict = {
                "role": msg.role,
                "content": msg.message,
                "sources": msg.sources if msg.role == "assistant" and msg.sources else []
            }
            messages.append(message_dict)
        
        return jsonify(messages=messages), 200
        
    except Exception as e:
        return jsonify(error=str(e)), 500

@jwt_required()
def delete_chat_message(notebook_id):
    try:
        # Verify notebook exists and belongs to user
        notebook = Notebook.query.get_or_404(notebook_id)
        current_user_id = get_jwt_identity()
        
        if notebook.user_id != int(current_user_id):
            return jsonify(error="Unauthorized access to notebook"), 403
            
        # Delete all chat messages for the notebook
        Chat.query.filter_by(notebook_id=notebook_id).delete()
        db.session.commit()
        
        return jsonify(message="Chat messages deleted successfully"), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify(error=str(e)), 500
    
    