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
    extract_text_from_webpage,
    extract_text_from_youtube,
)
from app.utils.embed_and_search import generate_and_store_embeddings, EMBEDDINGS_FOLDER
from app.helper.ai_generate import openai_generate
import traceback
import tempfile
import os
import pathlib

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
        if request.files:
            data['file'] = request.files.get('file')

    try:
        # Check for duplicate title at the beginning
        title = None
        if data.get('file'):
            title = data['file'].filename
        elif data.get('text'):
            # For notes, generate title first
            if str(data.get("is_note", "0")).lower() in ("true", "1", "yes"):
                title = generate_unique_note_title(data.get("notebook_id"))
            else:
                title = generate_unique_text_title(data.get("notebook_id"))
        elif data.get('link'):
            title = data.get('link')

        if title:
            existing_source = Source.query.filter_by(
                notebook_id=data.get("notebook_id"),
                title=title
            ).first()
            if existing_source:
                return jsonify(error="A source with this title already exists"), 400

        file = data.get('file')
        processed_data = {}

        if file:
            if not allowed_file(file.filename):
                return jsonify(error="Invalid file type"), 400

            # Process file directly without saving
            file_extension = file.filename.rsplit(".", 1)[1].lower()
            try:
                # Create a temporary file to process
                with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file:
                    file.save(temp_file.name)
                    temp_path = temp_file.name

                try:
                    if file_extension == "pdf":
                        text = extract_text_from_pdf(temp_path)
                    elif file_extension == "txt":
                        text = extract_text_from_txt(temp_path)
                    elif file_extension == "docx":
                        text = extract_text_from_docx(temp_path)
                    elif file_extension in ["jpg", "jpeg", "png"]:
                        text = extract_text_from_image(temp_path)
                    else:
                        return jsonify(error="Unsupported file format"), 400

                    if not text or text.strip() == "":
                        return jsonify(error="No text content could be extracted from the file"), 400

                    # Generate embeddings and get file_id
                    file_id = generate_and_store_embeddings(text)
                    print(f"File ID: {file_id}")
                    if not file_id:
                        return jsonify(error="Failed to generate embeddings"), 500

                    # Generate summary
                    summary = generate_summary(text)

                    processed_data = {
                        "text": text,  # Keep full text for embedding
                        "summary": summary,  # Store summary in description
                        "file_extension": file_extension,
                        "title": file.filename,
                        "file_id": file_id
                    }
                finally:
                    # Clean up the temporary file
                    os.unlink(temp_path)

            except Exception as e:
                print(f"Error processing file: {str(e)}")
                print(traceback.format_exc())
                return jsonify(error=f"Error processing file: {str(e)}"), 400

        elif data.get("text"):
            try:
                # Check if this is a note
                is_note = str(data.get("is_note", "0")).lower() in ("true", "1", "yes")
                if is_note:
                    # For notes, use the text directly without processing
                    file_id = generate_and_store_embeddings(data.get("text"))
                    if not file_id:
                        return jsonify(error="Failed to generate embeddings"), 500

                    # Generate summary
                    summary = generate_summary(data.get("text"))

                    processed_data = {
                        "text": data.get("text"),  # Keep full text for embedding
                        "summary": summary,  # Store summary in description
                        "file_extension": "txt",
                        "title": title,  # Use the title we generated earlier
                        "file_id": file_id
                    }
                else:
                    # For regular text sources, process the text
                    file_id = generate_and_store_embeddings(data.get("text"))
                    if not file_id:
                        return jsonify(error="Failed to generate embeddings"), 500

                    # Generate summary
                    summary = generate_summary(data.get("text"))

                    processed_data = {
                        "text": data.get("text"),  # Keep full text for embedding
                        "summary": summary,  # Store summary in description
                        "file_extension": "txt",
                        "title": title,  # Use the title we generated earlier
                        "file_id": file_id
                    }
            except Exception as e:
                print(f"Error processing text: {str(e)}")
                print(traceback.format_exc())
                return jsonify(error=f"Error processing text: {str(e)}"), 400

        elif data.get("link"):
            try:
                link = data.get("link")
                if is_youtube_link(link):
                    text = extract_text_from_youtube(link)
                    file_id = generate_and_store_embeddings(text)
                    if not file_id:
                        return jsonify(error="Failed to generate embeddings"), 500

                    # Generate summary
                    summary = generate_summary(text)

                    processed_data = {
                        "text": text,  # Keep full text for embedding
                        "summary": summary,  # Store summary in description
                        "file_extension": "youtube",
                        "title": title,  # Use the title we generated earlier
                        "file_id": file_id
                    }
                else:
                    text = extract_text_from_webpage(link)
                    file_id = generate_and_store_embeddings(text)
                    if not file_id:
                        return jsonify(error="Failed to generate embeddings"), 500

                    # Generate summary
                    summary = generate_summary(text)

                    processed_data = {
                        "text": text,  # Keep full text for embedding
                        "summary": summary,  # Store summary in description
                        "file_extension": "url",
                        "title": title,  # Use the title we generated earlier
                        "file_id": file_id
                    }
            except Exception as e:
                print(f"Error processing link: {str(e)}")
                print(traceback.format_exc())
                return jsonify(error=f"Error processing link: {str(e)}"), 400
        else:
            return jsonify(error="No valid input provided"), 400

        if not processed_data.get("text"):
            return jsonify(error="No text content could be extracted"), 400

        try:
            source = Source(
                notebook_id=data.get("notebook_id"),
                file_type=processed_data["file_extension"],
                title=processed_data["title"],
                description=processed_data["summary"],  # Store summary instead of full text
                is_note=str(data.get("is_note", "0")).lower() in ("true", "1", "yes"),
                file_id=processed_data["file_id"]  or None,
            )
            db.session.add(source)
            db.session.commit()
            return jsonify(source.to_dict()), 201
        except Exception as e:
            print(f"Error saving to database: {str(e)}")
            print(traceback.format_exc())
            db.session.rollback()
            return jsonify(error=f"Error saving to database: {str(e)}"), 500

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        print(traceback.format_exc())
        return jsonify(error=f"Unexpected error: {str(e)}"), 500


@jwt_required()
def get_sources(notebook_id):
    try:
        sources = Source.query.filter_by(notebook_id=notebook_id).all()
        return jsonify([source.to_dict() for source in sources]), 200
    except Exception as e:
        print(f"Error fetching sources: {str(e)}")
        print(traceback.format_exc())
        return jsonify(error=f"Error fetching sources: {str(e)}"), 500


@jwt_required()
def update_source(source_id):
    try:
        data = request.get_json()
        source = Source.query.filter_by(id=source_id).first()
        if source:
            # Check if new title already exists in the notebook
            if data.get("title") and data.get("title") != source.title:
                existing_source = Source.query.filter_by(
                    notebook_id=source.notebook_id,
                    title=data.get("title")
                ).first()
                if existing_source:
                    return jsonify(error="A source with this title already exists"), 400

            source.title = data.get("title", source.title)
            source.description = data.get("description", source.description)
            source.is_note = data.get("is_note", source.is_note)
            db.session.commit()
            return jsonify(source.to_dict()), 200
        return jsonify(error="Source not found"), 404
    except Exception as e:
        print(f"Error updating source: {str(e)}")
        print(traceback.format_exc())
        db.session.rollback()
        return jsonify(error=f"Error updating source: {str(e)}"), 500


@jwt_required()
def get_source(source_id):
    try:
        source = Source.query.filter_by(id=source_id).first()
        if source:
            user_id = int(get_jwt_identity())
            if source.notebook.user_id == user_id:
                return jsonify(source.to_dict()), 200
        return jsonify(error="Source not found"), 404
    except Exception as e:
        print(f"Error fetching source: {str(e)}")
        print(traceback.format_exc())
        return jsonify(error=f"Error fetching source: {str(e)}"), 500


@jwt_required()
def delete_source(source_id):
    try:
        source = Source.query.filter_by(id=source_id).first()
        if source:
            # Delete FAISS files if they exist
            if source.file_id:
                try:
                    # Delete chunks file
                    chunks_file = EMBEDDINGS_FOLDER / f"{source.file_id}_chunks.npy"
                    if chunks_file.exists():
                        chunks_file.unlink()
                    
                    # Delete embeddings file
                    embeddings_file = EMBEDDINGS_FOLDER / f"{source.file_id}_embeddings.npy"
                    if embeddings_file.exists():
                        embeddings_file.unlink()
                    
                    # Delete FAISS index file
                    index_file = EMBEDDINGS_FOLDER / f"{source.file_id}_index.faiss"
                    if index_file.exists():
                        index_file.unlink()
                except Exception as e:
                    print(f"Error deleting FAISS files: {str(e)}")
                    print(traceback.format_exc())
                    # Continue with source deletion even if FAISS files deletion fails
            
            # Delete the source from database
            db.session.delete(source)
            db.session.commit()
            return jsonify(message="Source deleted"), 200
        return jsonify(error="Source not found"), 404
    except Exception as e:
        print(f"Error deleting source: {str(e)}")
        print(traceback.format_exc())
        db.session.rollback()
        return jsonify(error=f"Error deleting source: {str(e)}"), 500
