from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.notebook import Notebook
from app import db

@jwt_required()
def create_notebook():
    data = request.get_json()
    user_id = get_jwt_identity()
    notebook = Notebook(user_id=user_id, name=data.get('name'))
    db.session.add(notebook)
    db.session.commit()
    return jsonify(id=notebook.id, name=notebook.name), 201

@jwt_required()
def get_notebooks():
    user_id = get_jwt_identity()
    notebooks = Notebook.query.filter_by(user_id=user_id).all()
    return jsonify([{
        "id": nb.id, 
        "name": nb.name,
        "createdAt": nb.created_at.isoformat() if nb.created_at else None,
        "sourceCount": len(nb.sources)
    } for nb in notebooks]), 200

@jwt_required()
def update_notebook(notebook_id):
    data = request.get_json()
    notebook = Notebook.query.filter_by(id=notebook_id, user_id=get_jwt_identity()).first()
    if notebook:
        notebook.name = data.get('name', notebook.name)
        db.session.commit()
        return jsonify(id=notebook.id, name=notebook.name), 200
    return jsonify(error="Notebook not found"), 404

@jwt_required()
def get_notebook(notebook_id):
    """
    Get a single notebook by ID for the authenticated user.
    """
    user_id = get_jwt_identity()
    notebook = Notebook.query.filter_by(id=notebook_id, user_id=user_id).first()

    if notebook:
        return jsonify({
            "id": notebook.id,
            "name": notebook.name,
            "user_id": notebook.user_id
        }), 200
    else:
        return jsonify({"error": "Notebook not found or access denied"}), 404


@jwt_required()
def delete_notebook(notebook_id):
    notebook = Notebook.query.filter_by(id=notebook_id, user_id=get_jwt_identity()).first()
    if notebook:
        db.session.delete(notebook)
        db.session.commit()
        return jsonify(message="Notebook deleted"), 200
    return jsonify(error="Notebook not found"), 404