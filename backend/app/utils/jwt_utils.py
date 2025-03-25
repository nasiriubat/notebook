from flask_jwt_extended import create_access_token, decode_token
from datetime import timedelta

def create_jwt_token(user_id):
    """
    Create a JWT token for a user.
    """
    return create_access_token(identity=user_id, expires_delta=timedelta(hours=1))

def decode_jwt_token(token):
    """
    Decode a JWT token and return the payload.
    """
    try:
        payload = decode_token(token)
        return payload
    except Exception as e:
        return None