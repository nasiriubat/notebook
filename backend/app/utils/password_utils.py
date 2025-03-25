from werkzeug.security import generate_password_hash, check_password_hash

def hash_password(password):
    """
    Hash a password using Werkzeug's secure hashing.
    """
    return generate_password_hash(password)

def verify_password(hashed_password, input_password):
    """
    Verify a password against its hashed version.
    """
    return check_password_hash(hashed_password, input_password)