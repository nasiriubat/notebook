from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import re
from app.models.source import Source
from app.utils.file_utils import process_input
from app import db
from app.services.file_storage_service import FileStorageService
from app.utils.file_utils import (
    extract_text_from_pdf,
    extract_text_from_txt,
    extract_text_from_docx,
    extract_text_from_image,
    extract_text_from_webpage,
    extract_text_from_youtube,
)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "jpg", "jpeg", "png"}


def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def is_youtube_link(link):
    """Check if the link is a valid YouTube link."""
    youtube_regex = (
        r"(https?://)?(www\.)?"
        "(youtube|youtu|youtube-nocookie)\.(com|be)/"
        "(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})"
    )
    return re.match(youtube_regex, link) is not None


@jwt_required()
def add_source():
    data = request.form if request.files else request.get_json()
    file = request.files.get("file")
    file_path = ""
    processed_data = {}

    if file:
        if not allowed_file(file.filename):
            return jsonify(error="Invalid file type"), 400

        try:
            file_path = FileStorageService.save_file(file, file.filename)
            # use process_input function from file_utils.py which returns [text, embedding]
            processed_data = process_input(file_path)

        except Exception as e:
            return jsonify(error=str(e)), 400

    else:
        if not data.get("text"):
            return jsonify(error="Text is required"), 400

        processed_data = process_input(data.get("text"))
        #get first sentence of text as title
        
    print(processed_data)

    data["title"] = processed_data["text"].split(".")[0]
    data["text"] = processed_data["text"]
    data["embedding"] = processed_data["embedding"]
    data["file_extension"] = processed_data["file_extension"]

    source = Source(
        notebook_id=data.get("notebook_id"),
        file_type=data.get("file_extension"),
        title=data.get("title"),
        description=data.get("text"),
        file_path=file_path,
        faiss_file_name=data.get("faiss_file_name", ""),
    )
    db.session.add(source)
    db.session.commit()
    return jsonify(id=source.id), 201


@jwt_required()
def get_sources(notebook_id):
    sources = Source.query.filter_by(notebook_id=notebook_id).all()
    return (
        jsonify(
            [
                {"id": s.id, "title": s.title, "description": s.description}
                for s in sources
            ]
        ),
        200,
    )


@jwt_required()
def update_source(source_id):
    data = request.get_json()
    source = Source.query.filter_by(id=source_id).first()
    if source:
        source.title = data.get("title", source.title)
        source.description = data.get("description", source.description)
        db.session.commit()
        return jsonify(id=source.id, title=source.title), 200
    return jsonify(error="Source not found"), 404


@jwt_required()
def get_source(source_id):
    source = Source.query.filter_by(id=source_id).first()
    if source:
        # check if souce belong to logged in user
        user_id = int(get_jwt_identity())
        print(user_id)
        print(source.notebook.user_id)
        print(source.notebook.user_id == user_id)

        if source.notebook.user_id == user_id:
            return (
                jsonify(
                    {
                        "id": source.id,
                        "title": source.title,
                        "description": source.description,
                    }
                ),
                200,
            )

    return jsonify(error="Source not found"), 404


@jwt_required()
def delete_source(source_id):
    source = Source.query.filter_by(id=source_id).first()
    if source:
        db.session.delete(source)
        db.session.commit()
        return jsonify(message="Source deleted"), 200
    return jsonify(error="Source not found"), 404
