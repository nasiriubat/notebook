from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from flask_jwt_extended.exceptions import JWTDecodeError
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.models.user import User
from app import db
from app import app
from dotenv import load_dotenv
import os

load_dotenv()


def register():
    data = request.get_json()
    
    # Validate required fields
    if not data.get("name"):
        return jsonify(error="Name is required"), 400
    if not data.get("email"):
        return jsonify(error="Email is required"), 400
    if not data.get("password"):
        return jsonify(error="Password is required"), 400
    
    # Validate email format
    if not "@" in data.get("email") or not "." in data.get("email"):
        return jsonify(error="Invalid email format"), 400
    
    # Validate password length
    if len(data.get("password")) < 6:
        return jsonify(error="Password must be at least 6 characters long"), 400

    try:
        user = AuthService.register(
            data.get("name"), data.get("email"), data.get("password")
        )
        if user:
            token = AuthService.login(data.get("email"), data.get("password"))
            refresh_token = AuthService.generate_refresh_token(user.id)
            return (
                jsonify(
                    {
                        "user": user.to_dict(),
                        "token": token,
                        "refresh_token": refresh_token,
                        "expires_in": 2592000,
                    }
                ),
                201,
            )
        return jsonify(error="Email already registered"), 400
    except Exception as e:
        return jsonify(error=str(e)), 500


def login():
    data = request.get_json()
    
    # Validate required fields
    if not data.get("email"):
        return jsonify(error="Email is required"), 400
    if not data.get("password"):
        return jsonify(error="Password is required"), 400
    
    try:
        token = AuthService.login(data.get("email"), data.get("password"))
        
        if token:
            user = User.query.filter_by(email=data.get("email")).first()
            refresh_token = AuthService.generate_refresh_token(user.id)
            return (
                jsonify(
                    {
                        "user": user.to_dict(),
                        "token": token,
                        "refresh_token": refresh_token,
                        "expires_in": 2592000,
                    }
                ),
                200,
            )
        return jsonify(error="Invalid email or password"), 401
    except Exception as e:
        return jsonify(error=str(e)), 500


@jwt_required()
def change_password():
    data = request.get_json()
    user_id = get_jwt_identity()
    print(user_id)
    if AuthService.change_password(
        user_id, data.get("old_password"), data.get("new_password")
    ):
        return jsonify(message="Password changed successfully"), 200
    return jsonify(error="Invalid old password"), 400


def forgot_password():
    data = request.get_json()
    token = AuthService.generate_reset_token(data.get("email"))
    if token:
        email_service = EmailService()
        email_service.send_email(
            data.get("email"),
            "Password Reset",
            f"Use this token to reset your password: {token}",
        )
        return jsonify(message="Reset token sent to email"), 200
    return jsonify(error="User not found"), 404


def reset_password():
    data = request.get_json()
    if AuthService.reset_password(data.get("token"), data.get("new_password")):
        return jsonify(message="Password reset successfully"), 200
    return jsonify(error="Invalid or expired token"), 400


def generate_new_token():
    data = request.get_json()
    refresh_token = data.get("refresh_token")
    if not refresh_token:
        return jsonify(error="Refresh token is required"), 400

    try:
        # Decode the refresh token (allow expired tokens)
        decoded_token = decode_token(refresh_token, allow_expired=True)

        # Extract the user identity from the refresh token
        user_id = decoded_token["sub"]

        # Generate a new access token
        new_access_token = AuthService.generate_refresh_token(user_id)

        # Return the new access token
        return jsonify(token=new_access_token, expires_in=2592000), 200

    except JWTDecodeError:
        return jsonify(error="Invalid or expired refresh token"), 401


@jwt_required()
def logout():
    # JWT tokens are stateless, so logout is handled client-side by deleting the token
    return jsonify(message="Logged out successfully"), 200
