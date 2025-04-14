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
from pydub import AudioSegment


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
            logger.error("No data provided in request")
            return jsonify({"error": "No data provided"}), 400
        
        # Get sources directly from the request
        sources = data.get('sources', [])
        title = data.get('title', 'Untitled Podcast')
        description = data.get('description', '')
        
        if not sources:
            logger.error("No sources provided in request")
            return jsonify({"error": "No sources provided"}), 400
        
        logger.info(f"Generating podcast with {len(sources)} sources")
        logger.info(f"Title: {title}")
        logger.info(f"Description: {description}")
        
        # Generate podcast script using OpenAI
        try:
            script = generate_script(title, description, sources)
            logger.info("Successfully generated script")
        except Exception as e:
            logger.error(f"Error generating script: {str(e)}")
            return jsonify({"error": f"Failed to generate script: {str(e)}"}), 500
        
        # Convert script to speech
        try:
            audio_segments = generate_audio_from_script(script)
            if not audio_segments:
                logger.error("Failed to generate audio - no segments returned")
                return jsonify({"error": "Failed to generate audio"}), 500
            logger.info(f"Successfully generated {len(audio_segments)} audio segments")
        except Exception as e:
            logger.error(f"Error generating audio: {str(e)}")
            return jsonify({"error": f"Failed to generate audio: {str(e)}"}), 500
        
        # Return the audio segments and metadata
        try:
            # Generate a unique session ID for this request
            session_id = str(uuid.uuid4())
            
            # Create a zip file containing all audio segments
            import zipfile
            import io
            
            memory_file = io.BytesIO()
            with zipfile.ZipFile(memory_file, 'w') as zf:
                for i, segment_path in enumerate(audio_segments):
                    # Add each audio segment to the zip file
                    zf.write(segment_path, f'segment_{i}.mp3')
                    # Clean up the segment file
                    try:
                        os.remove(segment_path)
                    except Exception as e:
                        logger.error(f"Error removing segment {segment_path}: {str(e)}")
            
            memory_file.seek(0)
            
            response = send_file(
                memory_file,
                mimetype='application/zip',
                as_attachment=True,
                download_name=f'podcast_segments_{session_id}.zip'
            )
            
            # Add metadata to the response headers
            response.headers['X-Podcast-Title'] = title
            response.headers['X-Podcast-Description'] = description
            response.headers['X-Segment-Count'] = str(len(audio_segments))
            
            return response
            
        except Exception as e:
            logger.error(f"Error sending file: {str(e)}")
            # Try to clean up the files if sending failed
            for segment_path in audio_segments:
                try:
                    if os.path.exists(segment_path):
                        os.remove(segment_path)
                except:
                    pass
            return jsonify({"error": f"Failed to send audio file: {str(e)}"}), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in generate_podcast: {str(e)}")
        return jsonify({"error": str(e)}), 500

def generate_script(title, description, sources):
    """Generate a podcast script using OpenAI."""
    try:
        # Prepare the prompt
        sources_text = "\n".join([
            f"Source {i+1}: {source.get('content', source.content if hasattr(source, 'content') else str(source))}" 
            for i, source in enumerate(sources)
        ])
        
        prompt = f"""Create a natural, conversational podcast script for a two-person discussion based on the following information:

Title: {title}
Description: {description}

Sources:
{sources_text}

The script should:
1. Be a natural, flowing conversation between two hosts (Alex and Sam)
2. Alex should have a more formal, professional tone
3. Sam should have a more casual, friendly tone
4. Include natural pauses, filler words, and conversational elements
5. Avoid reading directly from the sources - paraphrase and discuss naturally
6. Include an introduction and conclusion
7. Flow smoothly between topics
8. Be engaging and informative
9. Sound like a real podcast conversation, not a script being read
10. Format as a back-and-forth conversation with each host speaking in complete paragraphs
11. Be at least 10 paragraphs long (5 exchanges between the hosts)
12. Cover all the key points from the sources

Format each paragraph with the speaker indicator followed by their dialogue. For example:

Alex: Hey everyone, welcome to our podcast! Today we're talking about [topic]. I'm really excited to dive into this with you, Sam.

Sam: Thanks for having me, Alex! I've been reading up on this topic and there's so much interesting stuff to discuss. I think our listeners are going to really enjoy this episode.

Alex: Absolutely! Let's start by giving our listeners a quick overview of what we'll be covering today. From what I understand, [brief summary].

Please create a natural conversation that covers all the key points from the sources, but in a conversational way. Make sure to include at least 10 paragraphs (5 exchanges between the hosts)."""

        # Call OpenAI API
        client = openai.OpenAI(api_key=Config.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional podcast script writer specializing in natural, conversational dialogue between two hosts. Each host speaks in complete paragraphs, and the conversation flows naturally back and forth. Create scripts that are at least 10 paragraphs long."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=2000
        )
        
        script = response.choices[0].message.content
        
        # Log the script for debugging
        logger.info(f"Generated script with {script.count('Alex:') + script.count('Sam:')} paragraphs")
        
        return script
        
    except Exception as e:
        raise Exception(f"Failed to generate script: {str(e)}")

def generate_audio_from_script(script):
    """Convert the script to audio using TTS with two different voices."""
    tts_provider = get_tts_provider()
    
    # Split the script into paragraphs by speaker
    paragraphs = []
    current_speaker = None
    current_paragraph = []
    
    for line in script.split('\n'):
        line = line.strip()
        if not line:
            # Empty line marks the end of a paragraph
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            continue
            
        if line.startswith('Alex:'):
            # If we were already building a paragraph, save it
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            current_speaker = 'Alex'
            current_paragraph.append(line[5:].strip())
        elif line.startswith('Sam:'):
            # If we were already building a paragraph, save it
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            current_speaker = 'Sam'
            current_paragraph.append(line[4:].strip())
        else:
            # Continue the current paragraph
            current_paragraph.append(line)
    
    # Add the last paragraph if there is one
    if current_paragraph:
        paragraphs.append((current_speaker, ' '.join(current_paragraph)))
    
    # Log the number of paragraphs for debugging
    logger.info(f"Generated {len(paragraphs)} paragraphs")
    
    # Generate audio for each paragraph with the appropriate voice
    audio_segments = []
    
    for i, (speaker, text) in enumerate(paragraphs):
        if not text.strip():
            continue
            
        # Choose voice based on speaker
        voice_id = "nova" if speaker == "Alex" else "echo"  # Use different voices for each speaker
        
        # Log for debugging
        logger.info(f"Generating audio for paragraph {i+1}/{len(paragraphs)} with voice {voice_id}")
        
        # Generate audio for this paragraph
        audio_path = tts_provider.text_to_speech(text, voice_id=voice_id)
        if audio_path and os.path.exists(audio_path):
            audio_segments.append(audio_path)
            logger.info(f"Successfully generated audio for paragraph {i+1} at {audio_path}")
        else:
            logger.error(f"Failed to generate audio for paragraph {i+1}")
    
    if not audio_segments:
        raise Exception("Failed to generate any audio segments")
    
    # Log the number of audio segments for debugging
    logger.info(f"Generated {len(audio_segments)} audio segments")
    
    return audio_segments