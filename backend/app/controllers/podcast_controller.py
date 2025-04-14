import os
import tempfile
import uuid
from flask import jsonify, request, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.user import User
from app import db
import openai
from app.utils.tts_provider import get_tts_provider
from config import Config
import logging

logger = logging.getLogger(__name__)

@jwt_required()
def generate_podcast(notebook_id):
    # Handle OPTIONS request separately (preflight)
    if request.method == 'OPTIONS':
        return '', 200
        
    # For actual POST request, verify JWT
    try:
        # Verify JWT token
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get sources directly from the request
        sources = data.get('sources', [])
        title = data.get('title', 'Untitled Podcast')
        description = data.get('description', '')
        
        if not sources:
            return jsonify({"error": "No sources provided"}), 400
        
        # Generate podcast script using OpenAI
        script = generate_script(title, description, sources)
        
        # Convert script to speech
        audio_path = generate_audio_from_script(script)
        
        if not audio_path:
            return jsonify({"error": "Failed to generate audio"}), 500
        
        # Return the audio file and metadata
        response = send_file(
            audio_path,
            mimetype='audio/mpeg',
            as_attachment=True,
            download_name=os.path.basename(audio_path)
        )
        
        # Add metadata to the response headers
        response.headers['X-Podcast-Title'] = title
        response.headers['X-Podcast-Description'] = description
        response.headers['X-Podcast-Source-Count'] = str(len(sources))
        
        return response, 200
        
    except Exception as e:
        logger.error(f"Error generating podcast: {str(e)}")
        return jsonify({"error": str(e)}), 500

def generate_script(title, description, sources):
    """Generate a podcast script using OpenAI."""
    try:
        # Prepare the prompt
        sources_text = "\n".join([
            f"Source {i+1}: {source.get('content', source.content if hasattr(source, 'content') else str(source))}" 
            for i, source in enumerate(sources)
        ])
        
        prompt = f"""Create a natural-sounding podcast script based on the following information:

Title: {title}
Description: {description}

Sources:
{sources_text}

The script should:
1. Have a natural conversational tone
2. Include an introduction and conclusion
3. Flow smoothly between topics
4. Be engaging and informative
5. Be suitable for text-to-speech conversion

Please format the script with clear speaker indicators and natural pauses."""

        # Call OpenAI API
        client = openai.OpenAI(api_key=Config.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional podcast script writer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        raise Exception(f"Failed to generate script: {str(e)}")

def generate_audio_from_script(script):
    """Convert the script to audio using TTS."""
    tts_provider = get_tts_provider()
    
    # Generate a unique filename for the audio
    session_id = str(uuid.uuid4())
    temp_filename = f"podcast_{session_id}.mp3"
    
    # Create a temporary file for the audio
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, temp_filename)
    
    # Generate audio for the entire script
    audio_path = tts_provider.text_to_speech(script)
    
    if not audio_path:
        raise Exception("Failed to generate audio")
    
    # Copy the file to the final location instead of renaming
    import shutil
    shutil.copy2(audio_path, temp_path)
    
    # Clean up the original temporary file
    try:
        os.remove(audio_path)
    except:
        pass
    
    return temp_path 