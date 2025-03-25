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
    user = AuthService.register(
        data.get("name"), data.get("email"), data.get("password")
    )
    if user:
        token = AuthService.login(data.get("email"), data.get("password"))
        refresh_token = AuthService.generate_refresh_token(user.id)
        return (
            jsonify(
                {
                    "user": user.to_dict(),  # Serialize the user object
                    "token": token,
                    "refresh_token": refresh_token,
                    "expires_in": 2592000,
                }
            ),
            201,
        )
    return jsonify(error="User already exists"), 400


def login():
    data = request.get_json()
    token = AuthService.login(data.get("email"), data.get("password"))
    user = User.query.filter_by(email=data.get("email")).first()
    refresh_token = AuthService.generate_refresh_token(user.id)
    if token:

        return (
            jsonify(
                {
                    "euser": user.to_dict(),  # Serialize the user object
                    "token": token,
                    "refresh_token": refresh_token,
                    "expires_in": 2592000,
                }
            ),
            200,
        )
    return jsonify(error="Invalid credentials"), 401


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
