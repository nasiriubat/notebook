from app.models.source import Source
from app.utils.file_utils import process_input
from app.utils.youtube import extract_youtube_transcript, is_youtube_link, get_video_title
from app.utils.web import extract_web_content, is_valid_url, get_page_title
from app.utils.rag_utils import generate_and_store_embeddings, delete_embeddings
from app.helper.ai_generate import openai_generate
from app import db
import re
import tempfile
import os
import traceback
import logging
import uuid

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "jpg", "jpeg", "png"}

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_title(notebook_id: int, base_title: str) -> str:
    """Generate a unique title for a new source."""
    counter = 1
    title = base_title
    
    while True:
        existing = Source.query.filter_by(
            notebook_id=notebook_id,
            title=title
        ).first()
        
        if not existing:
            return title
            
        title = f"{base_title} {counter}"
        counter += 1

def generate_unique_text_title(notebook_id: int) -> str:
    """Generate a unique title for a new text input."""
    base_title = "Text Note"
    counter = 1
    title = base_title
    
    while True:
        existing = Source.query.filter_by(
            notebook_id=notebook_id,
            title=title
        ).first()
        
        if not existing:
            return title
            
        title = f"{base_title} {counter}"
        counter += 1

def generate_summary(text: str) -> str:
    """Generate a summary of the text using OpenAI."""
    prompt = f"Please provide a concise summary of the following text:\n\n{text}"
    try:
        logger.debug("Generating summary using OpenAI")
        summary = openai_generate(prompt, False, summary=True)
        logger.debug("Summary generated successfully")
        return summary
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        logger.error(traceback.format_exc())
        return text[:500] + "..."  # Fallback to first 500 characters if summary fails

def process_file_upload(file, notebook_id: int) -> dict:
    """Process a file upload and return the extracted data."""
    temp_file = None
    try:
        if not file or not file.filename:
            logger.error("No file provided")
            raise ValueError("No file provided")
            
        # Get file extension and check if it's allowed
        file_extension = os.path.splitext(file.filename)[1].lower()[1:]  # Remove the dot
        if not file_extension:
            logger.error("File has no extension")
            raise ValueError("File has no extension")
            
        if file_extension not in ALLOWED_EXTENSIONS:
            logger.error(f"Invalid file type: {file_extension}")
            raise ValueError(
                f"File type '{file_extension}' is not supported. "
                f"Supported types are: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )
            
        # Check for duplicate file (checking both title and file_type)
        base_title = os.path.splitext(file.filename)[0]
        existing_source = Source.query.filter_by(
            notebook_id=notebook_id,
            title=base_title,
            file_type=file_extension
        ).first()
        
        if existing_source:
            logger.error(f"File already exists: {file.filename}")
            raise ValueError(f"File '{file.filename}' already exists in this notebook")
            
        # Generate unique title from filename
        title = generate_unique_title(notebook_id, base_title)
            
        logger.debug(f"Processing file: {file.filename} (type: {file_extension})")
        
        # Create a temporary file with the correct extension
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}")
        file.save(temp_file.name)
        temp_file.close()  # Close the file before processing
        
        # Process the file
        processed_data = process_input(temp_file.name)
            
        if not isinstance(processed_data, dict):
            logger.error("Processed data is not a dictionary")
            raise ValueError("Failed to process file")
            
        if not processed_data.get("text"):
            logger.error("No text content could be extracted from file")
            raise ValueError("No text content could be extracted from file")
            
        # Set the title and file extension
        processed_data["title"] = title
        processed_data["file_extension"] = file_extension
            
        # Generate summary if not provided
        if not processed_data.get("summary"):
            processed_data["summary"] = generate_summary(processed_data["text"])
            
        # Generate embeddings if not provided
        if not processed_data.get("file_id"):
            # Start embedding generation in a separate thread to avoid blocking
            import threading
            embedding_thread = threading.Thread(
                target=lambda: processed_data.update({
                    "file_id": generate_and_store_embeddings(processed_data["text"])
                })
            )
            embedding_thread.start()
            
            # For immediate response, we'll return a placeholder file_id
            # The actual embedding will be generated in the background
            processed_data["file_id"] = f"pending_{uuid.uuid4()}"
            
        logger.debug("File processed successfully")
        return processed_data
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        logger.error(traceback.format_exc())
        raise
    finally:
        # Clean up the temporary file
        if temp_file and os.path.exists(temp_file.name):
            try:
                temp_file.close()  # Ensure file is closed
                os.unlink(temp_file.name)
                logger.debug("Temporary file cleaned up successfully")
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file: {str(e)}")

def process_text_input(text: str, title: str = "", notebook_id: int = None) -> dict:
    """Process text input and return the processed data."""
    try:
        logger.debug("Processing text input")
        file_id = generate_and_store_embeddings(text)
        if not file_id:
            logger.error("Failed to generate embeddings for text")
            raise ValueError("Failed to generate embeddings")
            
        # Generate a unique title if none provided and notebook_id is available
        if not title and notebook_id:
            title = generate_unique_text_title(notebook_id)
        elif not title:
            title = "Text Note"  # Fallback title if no notebook_id available
            
        summary = generate_summary(text)
        logger.debug("Text processed successfully")
        return {
            "text": text,
            "summary": summary,
            "file_extension": "txt",
            "title": title,
            "file_id": file_id
        }
    except Exception as e:
        logger.error(f"Error processing text: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def process_link_input(link: str, title: str = "") -> dict:
    """Process a link input and return the processed data."""
    try:
        logger.debug(f"Processing link: {link}")
        if not is_valid_url(link):
            logger.error(f"Invalid URL provided: {link}")
            raise ValueError("Invalid URL provided")
            
        if is_youtube_link(link):
            logger.debug("Processing YouTube link")
            text = extract_youtube_transcript(link)
            file_id = generate_and_store_embeddings(text)
            if not file_id:
                logger.error("Failed to generate embeddings for YouTube content")
                raise ValueError("Failed to generate embeddings")
                
            summary = generate_summary(text)
            logger.debug("YouTube link processed successfully")
            return {
                "text": text,
                "summary": summary,
                "file_extension": "youtube",
                "title": get_video_title(link) if not title else title,
                "file_id": file_id
            }
        else:
            logger.debug("Processing web link")
            text = extract_web_content(link)
            file_id = generate_and_store_embeddings(text)
            if not file_id:
                logger.error("Failed to generate embeddings for web content")
                raise ValueError("Failed to generate embeddings")
                
            summary = generate_summary(text)
            logger.debug("Web link processed successfully")
            return {
                "text": text,
                "summary": summary,
                "file_extension": "url",
                "title": get_page_title(link) if not title else title,
                "file_id": file_id
            }
    except Exception as e:
        logger.error(f"Error processing link: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def create_source(notebook_id: int, processed_data: dict, is_note: bool = False) -> Source:
    """Create a new source with the processed data."""
    try:
        logger.debug(f"Creating new source for notebook {notebook_id}")
        new_source = Source(
            notebook_id=notebook_id,
            file_type=processed_data.get("file_extension", "text"),
            title=processed_data.get("title", ""),
            description=processed_data.get("summary", ""),
            file_id=processed_data.get("file_id", ""),
            is_note=is_note
        )
        
        db.session.add(new_source)
        db.session.commit()
        logger.debug("Source created successfully")
        return new_source
    except Exception as e:
        logger.error(f"Error creating source: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        raise

def get_sources_by_notebook(notebook_id: int) -> list[Source]:
    """Get all sources for a notebook."""
    try:
        logger.debug(f"Fetching sources for notebook {notebook_id}")
        sources = Source.query.filter_by(notebook_id=notebook_id).all()
        logger.debug(f"Found {len(sources)} sources")
        return sources
    except Exception as e:
        logger.error(f"Error fetching sources: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def get_source_by_id(source_id: int) -> Source:
    """Get a source by its ID."""
    try:
        logger.debug(f"Fetching source with ID {source_id}")
        source = Source.query.filter_by(id=source_id).first()
        if source:
            logger.debug("Source found")
        else:
            logger.debug("Source not found")
        return source
    except Exception as e:
        logger.error(f"Error fetching source: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def update_source(source: Source, data: dict) -> Source:
    """Update a source with new data."""
    try:
        logger.debug(f"Updating source {source.id}")
        if data.get("title") and data.get("title") != source.title:
            existing_source = Source.query.filter_by(
                notebook_id=source.notebook_id,
                title=data.get("title")
            ).first()
            if existing_source:
                logger.error(f"Title already exists: {data.get('title')}")
                raise ValueError("A source with this title already exists")
                
        source.title = data.get("title", source.title)
        source.description = data.get("description", source.description)
        source.is_note = data.get("is_note", source.is_note)
        db.session.commit()
        logger.debug("Source updated successfully")
        return source
    except Exception as e:
        logger.error(f"Error updating source: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        raise

def delete_source(source: Source) -> bool:
    """Delete a source and its associated embeddings."""
    try:
        logger.debug(f"Starting deletion of source {source.id}")
        
        # Delete embeddings first
        if source.file_id:
            logger.debug(f"Deleting embeddings for file_id {source.file_id}")
            try:
                delete_embeddings(source.file_id)
                logger.debug("Embeddings deleted successfully")
            except Exception as e:
                logger.error(f"Error deleting embeddings: {str(e)}")
                logger.error(traceback.format_exc())
                # Continue with source deletion even if embedding deletion fails
        
        # Delete the source from database
        try:
            db.session.delete(source)
            db.session.commit()
            logger.debug("Source deleted from database successfully")
            return True
        except Exception as e:
            logger.error(f"Error deleting source from database: {str(e)}")
            logger.error(traceback.format_exc())
            db.session.rollback()
            return False
            
    except Exception as e:
        logger.error(f"Unexpected error in delete_source: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        return False 