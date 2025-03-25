from flask_jwt_extended import create_access_token, create_refresh_token
from app.models.user import User
from app import db
from datetime import timedelta


class AuthService:
    @staticmethod
    def register(name, email, password):
        if User.query.filter_by(email=email).first():
            return None  # User already exists
        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def login(email, password):
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            return create_access_token(identity=str(user.id), expires_delta=timedelta(hours=5))
        return None

    @staticmethod
    def change_password(user_id, old_password, new_password):
        user = User.query.get(user_id)
        if user and user.check_password(old_password):
            user.set_password(new_password)
            db.session.commit()
            return True
        return False

    @staticmethod
    def generate_new_token(email):
        user = User.query.filter_by(email=email).first()
        if user:
            token = create_access_token(identity=user.id, expires_delta=timedelta(hours=5))
            user.set_reset_token(token)
            db.session.commit()
            return token
        return None
    
    # generate refresh token
    @staticmethod
    def generate_refresh_token(user_id):
        user = User.query.get(user_id)
        if user:
            token = create_refresh_token(identity=user.id)
            return token
        return None
    

    @staticmethod
    def reset_password(token, new_password):
        user = User.query.filter_by(reset_token=token).first()
        if user:
            user.set_password(new_password)
            user.clear_reset_token()
            db.session.commit()
            return True
        return False