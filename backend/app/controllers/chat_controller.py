from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import app, db
from openai import OpenAI
from app.models.chat import Chat
from app.models.notebook import Notebook
from app.models.source import Source

client = OpenAI(api_key=app.config["OPENAI_API_KEY"])

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
            
            if len(sources) != len(source_ids):
                return jsonify(error="One or more sources not found or do not belong to the notebook"), 404
                
            # Extract only the titles
            source_titles = [source.title for source in sources]
        
        # Prepare the messages for OpenAI
        messages = [
            {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context."},
            {"role": "user", "content": f"Context: {context}\n\nQuestion: {query}"}
        ]
        
        # Get response from OpenAI with different parameters for regeneration
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.8 if is_regenerate else 0.7,  # Slightly higher temperature for regeneration
            max_tokens=1000
        )
        
        # Extract the assistant's response
        reply = response.choices[0].message.content
        
        # Create chat message with source titles
        chat_message = Chat(
            notebook_id=notebook_id,
            message=reply,
            sources=source_titles  # Store only the titles
        )
        db.session.add(chat_message)
        db.session.commit()
        
        return jsonify({
            "reply": reply,
            "message_id": chat_message.id,
            "sources": source_titles  # Return only the titles
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify(error=str(e)), 500 

@jwt_required()
def get_chat_messages(notebook_id):
    try:
        # Verify notebook exists and belongs to user
        notebook = Notebook.query.get_or_404(notebook_id)
        current_user_id = get_jwt_identity()
        
        if notebook.user_id != int(current_user_id):
            return jsonify(error="Unauthorized access to notebook"), 403
            
        # Get all chat messages for the notebook
        chat_messages = Chat.query.filter_by(notebook_id=notebook_id).order_by(Chat.created_at.asc()).all()
        
        return jsonify(messages=[message.to_dict() for message in chat_messages]), 200
        
    except Exception as e:
        return jsonify(error=str(e)), 500

@jwt_required()
def delete_chat_message(notebook_id):
    try:
        data = request.get_json()
        message_id = data.get("message_id")
        
        if not message_id:
            return jsonify(error="Message ID is required"), 400
            
        # Verify notebook exists and belongs to user
        notebook = Notebook.query.get_or_404(notebook_id)
        current_user_id = get_jwt_identity()
        
        if notebook.user_id != current_user_id:
            return jsonify(error="Unauthorized access to notebook"), 403
            
        # Get and verify chat message exists and belongs to notebook
        chat_message = Chat.query.filter_by(id=message_id, notebook_id=notebook_id).first_or_404()
        
        # Delete the message
        db.session.delete(chat_message)
        db.session.commit()
        
        return jsonify(message="Chat message deleted successfully"), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify(error=str(e)), 500
    
    