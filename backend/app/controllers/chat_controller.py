from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import app
from openai import OpenAI

client = OpenAI(api_key=app.config["OPENAI_API_KEY"])

@jwt_required()
def send_chat_message():
    data = request.get_json()
    query = data.get("query")
    context = data.get("context", "")
    
    if not query:
        return jsonify(error="Query is required"), 400
        
    try:
        # Prepare the messages for OpenAI
        messages = [
            {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context."},
            {"role": "user", "content": f"Context: {context}\n\nQuestion: {query}"}
        ]
        
        # Get response from OpenAI
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        # Extract the assistant's response
        reply = response.choices[0].message.content
        
        return jsonify(reply=reply), 200
        
    except Exception as e:
        return jsonify(error=str(e)), 500 