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
        
        # Get podcast configuration
        podcast_mode = data.get('podcastMode', 'normal')
        person_count = data.get('personCount', 2)
        has_host = data.get('hasHost', False)
        
        if not sources:
            logger.error("No sources provided in request")
            return jsonify({"error": "No sources provided"}), 400
        
        logger.info(f"Generating podcast with {len(sources)} sources")
        logger.info(f"Title: {title}")
        logger.info(f"Description: {description}")
        logger.info(f"Mode: {podcast_mode}, Person Count: {person_count}, Has Host: {has_host}")
        
        # Generate podcast script using OpenAI
        try:
            script = generate_script(title, description, sources, podcast_mode, person_count, has_host)
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

def generate_script(title, description, sources, podcast_mode='normal', person_count=2, has_host=False):
    """Generate a podcast script using OpenAI."""
    try:
        # Prepare the prompt
        sources_text = "\n".join([
            f"Source {i+1}: {source.get('content', source.content if hasattr(source, 'content') else str(source))}" 
            for i, source in enumerate(sources)
        ])
        
        # Create natural names for speakers
        natural_names = {
            1: ["Alex"],
            2: ["Alex", "Sam"],
            3: ["Alex", "Sam", "Jordan"],
            4: ["Alex", "Sam", "Jordan", "Taylor"],
            5: ["Alex", "Sam", "Jordan", "Taylor", "Casey"]
        }
        
        # Get names based on person count
        names = natural_names.get(person_count, ["Alex", "Sam", "Jordan", "Taylor", "Casey"][:person_count])
        
        # Add host if needed
        speakers = []
        if has_host:
            speakers.append("Host")
        
        # Add participants with natural names
        speakers.extend(names)
        
        speakers_text = ", ".join(speakers)
        
        # Create mode-specific instructions
        mode_instructions = ""
        if podcast_mode == "debate":
            mode_instructions = """
The podcast should be structured as a debate with:
1. Each speaker taking opposing or different viewpoints on the topics
2. Speakers respectfully challenging each other's perspectives
3. A balanced discussion with each speaker getting equal time
4. Clear arguments supported by the source material
5. A conclusion that summarizes the different viewpoints
"""
        else:
            mode_instructions = """
The podcast should be structured as a normal discussion with:
1. Each speaker contributing their unique perspective
2. Natural flow between topics
3. Speakers building on each other's points
4. A collaborative exploration of the source material
5. A conclusion that ties together the main points
"""
        
        # Create host-specific instructions
        host_instructions = ""
        if has_host:
            host_instructions = """
The Host should:
1. Introduce the topic and speakers
2. Guide the conversation with engaging questions
3. Summarize key points between speakers
4. Ensure all speakers get a chance to contribute
5. Provide transitions between topics
6. Conclude the podcast with a summary
7. Use phrases like "That's an interesting point, [Speaker]. What do you think about that, [Other Speaker]?"
8. Keep the conversation flowing naturally
"""
        
        prompt = f"""Create a natural, conversational podcast script based on the following information:

Title: {title}
Description: {description}

Sources:
{sources_text}

Podcast Configuration:
- Mode: {podcast_mode}
- Number of Speakers: {person_count}
- Has Host: {has_host}
- Speakers: {speakers_text}

The script should:
1. Be a natural, flowing conversation between {person_count} speakers {f"and a host" if has_host else ""}
2. Each speaker should have a distinct personality and speaking style
3. Include natural pauses, filler words, and conversational elements
4. Avoid reading directly from the sources - paraphrase and discuss naturally
5. Include an introduction and conclusion
6. Flow smoothly between topics
7. Be engaging and informative
8. Sound like a real podcast conversation, not a script being read
9. Format as a back-and-forth conversation with each speaker speaking in complete paragraphs
10. Be at least 10 paragraphs long
11. Cover all the key points from the sources
{mode_instructions}
{host_instructions}

Format each paragraph with the speaker indicator followed by their dialogue. For example:

Host: Welcome to our podcast! Today we're talking about [topic]. I'm joined by {", ".join(names)}. Let's start with you, {names[0]}. What are your thoughts on this topic?

{names[0]}: Thanks for having me! I've been researching this topic and I think [opinion]. From what I understand, [explanation].

Host: That's an interesting perspective. {names[1]}, what do you think about that?

{names[1]}: I see {names[0]}'s point, but I think there's another angle to consider. [different perspective].

Please create a natural conversation that covers all the key points from the sources, but in a conversational way. Make sure to include at least 10 paragraphs."""

        # Call OpenAI API
        client = openai.OpenAI(api_key=Config.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional podcast script writer specializing in natural, conversational dialogue between multiple speakers. Each speaker speaks in complete paragraphs, and the conversation flows naturally back and forth. Create scripts that are at least 10 paragraphs long."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=2000
        )
        
        script = response.choices[0].message.content
        
        # Log the script for debugging
        logger.info(f"Generated script with natural names")
        
        return script
        
    except Exception as e:
        raise Exception(f"Failed to generate script: {str(e)}")

def generate_audio_from_script(script):
    """Convert the script to audio using TTS with different voices for each speaker."""
    tts_provider = get_tts_provider()
    
    # Split the script into paragraphs by speaker
    paragraphs = []
    current_speaker = None
    current_paragraph = []
    
    # Define natural names and their corresponding voices
    name_to_voice = {
        'Host': 'nova',  # Professional, clear voice for host
        'Alex': 'echo',  # Distinct voice for each speaker
        'Sam': 'shimmer',
        'Jordan': 'onyx',
        'Taylor': 'alloy',
        'Casey': 'fable'
    }
    
    for line in script.split('\n'):
        line = line.strip()
        if not line:
            # Empty line marks the end of a paragraph
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            continue
            
        # Check for different speaker patterns
        if line.startswith('Host:'):
            # If we were already building a paragraph, save it
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            current_speaker = 'Host'
            current_paragraph.append(line[5:].strip())
        elif line.startswith('Alex:'):
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            current_speaker = 'Alex'
            current_paragraph.append(line[5:].strip())
        elif line.startswith('Sam:'):
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            current_speaker = 'Sam'
            current_paragraph.append(line[4:].strip())
        elif line.startswith('Jordan:'):
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            current_speaker = 'Jordan'
            current_paragraph.append(line[7:].strip())
        elif line.startswith('Taylor:'):
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            current_speaker = 'Taylor'
            current_paragraph.append(line[7:].strip())
        elif line.startswith('Casey:'):
            if current_paragraph:
                paragraphs.append((current_speaker, ' '.join(current_paragraph)))
                current_paragraph = []
            current_speaker = 'Casey'
            current_paragraph.append(line[6:].strip())
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
        voice_id = name_to_voice.get(speaker, 'nova')  # Default to nova if speaker not found
        
        # Log for debugging
        logger.info(f"Generating audio for paragraph {i+1}/{len(paragraphs)} with voice {voice_id} for {speaker}")
        
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