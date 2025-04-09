import re
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse

def is_youtube_link(link: str) -> bool:
    """Check if the link is a valid YouTube link."""
    youtube_regex = (
        r"(https?://)?(www\.)?"
        "(youtube\.com|youtu\.be)/"
        "(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})"
    )
    return bool(re.match(youtube_regex, link))

def extract_youtube_transcript(youtube_url: str) -> str:
    """Extract transcript from a YouTube video."""
    try:
        # Extract video ID from URL
        parsed_url = urlparse(youtube_url)
        if parsed_url.hostname == 'youtu.be':
            video_id = parsed_url.path[1:]
        else:
            video_id = parsed_url.query.split("v=")[-1]
        
        # Get transcript
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        
        # Combine transcript entries into a single text
        text = "\n".join([entry["text"] for entry in transcript])
        return text if text else "No subtitles available."
        
    except Exception as e:
        return f"Error extracting subtitles from YouTube: {str(e)}"

def get_video_title(youtube_url: str) -> str:
    """Extract video title from YouTube URL."""
    try:
        # Extract video ID from URL
        parsed_url = urlparse(youtube_url)
        if parsed_url.hostname == 'youtu.be':
            video_id = parsed_url.path[1:]
        else:
            video_id = parsed_url.query.split("v=")[-1]
        
        # Get video info
        video_info = YouTubeTranscriptApi.get_transcript(video_id)
        if video_info:
            return f"YouTube Video: {video_info[0].get('text', '')[:50]}..."
        return "YouTube Video"
        
    except Exception as e:
        return "YouTube Video" 