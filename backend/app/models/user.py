from app import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    reset_token = db.Column(db.String(200), nullable=True)

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
            "email": self.email
        }