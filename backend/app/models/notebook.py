from app import db
# ffd
class Notebook(db.Model):
    __tablename__ = 'notebook'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)