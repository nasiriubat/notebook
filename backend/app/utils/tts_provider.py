from abc import ABC, abstractmethod
import os
from google.cloud import texttospeech
from gtts import gTTS
import tempfile
import uuid
from config import Config
from openai import OpenAI
from pathlib import Path

class TTSProvider(ABC):
    @abstractmethod
    def get_voices(self):
        pass

    @abstractmethod
    def text_to_speech(self, text, voice_id=None):
        pass

class OpenAIProvider(TTSProvider):
    def __init__(self):
        self.client = OpenAI()
        self.available_voices = [
            "alloy", "echo", "fable", "onyx", "nova", "shimmer"
        ]
        
    def get_voices(self):
        return [{"voice_id": voice, "name": voice.capitalize()} for voice in self.available_voices]
            
    def text_to_speech(self, text, voice_id=None):
        try:
            # Set default voice if none provided
            if not voice_id or voice_id not in self.available_voices:
                voice_id = "nova"  # Default to nova voice which is more natural
            
            # Create a temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
            temp_path = temp_file.name
            temp_file.close()
            
            # Generate speech using OpenAI TTS
            response = self.client.audio.speech.create(
                model="tts-1",
                voice=voice_id,
                input=text
            )
            
            # Write the audio content to the file
            with open(temp_path, 'wb') as f:
                f.write(response.content)
                
            return temp_path
                
        except Exception as e:
            print(f"Error in OpenAI TTS: {str(e)}")
            # Fall back to GTTS if OpenAI fails
            return GTTSProvider().text_to_speech(text)

class GoogleProvider(TTSProvider):
    def __init__(self):
        self.client = texttospeech.TextToSpeechClient()
        
    def get_voices(self):
        try:
            voices = self.client.list_voices().voices
            return [{"voice_id": voice.name, "name": voice.name} for voice in voices]
        except Exception as e:
            print(f"Error fetching Google voices: {str(e)}")
            return []
            
    def text_to_speech(self, text, voice_id=None):
        try:
            # Set default voice if none provided
            if not voice_id:
                voice_id = "en-US-Standard-A"
            
            # Configure the synthesis input
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Build the voice request
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name=voice_id
            )
            
            # Select the audio file type
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3
            )
            
            # Perform the text-to-speech request
            response = self.client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
                temp_file.write(response.audio_content)
                return temp_file.name
                
        except Exception as e:
            print(f"Error in Google TTS: {str(e)}")
            raise

class GTTSProvider(TTSProvider):
    def get_voices(self):
        # gTTS doesn't provide voice selection, return a default voice
        return [{"voice_id": "default", "name": "Default Voice"}]

    def text_to_speech(self, text, voice_id=None):
        try:
            # Create a temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
            temp_path = temp_file.name
            temp_file.close()

            # Generate speech using gTTS
            tts = gTTS(text=text, lang='en')
            tts.save(temp_path)

            return temp_path
        except Exception as e:
            print(f"Error in gTTS: {str(e)}")
            return None

class MockProvider(TTSProvider):
    """Mock provider for testing"""
    def get_voices(self):
        return [{"voice_id": "mock-voice", "name": "Mock Voice"}]
        
    def text_to_speech(self, text, voice_id=None):
        # Create a silent audio file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            # Create a minimal valid MP3 file
            temp_file.write(b'\x00' * 1000)  # Just some silence
            return temp_file.name

def get_tts_provider():
    """Factory function to get the appropriate TTS provider"""
    try:
        # OpenAI is the first priority
        return OpenAIProvider()
    except Exception as e:
        print(f"Error initializing OpenAI TTS provider: {str(e)}")
        try:
            # Google Cloud TTS as second priority
            if os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
                return GoogleProvider()
            else:
                return GTTSProvider()  # Free fallback
        except Exception as e:
            print(f"Error initializing fallback TTS provider: {str(e)}")
            return MockProvider() 