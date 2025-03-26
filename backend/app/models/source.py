from app import db
from datetime import datetime

class Source(db.Model):
    __tablename__ = 'source'
    id = db.Column(db.Integer, primary_key=True)
    notebook_id = db.Column(db.Integer, db.ForeignKey('notebook.id'), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)  # e.g., 'text', 'image', 'audio', 'video'
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(200), nullable=True)  # Path to the source file (optional)
    faiss_file_name = db.Column(db.String(200), nullable=True)  # Path to FAISS index file (optional)
    is_note = db.Column(db.Boolean, default=False)  # Flag to identify if this is a note
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Define a relationship to the Notebook model
    notebook = db.relationship('Notebook', backref='sources')

    def to_dict(self):
        return {
            "id": self.id,
            "notebook_id": self.notebook_id,
            "file_type": self.file_type,
            "title": self.title,
            "description": self.description,
            "file_path": self.file_path,
            "faiss_file_name": self.faiss_file_name,
            "is_note": self.is_note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }