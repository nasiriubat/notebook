from app import db

class Source(db.Model):
    __tablename__ = 'source'
    id = db.Column(db.Integer, primary_key=True)
    notebook_id = db.Column(db.Integer, db.ForeignKey('notebook.id'), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)  # e.g., 'text', 'image', 'audio', 'video'
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(200), nullable=False)  # Path to the source file
    faiss_file_name = db.Column(db.String(200), nullable=False)  # Path to FAISS index file
    
    # Define a relationship to the Notebook model
    notebook = db.relationship('Notebook', backref='sources')