from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import app, db
from openai import OpenAI
from app.models.chat import Chat
from app.models.notebook import Notebook
from app.models.source import Source
from app.helper.ai_generate import openai_generate,ollama32_generate
from app.utils.embed_and_search import search_across_indices


@jwt_required()
def send_chat_message():
    data = request.get_json()
    query = data.get("query")
    is_regenerate = data.get("regenerate", False)
    notebook_id = data.get("notebook_id")
    source_ids = data.get("source_ids", [])
    context = ""
    
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
        used_source_titles = []
        if source_ids:
            sources = Source.query.filter(
                Source.id.in_(source_ids),
                Source.notebook_id == notebook_id
            ).all()
            
            # If some sources were deleted, we'll still proceed with the available ones
            if sources:
                source_titles = [source.title for source in sources]
                # Get file_ids for searching
                file_ids = [source.file_id for source in sources if source.file_id]
                
                # Search across the selected sources
                if file_ids:
                    search_results = search_across_indices(query, file_ids, top_k=5)
                    
                    if search_results:
                        # Use the matched chunks as context
                        context = "\n\n".join([f"Relevant content from {source.title}:\n{result['chunk']}" 
                                             for result in search_results 
                                             for source in sources 
                                             if source.file_id == result['file_id']])
                        
                        # Track which sources were actually used in the search results
                        used_file_ids = set(result["file_id"] for result in search_results)
                        used_source_titles = [source.title for source in sources if source.file_id in used_file_ids]
                    else:
                        # If no matches found in FAISS, use summaries of all selected sources as context
                        context = "\n\n".join([f"Summary of {source.title}:\n{source.description}" for source in sources])
                        used_source_titles = source_titles  # Mark all sources as used
                else:
                    # If no file_ids available, use summaries of all selected sources
                    context = "\n\n".join([f"Summary of {source.title}:\n{source.description}" for source in sources])
                    used_source_titles = source_titles
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
        prompt = f"Context: {context}\n\nQuestion: {query}"
        print("--------------------------")
        print(f"Prompt: {prompt}")
        
        # Extract the assistant's response
        reply = openai_generate(prompt, is_regenerate)
        # reply = ollama32_generate(prompt,is_regenerate)
        
        # Save assistant message with used sources
        assistant_message = Chat(
            notebook_id=notebook_id,
            message=reply,
            role="assistant",
            sources=used_source_titles  # Store only the titles of sources that were actually used
        )
        db.session.add(assistant_message)
        db.session.commit()
        
        return jsonify({
            "reply": reply,
            "message_id": assistant_message.id,
            "sources": used_source_titles,  # Return only the titles of sources that were actually used
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
    
    