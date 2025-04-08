from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    reset_token = db.Column(db.String(200), nullable=True)
    platform = db.Column(db.String(100), nullable=True)
    oauth_id = db.Column(db.String(100), nullable=True)
    # add column role, for the first user role will be admin automatically and for other user it will be user
    role = db.Column(db.String(50), default='user')  # 'admin' or 'user'
    is_active = db.Column(db.Boolean, default=True)  # Flag to indicate if the user is active
    is_verified = db.Column(db.Boolean, default=False)  # Flag to indicate if the user is verified
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Define relationship with notebooks with cascade delete
    notebooks = db.relationship('Notebook', backref='user', cascade='all, delete-orphan')
    
    
    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def set_reset_token(self, token):
        self.reset_token = token

    def clear_reset_token(self):
        self.reset_token = None
        
    def to_dict(self):
        """
        Serialize the user object into a dictionary.
        """
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }