from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import re
from app.models.source import Source
from app.utils.file_utils import process_input
from app import db
from app.utils.file_utils import (
    extract_text_from_pdf,
    extract_text_from_txt,
    extract_text_from_docx,
    extract_text_from_image,
)
from app.utils.youtube import extract_youtube_transcript, is_youtube_link, get_video_title
from app.utils.web import extract_web_content, is_valid_url, get_page_title
from app.utils.rag_utils import generate_and_store_embeddings, delete_embeddings
from app.helper.ai_generate import openai_generate
import traceback
import tempfile
import os
import pathlib
from app.services.source_service import (
    process_file_upload,
    process_text_input,
    process_link_input,
    create_source,
    get_sources_by_notebook,
    get_source_by_id,
    update_source,
    delete_source
)
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "jpg", "jpeg", "png"}


def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def is_youtube_link(link):
    """Check if the link is a valid YouTube link."""
    youtube_regex = (
        r"(https?://)?(www\.)?"
        "(youtube\.com|youtu\.be)/"
        "(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})"
    )
    return bool(re.match(youtube_regex, link))


def generate_unique_note_title(notebook_id):
    """Generate a unique title for a new note."""
    base_title = "New Note"
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


def generate_unique_text_title(notebook_id):
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


def generate_summary(text):
    """Generate a summary of the text using OpenAI."""
    prompt = f"Please provide a concise summary of the following text:\n\n{text}"
    try:
        summary = openai_generate(prompt, False, summary=True)
        return summary
    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return text[:500] + "..."  # Fallback to first 500 characters if summary fails


@jwt_required()
def add_source():
    # Handle both form data and JSON data
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form.to_dict()

    try:
        user_id = get_jwt_identity()
        notebook_id = data.get("notebook_id")
        title = data.get("title", "")
        is_note = data.get("is_note", "0") == "1"

        if not notebook_id:
            return jsonify(error="Notebook ID is required"), 400

        processed_data = None

        if "file" in request.files:
            try:
                logger.debug(f"Processing file upload: {request.files['file'].filename}")
                processed_data = process_file_upload(request.files["file"], notebook_id)
                logger.debug("File processed successfully")
            except ValueError as e:
                logger.error(f"File processing error: {str(e)}")
                return jsonify(error=str(e)), 400
            except Exception as e:
                logger.error(f"Unexpected error processing file: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify(error=f"Error processing file: {str(e)}"), 500

        elif data.get("text"):
            try:
                logger.debug("Processing text input")
                processed_data = process_text_input(data.get("text"), title, notebook_id)
                logger.debug("Text processed successfully")
            except ValueError as e:
                logger.error(f"Text processing error: {str(e)}")
                return jsonify(error=str(e)), 500
            except Exception as e:
                logger.error(f"Unexpected error processing text: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify(error=f"Error processing text: {str(e)}"), 500

        elif data.get("link"):
            try:
                logger.debug(f"Processing link input: {data.get('link')}")
                processed_data = process_link_input(data.get("link"), title)
                logger.debug("Link processed successfully")
            except ValueError as e:
                logger.error(f"Link processing error: {str(e)}")
                return jsonify(error=str(e)), 400
            except Exception as e:
                logger.error(f"Unexpected error processing link: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify(error=f"Error processing link: {str(e)}"), 500
        else:
            return jsonify(error="No valid input provided"), 400

        if not processed_data.get("text"):
            logger.error("No text content could be extracted")
            return jsonify(error="No text content could be extracted"), 400

        # Create new source
        try:
            logger.debug("Creating new source")
            new_source = create_source(notebook_id, processed_data, is_note)
            logger.debug("Source created successfully")
            
            # Check if we have a pending embedding
            if processed_data.get("file_id", "").startswith("pending_"):
                # Return a response indicating the source was created but embeddings are being generated
                return jsonify({
                    "message": "Source added successfully. Embeddings are being generated in the background.",
                    "source": new_source.to_dict(),
                    "embedding_status": "pending"
                }), 201
            else:
                return jsonify({
                    "message": "Source added successfully",
                    "source": new_source.to_dict()
                }), 201
                
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating source: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify(error=f"Error creating source: {str(e)}"), 500

    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error in add_source: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify(error=f"Error adding source: {str(e)}"), 500


@jwt_required()
def get_sources(notebook_id):
    try:
        sources = get_sources_by_notebook(notebook_id)
        return jsonify([source.to_dict() for source in sources]), 200
    except Exception as e:
        logger.error(f"Error fetching sources: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify(error=f"Error fetching sources: {str(e)}"), 500


@jwt_required()
def get_source(source_id):
    try:
        source = get_source_by_id(source_id)
        if source:
            return jsonify(source.to_dict()), 200
        return jsonify(error="Source not found"), 404
    except Exception as e:
        logger.error(f"Error fetching source: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify(error=f"Error fetching source: {str(e)}"), 500


@jwt_required()
def update_source(source_id):
    try:
        data = request.get_json()
        source = get_source_by_id(source_id)
        if source:
            try:
                updated_source = update_source(source, data)
                return jsonify(updated_source.to_dict()), 200
            except ValueError as e:
                return jsonify(error=str(e)), 400
        return jsonify(error="Source not found"), 404
    except Exception as e:
        logger.error(f"Error updating source: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify(error=f"Error updating source: {str(e)}"), 500


@jwt_required()
def delete_source_endpoint(source_id):
    try:
        source = get_source_by_id(source_id)
        if not source:
            logger.error(f"Source not found with ID: {source_id}")
            return jsonify(error="Source not found"), 404
            
        logger.debug(f"Attempting to delete source {source_id}")
        if delete_source(source):
            logger.debug(f"Source {source_id} deleted successfully")
            return jsonify(message="Source deleted successfully"), 200
        else:
            logger.error(f"Failed to delete source {source_id}")
            return jsonify(error="Failed to delete source"), 500
    except Exception as e:
        logger.error(f"Error deleting source: {str(e)}")
        logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify(error=f"Error deleting source: {str(e)}"), 500
